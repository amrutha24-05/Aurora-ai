import crypto from 'crypto';
import { AgentId, DocumentChunk, KnowledgeDocument, RagCitation } from '../types.ts';
import { 
  dbChunks, 
  dbKnowledgeDocs, 
  isUsingPostgres, 
  dbQueryPgVector, 
  dbSaveKnowledgeDoc, 
  dbSaveKnowledgeChunk 
} from '../db/index.ts';
import { 
  EMBEDDING_DIMENSION, 
  generateGeminiEmbedding, 
  generateGeminiEmbeddingWithMeta 
} from './gemini.ts';

/**
 * Calculate Cosine Similarity between two numeric vectors.
 * Strictly verifies that both vectors are valid and match the required 768 dimensions.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length !== EMBEDDING_DIMENSION) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const MIN_SEMANTIC_THRESHOLD = 0.65;
export const MIN_KEYWORD_THRESHOLD = 0.20;

/**
 * Perform Semantic Retrieval strictly scoped to the agent's knowledge base.
 * Leverages native Supabase PostgreSQL pgvector cosine similarity search (<=>) when connected,
 * falling back gracefully to in-memory cosine similarity or keyword search.
 * Rejects irrelevant chunks below the threshold to prevent context pollution.
 */
export async function retrieveAgentContext(options: {
  agentId: AgentId;
  query: string;
  topK?: number;
}): Promise<{
  citations: RagCitation[];
  mode: 'pgvector_semantic' | 'in_memory_vector' | 'keyword_fallback';
  fallbackReason?: string;
  contextSnippet: string;
}> {
  const { agentId, query, topK = 2 } = options;

  // 1. Generate 768-dim query embedding using Gemini
  const queryMeta = await generateGeminiEmbeddingWithMeta(query);
  const queryEmbedding = queryMeta.embedding;

  // 2. Primary Path: Native Supabase pgvector semantic search
  if (isUsingPostgres() && queryEmbedding && queryEmbedding.length === EMBEDDING_DIMENSION) {
    try {
      const pgVectorResults = await dbQueryPgVector(agentId, queryEmbedding, topK);
      if (pgVectorResults && pgVectorResults.length > 0) {
        // Enforce strict relevance threshold to reject unrelated documents
        const relevantResults = pgVectorResults.filter(r => r.similarity >= MIN_SEMANTIC_THRESHOLD);
        
        if (relevantResults.length > 0) {
          const citations: RagCitation[] = relevantResults.map(r => ({
            documentId: r.documentId,
            documentTitle: r.documentTitle,
            chunkId: r.chunkId,
            snippet: r.content.slice(0, 240) + '...',
            relevanceScore: Math.round(r.similarity * 100) / 100,
          }));

          const contextSnippet = relevantResults
            .map(r => `[Source: ${r.documentTitle}]\n${r.content}`)
            .join('\n\n');

          return {
            citations,
            mode: 'pgvector_semantic',
            contextSnippet,
          };
        } else {
          // All retrieved chunks fell below threshold -> reject to prevent hallucination
          return {
            citations: [],
            mode: 'pgvector_semantic',
            fallbackReason: 'Retrieved documents fell below minimum relevance threshold',
            contextSnippet: '',
          };
        }
      }
    } catch (err: any) {
      console.warn('[RAG Retrieval] pgvector query encountered error, trying in-memory fallback:', err.message);
    }
  }

  // 3. Fallback Path: In-memory vector calculation
  const agentChunks = Array.from(dbChunks.values()).filter(c => c.agentId === agentId);
  if (agentChunks.length === 0) {
    return {
      citations: [],
      mode: isUsingPostgres() ? 'pgvector_semantic' : 'keyword_fallback',
      fallbackReason: `No knowledge documents found for agent: ${agentId}`,
      contextSnippet: '',
    };
  }

  let scoredChunks: { chunk: DocumentChunk; score: number }[] = [];
  let retrievalMode: 'pgvector_semantic' | 'in_memory_vector' | 'keyword_fallback' = 'keyword_fallback';
  let fallbackReason: string | undefined = undefined;

  if (queryEmbedding && queryEmbedding.length === EMBEDDING_DIMENSION) {
    retrievalMode = 'in_memory_vector';

    for (const chunk of agentChunks) {
      if (!chunk.embedding || chunk.embedding.length !== EMBEDDING_DIMENSION) {
        const chunkEmbedding = await generateGeminiEmbedding(chunk.content);
        if (chunkEmbedding && chunkEmbedding.length === EMBEDDING_DIMENSION) {
          chunk.embedding = chunkEmbedding;
          // Persist back to database if postgres is active
          if (isUsingPostgres()) {
            await dbSaveKnowledgeChunk(chunk);
          }
        }
      }

      if (chunk.embedding && chunk.embedding.length === EMBEDDING_DIMENSION) {
        const sim = cosineSimilarity(queryEmbedding, chunk.embedding);
        scoredChunks.push({ chunk, score: sim });
      } else {
        const kwScore = calculateKeywordScore(query, chunk.content);
        scoredChunks.push({ chunk, score: kwScore });
      }
    }
  } else {
    retrievalMode = 'keyword_fallback';
    fallbackReason = queryMeta.error || `Query embedding generation did not produce valid ${EMBEDDING_DIMENSION}-dimensional vectors (received ${queryMeta.dimensions})`;

    for (const chunk of agentChunks) {
      const kwScore = calculateKeywordScore(query, chunk.content);
      scoredChunks.push({ chunk, score: kwScore });
    }
  }

  scoredChunks.sort((a, b) => b.score - a.score);
  const activeThreshold = retrievalMode === 'in_memory_vector' ? MIN_SEMANTIC_THRESHOLD : MIN_KEYWORD_THRESHOLD;
  const topMatches = scoredChunks.filter(m => m.score >= activeThreshold).slice(0, topK);

  if (topMatches.length === 0) {
    return {
      citations: [],
      mode: retrievalMode,
      fallbackReason: 'No documents satisfied the relevance cutoff threshold',
      contextSnippet: '',
    };
  }

  const citations: RagCitation[] = topMatches.map(({ chunk, score }) => {
    const doc = dbKnowledgeDocs.get(chunk.documentId);
    return {
      documentId: chunk.documentId,
      documentTitle: doc ? doc.title : 'Knowledge Source',
      chunkId: chunk.id,
      snippet: chunk.content.slice(0, 240) + '...',
      relevanceScore: Math.round(score * 100) / 100,
    };
  });

  const contextSnippet = topMatches
    .map(m => `[Source: ${dbKnowledgeDocs.get(m.chunk.documentId)?.title || 'Knowledge Base'}]\n${m.chunk.content}`)
    .join('\n\n');

  return {
    citations,
    mode: retrievalMode,
    fallbackReason,
    contextSnippet,
  };
}

