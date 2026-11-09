-- ==============================================================================
-- Aurora AI — Initial Production Relational & Vector Schema Migration (001)
-- Target: PostgreSQL 15+ with pgvector extension
-- Dimensions: 768 (matching gemini-embedding-2 output)
-- ==============================================================================

-- 1. Enable pgvector extension for dense vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  default_language VARCHAR(8) NOT NULL DEFAULT 'te',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Sessions Table (Persistent session tokens)
CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 4. User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_voice VARCHAR(64) NOT NULL DEFAULT 'Lakshmi',
  voice_speed REAL NOT NULL DEFAULT 1.0,
  auto_play_audio BOOLEAN NOT NULL DEFAULT FALSE,
  theme VARCHAR(16) NOT NULL DEFAULT 'light',
  speech_provider VARCHAR(32) NOT NULL DEFAULT 'webspeech',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  language VARCHAR(8) NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  rag_context JSONB,
  tokens_used INT,
  provider_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);

-- 7. Knowledge Documents Table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id VARCHAR(64) PRIMARY KEY,
  agent_id VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  category VARCHAR(128) NOT NULL DEFAULT 'General',
  source_type VARCHAR(32) NOT NULL DEFAULT 'verified_system',
  chunks_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_agent_id ON knowledge_documents(agent_id);

-- 8. Knowledge Chunks Table with 768-dimensional Vector Column
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  agent_id VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(768)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_agent_id ON knowledge_chunks(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);

-- 9. HNSW Cosine Distance Index for high-speed sub-millisecond approximate nearest neighbor search
-- Using vector_cosine_ops for cosine distance queries (1 - cosine similarity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_knowledge_chunks_embedding_hnsw'
  ) THEN
    CREATE INDEX idx_knowledge_chunks_embedding_hnsw 
    ON knowledge_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Fallback gracefully if pgvector extension is not pre-installed in the environment
    RAISE NOTICE 'pgvector extension not installed; skipping HNSW index creation.';
END $$;

-- 10. Learning Progress Table (Language Learning Agent)
CREATE TABLE IF NOT EXISTS learning_progress (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(8) NOT NULL,
  topic TEXT NOT NULL DEFAULT 'General Practice',
  score REAL NOT NULL DEFAULT 0.0,
  vocabulary_mastered INT NOT NULL DEFAULT 0,
  words_practiced INT NOT NULL DEFAULT 0,
  accuracy_score REAL NOT NULL DEFAULT 0.0,
  last_session TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_language UNIQUE (user_id, language)
);

ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'General Practice';
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS score REAL NOT NULL DEFAULT 0.0;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS vocabulary_mastered INT NOT NULL DEFAULT 0;


-- 11. Saved Responses Table (Bookmarks)
CREATE TABLE IF NOT EXISTS saved_responses (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id VARCHAR(64),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  agent_id VARCHAR(32) NOT NULL,
  language VARCHAR(8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_responses_user_id ON saved_responses(user_id);
