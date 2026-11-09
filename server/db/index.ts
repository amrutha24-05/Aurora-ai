import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { 
  User, 
  Conversation, 
  Message, 
  KnowledgeDocument, 
  DocumentChunk, 
  UserPreferences, 
  LearningProgress,
  AgentId,
  SupportedLanguage
} from '../types.ts';
import { hashPassword } from '../services/auth.ts';

// Supabase PostgreSQL Configuration
// Prioritizes DATABASE_URL (single connection URI) and falls back to individual parameters.
export interface SanitizedDbConfig {
  connectionMode: 'DATABASE_URL (Single URI)' | 'Individual Parameters (Fallback)';
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
  isConfigured: boolean;
  isConnected: boolean;
  vectorDimensions: number;
}

function sanitizePassword(rawPassword?: string): string {
  if (!rawPassword) return '';
  let pw = rawPassword.trim();
  try {
    pw = decodeURIComponent(pw);
  } catch {}
  // Automatically strip Supabase documentation template brackets: [YOUR-PASSWORD] -> [actual_pw]
  if (pw.startsWith('[') && pw.endsWith(']') && pw.length > 2) {
    pw = pw.slice(1, -1).trim();
  }
  return pw;
}

function parseConnectionDetails() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.trim().length > 0) {
    try {
      let cleanUrlStr = dbUrl.trim();
      // Handle both raw and URL-encoded bracket placeholders before standard URL parsing
      cleanUrlStr = cleanUrlStr.replace(/:\[([^\]]+)\]@/, ':$1@');
      cleanUrlStr = cleanUrlStr.replace(/:\%5B([^\%]+)\%5D@/i, ':$1@');

      const parsed = new URL(cleanUrlStr);
      const sanitizedPw = sanitizePassword(parsed.password);
      parsed.password = encodeURIComponent(sanitizedPw);

      return {
        isConfigured: true,
        connectionMode: 'DATABASE_URL (Single URI)' as const,
        host: parsed.hostname || 'db.hkfexdzgrqabxfbgkkmm.supabase.co',
        port: parsed.port ? parseInt(parsed.port, 10) : 5432,
        database: parsed.pathname.replace(/^\//, '') || 'postgres',
        user: parsed.username || 'postgres',
        ssl: true,
        connectionString: parsed.toString(),
        password: sanitizedPw,
      };
    } catch {
      let fallbackUrl = dbUrl.trim();
      fallbackUrl = fallbackUrl.replace(/:\[([^\]]+)\]@/, ':$1@');
      fallbackUrl = fallbackUrl.replace(/:\%5B([^\%]+)\%5D@/i, ':$1@');

      let host = 'db.hkfexdzgrqabxfbgkkmm.supabase.co';
      try {
        const u = new URL(fallbackUrl);
        host = u.hostname;
      } catch {}

      return {
        isConfigured: true,
        connectionMode: 'DATABASE_URL (Single URI)' as const,
        host,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        ssl: true,
        connectionString: fallbackUrl,
        password: '',
      };
    }
  }

  const dbHost = process.env.DB_HOST || process.env.SQL_HOST || '';
  const rawDbPassword = process.env.DB_PASSWORD || process.env.SQL_PASSWORD || process.env.SUPABASE_DB_PASSWORD || '';
  const dbPassword = sanitizePassword(rawDbPassword);
  const dbPort = parseInt(process.env.DB_PORT || process.env.SQL_PORT || '5432', 10);
  const dbName = process.env.DB_NAME || process.env.SQL_DB_NAME || 'postgres';
  const dbUser = process.env.DB_USER || process.env.SQL_USER || 'postgres';
  const dbSsl = process.env.DB_SSL !== 'false';
  const isConfigured = Boolean(dbPassword && dbPassword.trim().length > 0);

  return {
    isConfigured,
    connectionMode: 'Individual Parameters (Fallback)' as const,
    host: dbHost || 'db.hkfexdzgrqabxfbgkkmm.supabase.co',
    port: dbPort,
    database: dbName,
    user: dbUser,
    ssl: dbSsl,
    connectionString: undefined as string | undefined,
    password: dbPassword,
  };
}

let pgPool: Pool | null = null;
let isPostgresConnected = false;

// Return connection configuration metadata (NEVER exposing password or full credentials)
export function getDbConfig(): SanitizedDbConfig {
  const details = parseConnectionDetails();
  return {
    connectionMode: details.connectionMode,
    host: details.host,
    port: details.port,
    database: details.database,
    user: details.user,
    ssl: details.ssl,
    isConfigured: details.isConfigured,
    isConnected: isPostgresConnected,
    vectorDimensions: 768,
  };
}

export function isUsingPostgres(): boolean {
  return isPostgresConnected;
}

export function getPgPool(): Pool | null {
  return pgPool;
}

/**
 * Gracefully close the PostgreSQL connection pool during server termination
 */
export async function closeDatabase(): Promise<void> {
  if (pgPool) {
    try {
      await pgPool.end();
      console.log('✔ PostgreSQL connection pool closed gracefully.');
    } catch (err: any) {
      console.warn('PostgreSQL pool closure warning:', err.message);
    } finally {
      pgPool = null;
      isPostgresConnected = false;
    }
  }
}