function calculateKeywordScore(query: string, text: string): number {
  const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryTokens.length === 0) return 0;
  const lowerText = text.toLowerCase();
  let hits = 0;
  for (const token of queryTokens) {
    if (lowerText.includes(token)) {
      hits++;
    }
  }
  return hits / queryTokens.length;
}

/**
 * Ingest a new document and chunk it for an agent with verified 768-dim embeddings in PostgreSQL
 */
export async function ingestDocument(options: {
  agentId: AgentId;
  title: string;
  category: string;
  content: string;
}): Promise<{ documentId: string; chunksCreated: number }> {
  const { agentId, title, category, content } = options;
  const docId = 'doc_' + crypto.randomBytes(6).toString('hex');

  // Token-based chunking with 400 char windows and 80 char overlap
  const chunkSize = 400;
  const overlap = 80;
  let start = 0;
  const chunkTexts: string[] = [];

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    chunkTexts.push(content.slice(start, end));
    if (end === content.length) break;
    start += (chunkSize - overlap);
  }

  const doc: KnowledgeDocument = {
    id: docId,
    agentId,
    title,
    category,
    sourceType: 'manual',
    chunksCount: chunkTexts.length,
    createdAt: new Date().toISOString(),
  };

  await dbSaveKnowledgeDoc(doc);

  for (const text of chunkTexts) {
    const chunkId = 'chk_' + crypto.randomBytes(6).toString('hex');
    const embedding = await generateGeminiEmbedding(text);
    
    const validEmbedding = (embedding && embedding.length === EMBEDDING_DIMENSION) 
      ? embedding 
      : undefined;

    if (embedding && embedding.length !== EMBEDDING_DIMENSION) {
      console.warn(`[RAG Ingest] Rejected chunk embedding: expected ${EMBEDDING_DIMENSION} dimensions, received ${embedding.length}`);
    }

    const chunk: DocumentChunk = {
      id: chunkId,
      documentId: docId,
      agentId,
      content: text,
      metadata: { category, title },
      embedding: validEmbedding,
    };

    await dbSaveKnowledgeChunk(chunk);
  }

  return {
    documentId: docId,
    chunksCreated: chunkTexts.length,
  };
}
