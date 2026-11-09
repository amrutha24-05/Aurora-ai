import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export const SUPPORTED_TEXT_MODELS = [
  'gemini-3-flash-preview', // Fastest and most reliable in this region (~1.5s latency)
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
] as const;

let lastWorkingModel: string = 'gemini-3-flash-preview';

/**
 * Generate text content using Gemini with automatic failover and strict timeout protection
 */
export async function generateGeminiContent(options: {
  systemInstruction?: string;
  contents: string | any[];
  temperature?: number;
  preferredModel?: string;
  timeoutMs?: number;
}): Promise<{ text: string; tokensUsed?: number; model: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  // Prioritize preferred model or last confirmed working model to avoid failover latency
  const primaryModel = options.preferredModel || lastWorkingModel;
  const modelQueue = [
    primaryModel,
    ...SUPPORTED_TEXT_MODELS.filter(m => m !== primaryModel),
  ];

  let lastError: any = null;
  const timeoutMs = options.timeoutMs || 10000; // 10s per model attempt

  for (const model of modelQueue) {
    try {
      const abortCtrl = new AbortController();
      const timer = setTimeout(() => abortCtrl.abort(), timeoutMs);

      const generatePromise = ai.models.generateContent({
        model,
        contents: options.contents as any,
        config: options.systemInstruction ? {
          systemInstruction: options.systemInstruction,
        } : undefined,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        abortCtrl.signal.addEventListener('abort', () => reject(new Error(`Timeout after ${timeoutMs}ms on model ${model}`)));
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      clearTimeout(timer);

      const text = response.text ?? '';
      if (text) {
        lastWorkingModel = model;
        return {
          text,
          tokensUsed: response.usageMetadata?.totalTokenCount,
          model,
        };
      }
    } catch (err: any) {
      lastError = err;
      const isTransient = err.status === 503 || err.status === 429 || (err.message && (err.message.includes('high demand') || err.message.includes('Timeout') || err.message.includes('overloaded')));
      console.warn(`[Gemini Content] Model ${model} failed (${err.status || err.message?.slice(0, 60)}). ${isTransient ? 'Failing over...' : ''}`);
      if (!isTransient && err.status === 400) {
        throw err;
      }
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Service Unavailable'}`);
}

/**
 * Stream text chunks using Gemini's generateContentStream for ultra-low Time-To-First-Token (TTFT)
 */
export async function* streamGeminiContent(options: {
  systemInstruction?: string;
  contents: string | any[];
  preferredModel?: string;
}): AsyncGenerator<{ text: string; model: string; done?: boolean }, void, unknown> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  const primaryModel = options.preferredModel || lastWorkingModel;
  const modelQueue = [
    primaryModel,
    ...SUPPORTED_TEXT_MODELS.filter(m => m !== primaryModel),
  ];

  let lastError: any = null;

  for (const model of modelQueue) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: options.contents as any,
        config: options.systemInstruction ? {
          systemInstruction: options.systemInstruction,
        } : undefined,
      });

      let streamedAny = false;
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          streamedAny = true;
          lastWorkingModel = model;
          yield { text: chunkText, model };
        }
      }

      if (streamedAny) {
        yield { text: '', model, done: true };
        return;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Stream] Model ${model} failed stream: ${err.message?.slice(0, 80)}. Attempting failover...`);
    }
  }

  throw new Error(`Streaming failed across all models. Last error: ${lastError?.message || 'Service Unavailable'}`);
}

export const EMBEDDING_MODEL = 'gemini-embedding-2';
export const EMBEDDING_FALLBACK_MODEL = 'gemini-embedding-2-preview';
export const EMBEDDING_DIMENSION = 768;

export interface EmbeddingResult {
  embedding: number[] | null;
  dimensions: number;
  model: string;
  error?: string;
}

/**
 * Generate 768-dimensional text embeddings with explicit metadata and error diagnostics
 */
export async function generateGeminiEmbeddingWithMeta(text: string): Promise<EmbeddingResult> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      embedding: null,
      dimensions: 0,
      model: EMBEDDING_MODEL,
      error: 'GEMINI_API_KEY is not configured in environment variables.',
    };
  }

  if (!text || !text.trim()) {
    return {
      embedding: null,
      dimensions: 0,
      model: EMBEDDING_MODEL,
      error: 'Cannot generate embedding for empty text.',
    };
  }

  let lastError: string | undefined;
  for (const modelName of [EMBEDDING_MODEL, EMBEDDING_FALLBACK_MODEL]) {
    try {
      const response = await ai.models.embedContent({
        model: modelName,
        contents: text,
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
        },
      });

      const values = response.embeddings?.[0]?.values;
      if (values && Array.isArray(values)) {
        if (values.length === EMBEDDING_DIMENSION) {
          return {
            embedding: values,
            dimensions: values.length,
            model: modelName,
          };
        } else {
          lastError = `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${values.length}`;
          console.warn(`[Gemini Embeddings] ${lastError} from model ${modelName}`);
        }
      } else {
        lastError = `No embedding values array returned from model ${modelName}`;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[Gemini Embeddings] embedContent with model ${modelName} failed:`, lastError);
    }
  }

  return {
    embedding: null,
    dimensions: 0,
    model: EMBEDDING_MODEL,
    error: lastError || 'Unknown embedding generation failure',
  };
}

/**
 * Generate 768-dimensional text embeddings using stable gemini-embedding-2.
 * Validates dimensions strictly before returning.
 */
export async function generateGeminiEmbedding(text: string): Promise<number[] | null> {
  const result = await generateGeminiEmbeddingWithMeta(text);
  return result.embedding;
}