/**
 * Initialize PostgreSQL connection pool with Supabase SSL settings and execute schema migrations.
 * Accepts process.env.DATABASE_URL as primary source or falls back to individual variables.
 * Falls back gracefully to in-memory store if credentials are not configured or connection fails.
 */
export async function initializeDatabase(): Promise<boolean> {
  const details = parseConnectionDetails();

  if (!details.isConfigured) {
    console.log('ℹ DATABASE_URL unconfigured in environment: In-memory relational store active with graceful fallback.');
    return false;
  }

  try {
    const poolConfig: any = {
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };

    if (details.connectionString) {
      poolConfig.connectionString = details.connectionString;
      poolConfig.ssl = { rejectUnauthorized: false };
    } else {
      poolConfig.host = details.host;
      poolConfig.port = details.port;
      poolConfig.database = details.database;
      poolConfig.user = details.user;
      poolConfig.password = details.password;
      poolConfig.ssl = details.ssl ? { rejectUnauthorized: false } : false;
    }

    pgPool = new Pool(poolConfig);

    pgPool.on('error', (err) => {
      console.error('PostgreSQL idle client error:', err.message);
    });

    // Probe connection with timeout
    const testRes = await pgPool.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    isPostgresConnected = true;
    console.log(`✔ Connected to Supabase PostgreSQL at ${details.host}:${details.port}/${details.database} via ${details.connectionMode} (SSL enabled)`);

    // Execute schema migrations
    await runDatabaseMigrations();

    // Seed database if empty
    await syncInitialDataToPostgres();

    return true;
  } catch (err: any) {
    isPostgresConnected = false;
    console.warn(`⚠ Could not connect to Supabase PostgreSQL (${err.message}). Gracefully using high-performance in-memory store.`);
    return false;
  }
}

/**
 * Run schema migrations from 001_initial_schema.sql (pgvector 768-dim, tables, indices)
 */
export async function runDatabaseMigrations(): Promise<boolean> {
  if (!pgPool) return false;
  try {
    const migrationPath = path.join(process.cwd(), 'server', 'db', 'migrations', '001_initial_schema.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await pgPool.query(sql);
      console.log('✔ PostgreSQL schema migrations verified and executed successfully (001_initial_schema.sql with vector(768)).');
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('PostgreSQL migration warning:', err.message);
    return false;
  }
}

// In-Memory Database Stores (Used for fallback and fast cache)
export const dbUsers: Map<string, User> = new Map();
export const dbConversations: Map<string, Conversation> = new Map();
export const dbMessages: Map<string, Message[]> = new Map(); // conversationId -> messages
export const dbKnowledgeDocs: Map<string, KnowledgeDocument> = new Map();
export const dbChunks: Map<string, DocumentChunk> = new Map();
export const dbPreferences: Map<string, UserPreferences> = new Map();
export const dbLearning: Map<string, LearningProgress[]> = new Map(); // userId -> progress list
export const dbSavedResponses: Map<string, any[]> = new Map(); // userId -> saved items
export const dbSessions: Map<string, { userId: string; expiresAt: number }> = new Map();

// ==============================================================================
// Persistent Data Access Methods (PostgreSQL with in-memory fallback)
// ==============================================================================

// --- Users ---
export async function dbFindUserByEmail(email: string): Promise<User | null> {
  const normalized = email.toLowerCase().trim();
  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT id, email, password_hash, name, default_language, created_at FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [normalized]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const user: User = {
          id: row.id,
          email: row.email,
          passwordHash: row.password_hash,
          name: row.name,
          defaultLanguage: row.default_language as SupportedLanguage,
          createdAt: new Date(row.created_at).toISOString(),
        };
        dbUsers.set(user.id, user);
        return user;
      }
      return null;
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbFindUserByEmail:', err.message);
    }
  }
  return Array.from(dbUsers.values()).find(u => u.email.toLowerCase() === normalized) || null;
}

export async function dbFindUserById(id: string): Promise<User | null> {
  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT id, email, password_hash, name, default_language, created_at FROM users WHERE id = $1 LIMIT 1',
        [id]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const user: User = {
          id: row.id,
          email: row.email,
          passwordHash: row.password_hash,
          name: row.name,
          defaultLanguage: row.default_language as SupportedLanguage,
          createdAt: new Date(row.created_at).toISOString(),
        };
        dbUsers.set(user.id, user);
        return user;
      }
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbFindUserById:', err.message);
    }
  }
  return dbUsers.get(id) || null;
}

