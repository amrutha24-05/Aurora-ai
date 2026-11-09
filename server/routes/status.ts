import { Router } from 'express';
import { isUsingPostgres, getDbConfig } from '../db/index.ts';
import { getGnaniStatus, VERIFIED_GNANI_LANGUAGES } from '../services/gnani.ts';
import { AGENT_PERSONAS } from '../services/orchestrator.ts';

export const statusRouter = Router();

// GET /api/status - Comprehensive platform health, provider status, and model verification
statusRouter.get('/', (_req, res) => {
  const gnaniStatus = getGnaniStatus();
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const dbConfig = getDbConfig();

  res.json({
    platform: 'Aurora AI',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      port: 3000,
      mode: process.env.NODE_ENV || 'development',
    },
    providers: {
      database: {
        activeEngine: dbConfig.isConnected 
          ? 'Supabase PostgreSQL 15+ (pgvector 768-dim native)' 
          : 'High-Performance In-Memory Relational Store (Fallback)',
        isPostgresConnected: dbConfig.isConnected,
        credentialsConfigured: dbConfig.isConfigured,
        connectionMode: dbConfig.connectionMode,
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        ssl: dbConfig.ssl,
        supportedSchema: '001_initial_schema (vector(768) + HNSW)',
        vectorDimensions: dbConfig.vectorDimensions,
      },
      llm: {
        provider: 'Google DeepMind (@google/genai)',
        textModel: 'gemini-3.8-flash',
        isConfigured: geminiConfigured,
        status: geminiConfigured ? 'live_authenticated' : 'unconfigured_mock_fallback',
        multilingualCapable: true,
      },
      embeddings: {
        provider: 'Google DeepMind (@google/genai)',
        model: 'gemini-embedding-2',
        dimensions: 768,
        isConfigured: geminiConfigured,
        distanceMetric: 'cosine_similarity',
      },
      speech: {
        sttProvider: gnaniStatus.isConfigured ? 'Gnani Prisma v3.0 (Live)' : 'Browser Web Speech API (Primary Active) / Gnani Prisma (Mock Simulation)',
        ttsProvider: gnaniStatus.isConfigured ? 'Gnani Timbre v3.0 (Live)' : 'Browser Web SpeechSynthesis (Primary Active) / Gnani Timbre (Catalog Registered)',
        isGnaniConfigured: gnaniStatus.isConfigured,
        mode: gnaniStatus.mode,
        voicesAvailable: 12,
        clientFallbackActive: true,
      },
      languageDetection: {
        fastPath: 'Unicode Script Block Inspection (Zero-latency)',
        romanizedPath: 'Gemini 3.8 Flash Structured Output NLU',
      },
    },
    capabilities: {
      supportedLanguages: Object.keys(VERIFIED_GNANI_LANGUAGES),
      specializedAgents: Object.keys(AGENT_PERSONAS),
    },
  });
});
