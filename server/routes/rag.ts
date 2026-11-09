import { Router } from 'express';
import { dbChunks, dbKnowledgeDocs, isUsingPostgres, dbGetKnowledgeDocs, getDbConfig } from '../db/index.ts';
import { ingestDocument, retrieveAgentContext } from '../services/rag.ts';
import { AgentId } from '../types.ts';

export const ragRouter = Router();

// GET /api/rag/documents - List knowledge documents with chunk counts
ragRouter.get('/documents', async (req, res) => {
  const { agentId } = req.query;
  const docs = await dbGetKnowledgeDocs(agentId as AgentId | undefined);
  const dbConfig = getDbConfig();

  res.json({
    databaseType: isUsingPostgres() ? 'Supabase PostgreSQL (pgvector 768-dim active)' : 'In-Memory Store (Cosine / BM25 fallback)',
    isPgVectorActive: isUsingPostgres(),
    databaseHost: dbConfig.host,
    vectorDimensions: dbConfig.vectorDimensions,
    totalDocuments: docs.length,
    totalChunks: dbChunks.size,
    documents: docs,
  });
});

// POST /api/rag/query - Test semantic retrieval against an agent's knowledge base
ragRouter.post('/query', async (req, res) => {
  try {
    const { agentId = 'technical', query, topK = 3 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const result = await retrieveAgentContext({
      agentId: agentId as AgentId,
      query,
      topK,
    });

    res.json({
      query,
      agentId,
      retrievalMode: result.mode,
      fallbackReason: result.fallbackReason || null,
      citationsCount: result.citations.length,
      citations: result.citations,
      contextSnippet: result.contextSnippet,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Retrieval failed' });
  }
});

// POST /api/rag/ingest - Ingest a new document into an agent's knowledge store
ragRouter.post('/ingest', async (req, res) => {
  try {
    const { agentId, title, category, content } = req.body;
    if (!agentId || !title || !content) {
      return res.status(400).json({ error: 'agentId, title, and content are required' });
    }

    const result = await ingestDocument({
      agentId: agentId as AgentId,
      title,
      category: category || 'General Knowledge',
      content,
    });

    res.json({
      success: true,
      documentId: result.documentId,
      chunksCreated: result.chunksCreated,
      message: `Document ingested successfully into ${agentId} agent knowledge base.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ingestion failed' });
  }
});