export async function dbSaveUser(user: User): Promise<User> {
  dbUsers.set(user.id, user);
  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO users (id, email, password_hash, name, default_language, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           default_language = EXCLUDED.default_language`,
        [user.id, user.email, user.passwordHash, user.name, user.defaultLanguage, user.createdAt]
      );
    } catch (err: any) {
      console.warn('PostgreSQL insert error in dbSaveUser:', err.message);
    }
  }
  return user;
}

// --- Sessions ---
export async function dbSaveSession(token: string, userId: string, expiresAt: number): Promise<void> {
  dbSessions.set(token, { userId, expiresAt });
  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO sessions (token, user_id, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
        [token, userId, expiresAt]
      );
    } catch (err: any) {
      console.warn('PostgreSQL insert error in dbSaveSession:', err.message);
    }
  }
}

export async function dbFindSession(token: string): Promise<{ userId: string; expiresAt: number } | null> {
  const cached = dbSessions.get(token);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      await dbDeleteSession(token);
      return null;
    }
    return cached;
  }

  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query('SELECT user_id, expires_at FROM sessions WHERE token = $1 LIMIT 1', [token]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const expires = Number(row.expires_at);
        if (Date.now() > expires) {
          await dbDeleteSession(token);
          return null;
        }
        const session = { userId: row.user_id, expiresAt: expires };
        dbSessions.set(token, session);
        return session;
      }
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbFindSession:', err.message);
    }
  }
  return null;
}

export async function dbDeleteSession(token: string): Promise<void> {
  dbSessions.delete(token);
  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query('DELETE FROM sessions WHERE token = $1', [token]);
    } catch (err: any) {
      console.warn('PostgreSQL delete error in dbDeleteSession:', err.message);
    }
  }
}

// --- Preferences ---
export async function dbGetPreferences(userId: string): Promise<UserPreferences | null> {
  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT user_id, preferred_voice, voice_speed, auto_play_audio, theme, speech_provider FROM user_preferences WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const prefs: UserPreferences = {
          userId: row.user_id,
          preferredVoice: row.preferred_voice,
          voiceSpeed: Number(row.voice_speed),
          autoPlayAudio: Boolean(row.auto_play_audio),
          theme: row.theme,
          speechProvider: row.speech_provider,
        };
        dbPreferences.set(userId, prefs);
        return prefs;
      }
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbGetPreferences:', err.message);
    }
  }
  return dbPreferences.get(userId) || null;
}

export async function dbSavePreferences(prefs: UserPreferences): Promise<void> {
  dbPreferences.set(prefs.userId, prefs);
  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO user_preferences (user_id, preferred_voice, voice_speed, auto_play_audio, theme, speech_provider, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           preferred_voice = EXCLUDED.preferred_voice,
           voice_speed = EXCLUDED.voice_speed,
           auto_play_audio = EXCLUDED.auto_play_audio,
           theme = EXCLUDED.theme,
           speech_provider = EXCLUDED.speech_provider,
           updated_at = NOW()`,
        [prefs.userId, prefs.preferredVoice, prefs.voiceSpeed, prefs.autoPlayAudio, prefs.theme, prefs.speechProvider]
      );
    } catch (err: any) {
      console.warn('PostgreSQL insert error in dbSavePreferences:', err.message);
    }
  }
}

// --- Conversations ---
export async function dbGetConversations(userId: string): Promise<Conversation[]> {
  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT id, user_id, agent_id, title, language, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      const convs: Conversation[] = res.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        agentId: row.agent_id as AgentId,
        title: row.title,
        language: row.language as SupportedLanguage,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }));
      // Sync to memory
      for (const c of convs) dbConversations.set(c.id, c);
      return convs;
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbGetConversations:', err.message);
    }
  }
  return Array.from(dbConversations.values())
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function dbGetConversationById(id: string): Promise<Conversation | null> {
  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT id, user_id, agent_id, title, language, created_at, updated_at FROM conversations WHERE id = $1 LIMIT 1',
        [id]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const conv: Conversation = {
          id: row.id,
          userId: row.user_id,
          agentId: row.agent_id as AgentId,
          title: row.title,
          language: row.language as SupportedLanguage,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
        };
        dbConversations.set(conv.id, conv);
        return conv;
      }
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbGetConversationById:', err.message);
    }
  }
  return dbConversations.get(id) || null;
}

export async function dbSaveConversation(conv: Conversation): Promise<Conversation> {
  dbConversations.set(conv.id, conv);
  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO conversations (id, user_id, agent_id, title, language, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           agent_id = EXCLUDED.agent_id,
           title = EXCLUDED.title,
           language = EXCLUDED.language,
           updated_at = EXCLUDED.updated_at`,
        [conv.id, conv.userId, conv.agentId, conv.title, conv.language, conv.createdAt, conv.updatedAt]
      );
    } catch (err: any) {
      console.warn('PostgreSQL insert error in dbSaveConversation:', err.message);
    }
  }
  return conv;
}

export async function dbDeleteConversation(id: string): Promise<void> {
  dbConversations.delete(id);
  dbMessages.delete(id);
  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query('DELETE FROM conversations WHERE id = $1', [id]);
    } catch (err: any) {
      console.warn('PostgreSQL delete error in dbDeleteConversation:', err.message);
    }
  }
}

// --- Messages ---
export async function dbGetMessages(conversationId: string): Promise<Message[]> {
  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT id, conversation_id, role, content, rag_context, tokens_used, provider_info, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversationId]
      );
      const msgs: Message[] = res.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        ragContext: row.rag_context,
        tokensUsed: row.tokens_used,
        providerInfo: row.provider_info,
        createdAt: new Date(row.created_at).toISOString(),
      }));
      dbMessages.set(conversationId, msgs);
      return msgs;
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbGetMessages:', err.message);
    }
  }
  return dbMessages.get(conversationId) || [];
}

export async function dbSaveMessage(msg: Message): Promise<Message> {
  const current = dbMessages.get(msg.conversationId) || [];
  current.push(msg);
  dbMessages.set(msg.conversationId, current);

  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO messages (id, conversation_id, role, content, rag_context, tokens_used, provider_info, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          msg.id,
          msg.conversationId,
          msg.role,
          msg.content,
          msg.ragContext ? JSON.stringify(msg.ragContext) : null,
          msg.tokensUsed || null,
          msg.providerInfo ? JSON.stringify(msg.providerInfo) : null,
          msg.createdAt
        ]
      );
    } catch (err: any) {
      console.warn('PostgreSQL insert error in dbSaveMessage:', err.message);
    }
  }
  return msg;
}

// --- Knowledge Documents and pgvector Chunks ---
export async function dbGetKnowledgeDocs(agentId?: AgentId): Promise<KnowledgeDocument[]> {
  if (isPostgresConnected && pgPool) {
    try {
      let query = 'SELECT id, agent_id, title, category, source_type, chunks_count, created_at FROM knowledge_documents';
      const params: any[] = [];
      if (agentId) {
        query += ' WHERE agent_id = $1';
        params.push(agentId);
      }
      query += ' ORDER BY created_at DESC';
      const res = await pgPool.query(query, params);
      const docs: KnowledgeDocument[] = res.rows.map(row => ({
        id: row.id,
        agentId: row.agent_id as AgentId,
        title: row.title,
        category: row.category,
        sourceType: row.source_type,
        chunksCount: row.chunks_count,
        createdAt: new Date(row.created_at).toISOString(),
      }));
      for (const d of docs) dbKnowledgeDocs.set(d.id, d);
      return docs;
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbGetKnowledgeDocs:', err.message);
    }
  }
  let docs = Array.from(dbKnowledgeDocs.values());
  if (agentId) docs = docs.filter(d => d.agentId === agentId);
  return docs;
}

export async function dbSaveKnowledgeDoc(doc: KnowledgeDocument): Promise<void> {
  dbKnowledgeDocs.set(doc.id, doc);
  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO knowledge_documents (id, agent_id, title, category, source_type, chunks_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           chunks_count = EXCLUDED.chunks_count`,
        [doc.id, doc.agentId, doc.title, doc.category, doc.sourceType, doc.chunksCount, doc.createdAt]
      );
    } catch (err: any) {
      console.warn('PostgreSQL insert error in dbSaveKnowledgeDoc:', err.message);
    }
  }
}

export async function dbSaveKnowledgeChunk(chunk: DocumentChunk): Promise<void> {
  dbChunks.set(chunk.id, chunk);
  if (isPostgresConnected && pgPool) {
    try {
      let resolvedDocId = chunk.documentId;

      // 1. Verify parent document existence in PostgreSQL to strictly respect foreign key constraint
      const docCheck = await pgPool.query('SELECT id FROM knowledge_documents WHERE id = $1', [resolvedDocId]);
      if (docCheck.rows.length === 0) {
        // Parent document ID not found in PostgreSQL.
        // Step A: Check if parent document exists in memory and persist it first
        const memDoc = dbKnowledgeDocs.get(chunk.documentId);
        if (memDoc) {
          console.log(`[dbSaveKnowledgeChunk] Persisting parent document "${memDoc.title}" (${memDoc.id}) to PostgreSQL before chunk insert.`);
          await dbSaveKnowledgeDoc(memDoc);
          resolvedDocId = memDoc.id;
        } else {
          // Step B: Check if a document with the matching title exists in PostgreSQL
          const docTitle = (chunk.metadata as any)?.title;
          if (docTitle) {
            const titleCheck = await pgPool.query('SELECT id FROM knowledge_documents WHERE title = $1 LIMIT 1', [docTitle]);
            if (titleCheck.rows.length > 0) {
              resolvedDocId = titleCheck.rows[0].id;
              chunk.documentId = resolvedDocId;
              console.log(`[dbSaveKnowledgeChunk] Remapped chunk "${chunk.id}" document_id to existing document (${resolvedDocId}).`);
            }
          }
        }

        // Re-verify that parent document exists before attempting insert
        const verifyCheck = await pgPool.query('SELECT id FROM knowledge_documents WHERE id = $1', [resolvedDocId]);
        if (verifyCheck.rows.length === 0) {
          console.warn(`[dbSaveKnowledgeChunk] Foreign key protection: Parent document "${chunk.documentId}" does not exist in knowledge_documents table for chunk "${chunk.id}". Chunk insert aborted.`);
          return;
        }
      }

      // 2. Format 768-dim vector literal for pgvector
      const vectorLiteral = (chunk.embedding && chunk.embedding.length === 768)
        ? `[${chunk.embedding.join(',')}]`
        : null;

      await pgPool.query(
        `INSERT INTO knowledge_chunks (id, document_id, agent_id, content, metadata, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)
         ON CONFLICT (id) DO UPDATE SET
           document_id = EXCLUDED.document_id,
           content = EXCLUDED.content,
           metadata = EXCLUDED.metadata,
           embedding = EXCLUDED.embedding`,
        [
          chunk.id,
          resolvedDocId,
          chunk.agentId,
          chunk.content,
          JSON.stringify(chunk.metadata || {}),
          vectorLiteral
        ]
      );
    } catch (err: any) {
      console.warn('PostgreSQL insert error in dbSaveKnowledgeChunk:', err.message);
    }
  }
}

/**
 * Execute native pgvector cosine similarity search on knowledge_chunks table
 * Uses PostgreSQL 768-dim vector cosine distance operator (<=>).
 * Returns cosine similarity: 1 - distance.
 */
export async function dbQueryPgVector(
  agentId: AgentId, 
  queryEmbedding: number[], 
  topK: number = 3
): Promise<{
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  similarity: number;
}[] | null> {
  if (!isPostgresConnected || !pgPool || queryEmbedding.length !== 768) {
    return null;
  }

  try {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;
    const sql = `
      SELECT 
        kc.id AS chunk_id,
        kc.document_id,
        kc.content,
        kd.title AS document_title,
        (1 - (kc.embedding <=> $1::vector)) AS similarity
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kc.document_id = kd.id
      WHERE kc.agent_id = $2 AND kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> $1::vector ASC
      LIMIT $3;
    `;
    const res = await pgPool.query(sql, [vectorLiteral, agentId, topK]);
    return res.rows.map(row => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      documentTitle: row.document_title || 'Knowledge Base',
      content: row.content,
      similarity: Number(row.similarity),
    }));
  } catch (err: any) {
    console.warn('pgvector search error in dbQueryPgVector:', err.message);
    return null;
  }
}

// --- Learning Progress ---
export async function dbGetLearning(userId: string): Promise<LearningProgress[]> {
  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT id, user_id, language, topic, score, vocabulary_mastered, last_session FROM learning_progress WHERE user_id = $1 ORDER BY last_session DESC',
        [userId]
      );
      if (res.rows.length > 0) {
        return res.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          language: row.language as SupportedLanguage,
          topic: row.topic || 'General Practice',
          score: Number(row.score),
          vocabularyMastered: Number(row.vocabulary_mastered),
          lastPracticed: new Date(row.last_session).toISOString(),
        }));
      }
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbGetLearning:', err.message);
    }
  }
  return dbLearning.get(userId) || [];
}

export async function dbSaveLearning(record: LearningProgress): Promise<void> {
  const current = dbLearning.get(record.userId) || [];
  current.unshift(record);
  dbLearning.set(record.userId, current);

  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO learning_progress (id, user_id, language, topic, score, vocabulary_mastered, last_session)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, language) DO UPDATE SET
           topic = EXCLUDED.topic,
           score = EXCLUDED.score,
           vocabulary_mastered = EXCLUDED.vocabulary_mastered,
           last_session = EXCLUDED.last_session`,
        [record.id, record.userId, record.language, record.topic, record.score, record.vocabularyMastered, record.lastPracticed]
      );
    } catch (err: any) {
      console.warn('PostgreSQL insert error in dbSaveLearning:', err.message);
    }
  }
}

// --- Saved Responses ---
export async function dbGetSavedResponses(userId: string): Promise<any[]> {
  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT id, user_id, message_id, title, content, agent_id, language, created_at FROM saved_responses WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        messageId: row.message_id,
        title: row.title,
        content: row.content,
        agentId: row.agent_id,
        language: row.language,
        createdAt: new Date(row.created_at).toISOString(),
      }));
    } catch (err: any) {
      console.warn('PostgreSQL query error in dbGetSavedResponses:', err.message);
    }
  }
  return dbSavedResponses.get(userId) || [];
}

export async function dbSaveSavedResponse(item: any): Promise<void> {
  const current = dbSavedResponses.get(item.userId) || [];
  current.unshift(item);
  dbSavedResponses.set(item.userId, current);

  if (isPostgresConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO saved_responses (id, user_id, message_id, title, content, agent_id, language, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [item.id, item.userId, item.messageId || null, item.title, item.content, item.agentId, item.language, item.createdAt]
      );
    } catch (err: any) {
      console.warn('PostgreSQL insert error in dbSaveSavedResponse:', err.message);
    }
  }
}

// ==============================================================================
// Seed Data Initialization
// ==============================================================================

const CURATED_AGENT_DOCUMENTS: {
  agentId: AgentId;
  title: string;
  category: string;
  content: string;
}[] = [
  // 1. Technical Agent
  {
    agentId: 'technical',
    title: 'Full-Stack Architecture & TypeScript Best Practices',
    category: 'Software Engineering',
    content: `TypeScript strict typing eliminates null-pointer exceptions and enforces compiler contracts. When architecting full-stack web applications, separating API routing from business domain logic ensures resilience. React 19 server actions and client hooks like useTransition provide non-blocking UI states. For asynchronous concurrency, avoid raw race conditions by leveraging AbortController in fetch calls.`
  },
  {
    agentId: 'technical',
    title: 'Algorithmic Optimization & Python Vectorization',
    category: 'Computer Science',
    content: `Algorithmic optimization requires balancing time complexity and memory overhead. In Python, replacing imperative loops with vectorized NumPy arrays and Polars DataFrames unlocks SIMD parallelism. For graph algorithms like Dijkstra and A*, priority queues using binary heaps yield O((V + E) log V) complexity.`
  },
  {
    agentId: 'technical',
    title: 'Python Primality Testing & Number Theory Algorithms',
    category: 'Algorithms & Data Structures',
    content: `A prime number is an integer greater than 1 whose only positive divisors are 1 and itself. In Python, checking whether a number n is prime efficiently requires testing divisors up to floor(sqrt(n)):
\`\`\`python
def is_prime(n: int) -> bool:
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True
\`\`\`
This achieves O(sqrt(n)) time complexity with O(1) auxiliary space. For generating all primes up to N, the Sieve of Eratosthenes provides optimal O(N log log N) performance.`
  },
  // 2. Cultural Agent
  {
    agentId: 'cultural',
    title: 'Makar Sankranti & Indian Harvest Festivals: Traditions, Regional Customs & Significance',
    category: 'Indian Festivals & Living Traditions',
    content: `Makar Sankranti is one of India's most auspicious pan-Indian harvest festivals, marking the transition of the Sun (Surya) into the zodiac sign of Capricorn (Makara Rashi) and the onset of Uttarayana, the sacred six-month northward solar journey. Across India, it celebrates agricultural abundance, bountiful winter harvests, and deep gratitude to nature:
- In Andhra Pradesh and Telangana, Sankranti is celebrated over four vibrant days:
  1. Bhogi: The first day begins at dawn with sacred bonfires (Bhogi Mantalu) burning discarded items, symbolizing shedding the old and welcoming new spiritual light. Children are showered with Bhogi Pallu (berries and coins) for protection. Women decorate courtyards with colorful Muggulu (Rangoli) adorned with Gobbemmalu (cow dung balls decorated with turmeric, kumkum, and marigold petals).
  2. Makara Sankranti (Pedda Panduga): The central festival day. Families wear new traditional clothes, offer worship to the Sun God, and prepare festive delicacies including Ariselu, Bobbatlu (Puran Poli), Chakkara Pongali, and Pulagam.
  3. Kanuma: The cattle festival dedicated to honoring cows, bullocks, and farm animals that labor in the fields. Farmers bathe, decorate horns with paint and bells, and feed cattle freshly harvested grains.
  4. Mukkanuma: Communal gatherings, feasts, traditional rooster fairs (Kodi Pandalu), and outdoor sports.
- In Tamil Nadu, it is celebrated as Thai Pongal over four days: Bhogi, Surya Pongal (boiling freshly harvested rice with milk and jaggery in clay pots until it overflows to joyous shouts of 'Pongalo Pongal!'), Mattu Pongal (cattle worship and traditional Jallikattu), and Kaanum Pongal (family outings and reunion).
- In Punjab and Northern India, it is preceded by Lohri, celebrating sugarcane and winter crop harvests with community bonfires, folk dances (Bhangra and Giddha), rewri, gajak, and peanuts, followed by Maghi.
- In Gujarat and Rajasthan, Uttarayan is world-renowned for international kite-flying festivals (Patang Mahotsav) where skies fill with colorful kites, accompanied by Undhiyu and sesame chikki.
- In Maharashtra, people exchange Tilgul (sesame and jaggery sweets) with the heartwarming greeting 'Tilgul ghya, god god bola' (Accept these sesame sweets and speak sweet words), symbolizing warming the body in winter and sweetening interpersonal relationships.`
  },
  {
    agentId: 'cultural',
    title: 'Significance of Thai Pongal: The Tamil Thanksgiving Harvest Festival',
    category: 'Tamil Culture & Traditions',
    content: `Thai Pongal is a four-day harvest festival celebrated by Tamilians worldwide in the Tamil month of Thai (mid-January):
- The word 'Pongal' means 'to boil over' or 'overflow', symbolizing prosperity and abundance.
- Day 1: Bhogi Pongal honors Lord Indra, the deity of rain. People discard old household belongings into a bonfire, whitewash homes, and create Kolam designs with rice flour.
- Day 2: Surya Pongal honors the Sun God (Surya Bhagavan). At sunrise, in an open courtyard, freshly harvested rice is boiled with milk and raw sugarcane jaggery (Vellam) in decorated earthenware pots tied with fresh turmeric and ginger plants. When the milk boils over, family members blow conches and exclaim 'Pongalo Pongal!'. The sweet Pongal dish is offered to the Sun God on banana leaves.
- Day 3: Mattu Pongal honors cows and working cattle that till the agricultural fields. Cattle are bathed, horns painted brightly, garlanded with marigolds, and served sweet Pongal and sugarcane.
- Day 4: Kaanum Pongal is a day of gratitude, family visits, respect to elders, and community gathering.`
  },
  {
    agentId: 'cultural',
    title: 'Vedic Heritage and Ancient Astronomical Sciences in India',
    category: 'Indian History & Heritage',
    content: `Ancient Indian astronomical treatises such as the Surya Siddhanta, Aryabhatiya, and Pancha Siddhantika laid foundational trigonometry and planetary orbital calculations centuries before the European renaissance. The concept of zero (Shunya) and the decimal place-value system originated in India, transforming global mathematics and celestial navigation.`
  },
  {
    agentId: 'cultural',
    title: 'Classical Indian Music & The Raga System',
    category: 'Art & Tradition',
    content: `Indian classical music comprises two primary traditions: Carnatic (South India) and Hindustani (North India). A Raga is a melodic framework characterized by specific ascending (Arohana) and descending (Avarohana) scales, microtones (Srutis), and emotive rasas linked to specific times of the day or seasons.`
  },
  // 3. School Agent
  {
    agentId: 'school',
    title: 'NCERT Class 10 Science: Photosynthesis and Cellular Respiration',
    category: 'Biology & Plant Physiology',
    content: `Photosynthesis is the fundamental biological process by which green plants, algae, and cyanobacteria convert light energy from the sun into chemical energy stored in glucose:
- Balanced Chemical Equation: 6CO2 + 6H2O + Sunlight -> C6H12O6 + 6O2 (Carbon dioxide + Water + Light -> Glucose + Oxygen).
- Site of Photosynthesis: Takes place within chloroplasts inside green leaf mesophyll cells. The green pigment chlorophyll captures solar photons.
- Two Consecutive Stages:
  1. Light-Dependent Reactions (in thylakoid membranes): Solar light energy is absorbed by chlorophyll, exciting electrons. Water molecules undergo photolysis (split into hydrogen ions, electrons, and oxygen gas). ATP and NADPH energy-carrier molecules are generated, and oxygen is released through leaf stomata as a vital byproduct.
  2. Light-Independent Reactions / Calvin Cycle (in chloroplast stroma): Utilizes the ATP and NADPH produced in the light stage to fix atmospheric carbon dioxide (CO2) into three-carbon sugars and ultimately glucose (C6H12O6).
- Factors affecting the rate of photosynthesis include light intensity, carbon dioxide concentration, ambient temperature, and water availability.`
  },
  {
    agentId: 'school',
    title: 'NCERT Class 10: Quadratic Equations & Pythagorean Principles',
    category: 'Mathematics',
    content: `A quadratic equation is expressed as ax^2 + bx + c = 0 where a != 0. The discriminant Delta = b^2 - 4ac determines the nature of the roots: Delta > 0 indicates two distinct real roots, Delta = 0 indicates equal real roots, and Delta < 0 yields complex conjugate roots. Practice step-by-step factorization before using the quadratic formula.`
  },
  // 4. Personal Assistant
  {
    agentId: 'personal',
    title: 'Time Blocking & Deep Work Operating Systems',
    category: 'Productivity',
    content: `Deep work requires deliberate isolation from distraction. Employ 90-minute ultradian rhythm sprints followed by 15-minute biological resets. The Eisenhower matrix prioritizes urgent vs important tasks: delegate urgent non-important items and ruthlessly schedule non-urgent important strategy blocks.`
  },
  {
    agentId: 'personal',
    title: 'Clear Executive Communication & Meeting Syntheses',
    category: 'Professional Writing',
    content: `Effective executive summaries follow the Minto Pyramid Principle: lead with the core recommendation, followed by supporting grouped arguments, and concluding with quantitative timelines and actionable next steps.`
  },
  // 5. Language Learning Agent
  {
    agentId: 'language_learning',
    title: 'Telugu Conversational Fundamentals and Honorifics',
    category: 'Linguistics & Vocabulary',
    content: `In Telugu, respect is conveyed through pronouns and verb endings. Informal 'nuvvu' (you) contrasts with respectful 'meeru' (you). Common daily phrases: 'Bagunnara?' (How are you?), 'Danyavadalu' (Thank you), 'Bhojanam chesara?' (Did you eat?). Verbs conjugate according to gender, number, and politeness levels.`
  },
  {
    agentId: 'language_learning',
    title: 'Hindi Grammatical Structures: Verb Agreement and Postpositions',
    category: 'Grammar',
    content: `Hindi uses postpositions rather than prepositions (e.g. 'ghar mein' for in the house). The oblique case modifies masculine nouns ending in -aa when followed by a postposition ('kamra' -> 'kamre mein'). Verbs agree with the grammatical subject in tense, gender, and plurality.`
  }
];

export function seedInitialData() {
  const demoUserId = 'usr_demo_aurora_01';
  if (!dbUsers.has(demoUserId)) {
    const demoUser: User = {
      id: demoUserId,
      email: 'demo@aurora.ai',
      passwordHash: hashPassword('Aurora@2026'),
      name: 'Amrutha Varshini',
      defaultLanguage: 'te',
      createdAt: new Date().toISOString(),
    };
    dbUsers.set(demoUserId, demoUser);

    dbPreferences.set(demoUserId, {
      userId: demoUserId,
      preferredVoice: 'Lakshmi',
      voiceSpeed: 1.0,
      autoPlayAudio: false,
      theme: 'dark',
      speechProvider: 'webspeech',
    });

    const convId = 'conv_welcome_01';
    dbConversations.set(convId, {
      id: convId,
      userId: demoUserId,
      agentId: 'cultural',
      title: 'Significance of Sankranti & Pongal',
      language: 'te',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    dbMessages.set(convId, [
      {
        id: 'msg_01',
        conversationId: convId,
        role: 'user',
        content: 'నమస్కారం! సంక్రాంతి పండుగ విశిష్టత ఏమిటి? (Namaskaram! What is the significance of Sankranti?)',
        createdAt: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: 'msg_02',
        conversationId: convId,
        role: 'assistant',
        content: `నమస్కారం! మకర సంక్రాంతి భారతీయ సంస్కృతిలో అత్యంత పవిత్రమైన మరియు ఆనందోత్సాహాల పండుగ. 

సూర్యుడు ధనుస్సు రాశి నుండి మకర రాశిలోకి ప్రవేశించే పుణ్యకాలాన్ని **మకర సంక్రాంతి** అంటారు. ఇది రైతులకు పంటల కాలం ముగిసి కొత్త ధాన్యాలు చేతికందే సమయం కాబట్టి దీనిని **రైతుల పండుగ** లేదా **పంటల పండుగ** అని పిలుస్తారు.`,
        ragContext: [
          {
            documentId: 'doc_cult_01',
            documentTitle: 'Makar Sankranti & Indian Harvest Festivals: Traditions, Regional Customs & Significance',
            chunkId: 'chk_cult_01',
            snippet: 'Makar Sankranti marks the transition of the Sun into Capricorn (Makara Rashi) and the onset of Uttarayana. Across India, it celebrates agricultural abundance, bountiful winter harvests, and deep gratitude to nature.',
            relevanceScore: 0.94,
          }
        ],
        providerInfo: {
          model: 'gemini-3.8-flash',
          isMock: false,
          providerName: 'gemini',
        },
        createdAt: new Date(Date.now() - 3400000).toISOString(),
      }
    ]);
  }

  // Pre-seed in-memory knowledge store
  for (const doc of CURATED_AGENT_DOCUMENTS) {
    // Generate deterministic id based on title to prevent duplicates
    const titleHash = crypto.createHash('md5').update(doc.title).digest('hex').slice(0, 10);
    const docId = `doc_${doc.agentId.slice(0, 4)}_${titleHash}`;
    dbKnowledgeDocs.set(docId, {
      id: docId,
      agentId: doc.agentId,
      title: doc.title,
      category: doc.category,
      sourceType: 'verified_system',
      chunksCount: 1,
      createdAt: new Date().toISOString(),
    });

    const chunkId = `chk_${titleHash}`;
    dbChunks.set(chunkId, {
      id: chunkId,
      documentId: docId,
      agentId: doc.agentId,
      content: doc.content,
      metadata: { category: doc.category, title: doc.title },
    });
  }
}

/**
 * Synchronize seed data to PostgreSQL on first initialization or when new documents are added
 */
async function syncInitialDataToPostgres() {
  if (!pgPool || !isPostgresConnected) return;

  try {
    const demoUserId = 'usr_demo_aurora_01';
    const userCheck = await pgPool.query('SELECT id FROM users WHERE id = $1', [demoUserId]);
    if (userCheck.rows.length === 0) {
      const demoUser = dbUsers.get(demoUserId);
      if (demoUser) {
        await dbSaveUser(demoUser);
        const prefs = dbPreferences.get(demoUserId);
        if (prefs) await dbSavePreferences(prefs);
        console.log('✔ Demo user and preferences seeded into Supabase PostgreSQL.');
      }
    }

    // Ensure all curated documents exist in PostgreSQL and in-memory references are strictly aligned
    for (const doc of CURATED_AGENT_DOCUMENTS) {
      const titleHash = crypto.createHash('md5').update(doc.title).digest('hex').slice(0, 10);
      const docId = `doc_${doc.agentId.slice(0, 4)}_${titleHash}`;
      const chunkId = `chk_${titleHash}`;

      const docCheck = await pgPool.query('SELECT id, title FROM knowledge_documents WHERE id = $1 OR title = $2 LIMIT 1', [docId, doc.title]);
      let actualDocId = docId;

      if (docCheck.rows.length === 0) {
        const kDoc: KnowledgeDocument = {
          id: docId,
          agentId: doc.agentId,
          title: doc.title,
          category: doc.category,
          sourceType: 'verified_system',
          chunksCount: 1,
          createdAt: new Date().toISOString(),
        };
        await dbSaveKnowledgeDoc(kDoc);
        console.log(`✔ Synced curated knowledge doc to PostgreSQL: "${doc.title}" (id: ${docId})`);
      } else {
        actualDocId = docCheck.rows[0].id;
      }

      // Synchronize in-memory structures to match verified PostgreSQL document ID
      const memDoc = dbKnowledgeDocs.get(docId) || dbKnowledgeDocs.get(actualDocId);
      if (memDoc) {
        memDoc.id = actualDocId;
        dbKnowledgeDocs.set(actualDocId, memDoc);
        if (docId !== actualDocId) {
          dbKnowledgeDocs.delete(docId);
        }
      }

      const memChunk = dbChunks.get(chunkId);
      if (memChunk) {
        memChunk.documentId = actualDocId;
      }

      // Ensure the corresponding knowledge chunk exists in PostgreSQL
      const chunkCheck = await pgPool.query('SELECT id FROM knowledge_chunks WHERE id = $1', [chunkId]);
      if (chunkCheck.rows.length === 0) {
        const chunk: DocumentChunk = memChunk || {
          id: chunkId,
          documentId: actualDocId,
          agentId: doc.agentId,
          content: doc.content,
          metadata: { category: doc.category, title: doc.title },
        };
        chunk.documentId = actualDocId;
        await dbSaveKnowledgeChunk(chunk);
      }
    }
  } catch (err: any) {
    console.warn('syncInitialDataToPostgres warning:', err.message);
  }
}

// Call seed once for in-memory baseline
seedInitialData();
