Aurora AI 🌌
Enterprise-grade, multilingual agentic voice-and-text AI platform tailored for Indic linguistic ecosystems.
Aurora AI pairs Google Gemini foundation models with high-fidelity Indic neural speech engines (Gnani Prisma v3.0 for Speech-to-Text and Gnani Timbre v3.0 for Text-to-Speech) and an isolated semantic RAG vector database. It provides culturally nuanced, low-latency conversational assistance across 10 Indian languages via 5 specialized agent personas.
🌟 Key Highlights
5 Domain-Specialized Agents: Isolated system instructions, sample prompts, and dedicated knowledge boundaries for engineering, cultural history, academics, daily productivity, and language coaching.
Progressive Sentence-Chunked Voice Pipeline: Breaks streaming LLM responses into natural sentence boundaries and feeds them sequentially into Gnani Timbre TTS, reducing perceptual Time-to-Playback by over 60% (~0.95s).
Indic Voice-First Interaction (STT & TTS): Integrated Gnani Prisma v3.0 speech recognition with real-time waveform visualizers, plus browser Web Speech API fallbacks.
10 Indian Languages with 100% UI Parity: Complete localization covering 190 UI translation keys with zero untranslated tokens in English, Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati, and Punjabi.
Enterprise Semantic RAG: 768-dimensional embeddings generated with gemini-embedding-2, persisted in PostgreSQL using pgvector with HNSW cosine-distance indexing (vector_cosine_ops), a strict 0.65 relevance cutoff, and an automated in-memory vector fallback.
Resilient Full-Stack Architecture: Single-port full-stack architecture powered by Express + React 19 + Vite + TypeScript, featuring model failover pools (gemini-3-flash-preview → gemini-3.8-flash → gemini-flash-latest) and 10-second request timeouts.
🏛️ System Architecture
Code
+---------------------------------------------------------------------------------------+
|                                     BROWSER CLIENT                                    |
|  - React 19 SPA (Vite)              - Web Audio Analyser (Waveforms)                  |
|  - UniversalChat & DashboardView     - AudioQueuePlayer (Sequential Progressive Audio) |
|  - LanguageContext (10 Languages)    - MediaRecorder / Web Speech API (Input Fallback) |
+-------------------------------------------+-------------------------------------------+
                                            | HTTP REST & Server-Sent Streams (/api/*)
+-------------------------------------------v-------------------------------------------+
|                                 NODE.JS / EXPRESS BACKEND                             |
|  - server.ts: HTTP Router, Body Parsers, Vite Dev / Static Production Middleware     |
|                                                                                       |
|  +-------------------------+  +--------------------------+  +-----------------------+ |
|  |   /api/auth Router      |  |     /api/chat Router     |  |   /api/speech Router  | |
|  | - Auth & Session Token  |  | - Agent Orchestration    |  | - Gnani Prisma STT    | |
|  | - User Preferences      |  | - Context Aggregation    |  | - Gnani Timbre TTS    | |
|  +-------------------------+  +--------------------------+  +-----------------------+ |
|  +-------------------------+  +--------------------------+  +-----------------------+ |
|  |    /api/rag Router      |  |   /api/translation Router|  |  /api/health & Status | |
|  | - Document Ingestion    |  | - Language Detection     |  | - DB & Engine Health  | |
|  | - Chunk Search (Top-K)  |  | - Script Normalization   |  | - Live Diagnostics    | |
|  +-------------------------+  +--------------------------+  +-----------------------+ |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                                CORE SERVICES ENGINE                             |  |
|  |  1. orchestrator.ts: Multi-agent prompt assembly, history windowing, RAG merge |  |
|  |  2. gemini.ts: @google/genai SDK, model failover pool, 768-dim embeddings      |  |
|  |  3. rag.ts: 400-char / 80-overlap chunking, cosine math, threshold filter       |  |
|  |  4. gnani.ts: Indic voice ID mappings, multipart STT parsing, rate control     |  |
|  +---------------------------------------------------------------------------------+  |
+----------------------+--------------------+---------------------+---------------------+
                       |                    |                     |
        +--------------v-------+    +-------v-------------+ +-----v-------------------+
        |  SUPABASE / POSTGRES |    |  GOOGLE GEMINI API  | |  GNANI SERVICES CLOUD   |
        | - pgvector ext (768) |    | - gemini-3-flash    | | - Prisma v3.0 (STT)     |
        | - HNSW Cosine Index  |    | - gemini-embedding-2| | - Timbre v3.0 (TTS)     |
        | - 11 Schema Tables   |    | - Token Streaming   | | - Indic Acoustic Models |
        +----------------------+    +---------------------+ +-------------------------+
🤖 The Five Specialized Agents
Each agent has an isolated persona, curated system instructions, domain knowledge boundaries, and dedicated neural voice bindings:
Agent Identifier	Display Name	Neural Voice	Domain & Purpose
technical	Technical & Code Specialist	Avinash	Full-stack software engineering, data structures, algorithms, debugging, code review, and cloud architecture.
cultural	Cultural Heritage & History Guide	Shivani	Indian civilizational history, architecture (Dravidian, Nagara, Vesara), classical arts, Vedic literature, and traditions.
school	Academic & School Tutor	Lakshmi	K-12 pedagogical assistance (CBSE, ICSE, State Boards), STEM explanations, and step-by-step Socratic problem solving.
personal	Daily Life & Productivity Assistant	Riyaa	Time management, day planning, task prioritization, habits, wellness, and concise organizational workflows.
language_learning	Language & Communication Coach	Chetana	Multilingual vocabulary, pronunciation coaching, grammar review, conversational practice, and speech confidence across 10 Indian languages.
🇮🇳 Supported Indian Languages
Aurora AI provides native script rendering, grammar translation, and speech synthesis across 10 languages:
Language	Code	Native Script	Script Family
English	en	English	Latin
Telugu	te	తెలుగు	Brahmic (Telugu)
Hindi	hi	हिन्दी	Devanagari
Tamil	ta	தமிழ்	Brahmic (Tamil)
Kannada	kn	ಕನ್ನಡ	Brahmic (Kannada)
Malayalam	ml	മലയാളം	Brahmic (Malayalam)
Bengali	bn	বাংলা	Eastern Nagari
Marathi	mr	मराठी	Devanagari
Gujarati	gu	ગુજરાતી	Gujarati
Punjabi	pa	ਪੰਜਾਬੀ	Gurmukhi
📚 Retrieval-Augmented Generation (RAG) Architecture
Ingestion & Windowing: Documents are split into 400-character windows with an 80-character sliding overlap (ingestDocument()), preserving semantic continuity across chunk borders.
Dense Vector Embeddings: Each text chunk is mapped to a 768-dimensional vector using gemini-embedding-2.
Database Indexing: Stored in the knowledge_chunks table utilizing PostgreSQL's native pgvector extension with an HNSW cosine-distance index (vector_cosine_ops, m = 16, ef_construction = 64).
Semantic Cutoff Gate: Chunks with cosine similarity < 0.65 are strictly filtered out to prevent context pollution.
In-Memory Fallback: If PostgreSQL is unreachable or running in lightweight development mode, Aurora AI falls back to in-memory cosine dot-product vector computation.
🛠️ Technology Stack
Layer	Technology	Version	Purpose
Frontend Framework	React	19.0.1	Declarative UI and component state
Dev Server & Bundler	Vite	8.3.0	Ultra-fast build tool and SPA middleware
Backend Runtime	Node.js / Express	4.21.2	REST API routes, audio streaming, and proxying
TypeScript Execution	tsx	^4.21.0	Direct runtime TypeScript execution
AI SDK	@google/genai	^2.32.0	Google Gemini TypeScript SDK
Foundation Models	gemini-3-flash-preview	API	Sub-1.5s TTFT multimodal conversational reasoning
Embeddings	gemini-embedding-2	API	768-dimensional dense vector embeddings
Indic Speech-to-Text	Gnani Prisma v3.0	API	Neural Indic speech recognition
Indic Text-to-Speech	Gnani Timbre v3.0	API	48kHz/16kHz regional voice synthesis
Relational Database	PostgreSQL / Supabase	8.23.1 (pg)	User authentication, sessions, and chat history
Vector Engine	pgvector	Extension	HNSW cosine-similarity search
Styling	Tailwind CSS	4.3.3	Utility-first responsive design
Motion	Motion	12.23.24	Fluid UI transitions and micro-interactions
Icons	Lucide React	0.546.0	Lightweight modern iconography
🚀 Getting Started
1. Prerequisites
Node.js: v18.0.0 or higher
npm or bun
PostgreSQL database with pgvector extension (optional; in-memory fallback will automatically engage if PostgreSQL is not connected)
Google Gemini API Key: Google AI Studio
Gnani AI Credentials: (Optional; Web Speech API acts as automatic fallback)
2. Clone and Install
Bash
git clone https://github.com/amrutha24-05/Aurora-ai.git
cd Aurora-ai
npm install
3. Environment Variables
Create a .env file in the project root based on .env.example:
Bash
cp .env.example .env
Configure your credentials:
Env
# Primary Database Connection URI (Supabase / PostgreSQL with pgvector)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres"

# Google Gemini API Key (Required for conversation & embeddings)
GEMINI_API_KEY="your_gemini_api_key_here"

# Gnani AI API Key (For Indic STT and TTS; Web Speech API acts as fallback if empty)
GNANI_API_KEY="your_gnani_api_key_here"

# Application URL
APP_URL="http://localhost:3000"
4. Database Setup (Optional for Persistence)
Execute the schema migration in your PostgreSQL database:
Bash
psql $DATABASE_URL -f server/db/migrations/001_initial_schema.sql
This creates the vector extension, HNSW cosine index, and all 11 core tables (users, sessions, conversations, messages, knowledge_chunks, learning_progress, etc.).
5. Run the Application
Bash
# Start development server on http://localhost:3000
npm run dev
For production build:
Bash
npm run build
npm run start
📁 Project Directory Structure
Code
Aurora-ai/
├── server/
│   ├── db/
│   │   ├── index.ts               # Database connection pool & fallback store
│   │   └── migrations/
│   │       └── 001_initial_schema.sql # Complete 11-table schema + HNSW pgvector
│   ├── routes/
│   │   ├── auth.ts                # Session & credentials endpoints
│   │   ├── chat.ts                # Agent conversational routing & stream
│   │   ├── rag.ts                 # Document ingestion & vector retrieval
│   │   ├── settings.ts            # User preferences & speech configuration
│   │   ├── speech.ts              # Gnani Prisma STT & Timbre TTS proxies
│   │   ├── status.ts              # Health & latency diagnostics
│   │   └── translation.ts         # Language detection & transliteration
│   ├── services/
│   │   ├── auth.ts                # PBKDF2 hashing & session token lifecycle
│   │   ├── gemini.ts              # @google/genai SDK & failover queues
│   │   ├── gnani.ts               # STT/TTS adapters & concurrency gate
│   │   ├── orchestrator.ts        # 5 agent personas & prompt assembly
│   │   ├── rag.ts                 # Chunking (400/80) & vector similarity
│   │   └── translation.ts         # Script normalization
│   └── types.ts                   # Backend type contracts
├── src/
│   ├── components/
│   │   ├── common/                # Shared UI (Header, Footer, Modals, Waveform)
│   │   ├── dashboard/             # Dashboard, UniversalChat, AgentsGallery, Sidebar
│   │   └── landing/               # Product landing page & feature showcases
│   ├── contexts/
│   │   ├── AuthContext.tsx        # User login & session state
│   │   ├── ChatContext.tsx        # Conversation flow & active agent state
│   │   └── LanguageContext.tsx    # 10 Indian languages & 190 translation keys
│   ├── services/
│   │   └── progressiveSpeech.ts   # Client-side audio queue & stream player
│   ├── types/                     # Frontend TypeScript types
│   ├── App.tsx                    # Root application component
│   └── main.tsx                   # React 19 entry point
├── server.ts                      # Full-stack Express server + Vite middleware
├── vite.config.ts                 # Vite bundler configuration
└── package.json                   # Dependencies and scripts
🔒 Security & Privacy
Zero Client-Side API Key Exposure: All secret tokens (GEMINI_API_KEY, GNANI_API_KEY, DATABASE_URL) are stored server-side and never exposed to the browser.
PBKDF2 Password Hashing: Passwords are encrypted with 10,000 rounds of SHA-256 and cryptographic salts.
Single-Concurrency Rate Protection: A server-side lock enforces Gnani Timbre's single-concurrency restriction, eliminating HTTP 429 rate-limit collisions.
Semantic Guardrails: The RAG subsystem enforces a 0.65 cosine cutoff to prevent out-of-domain context pollution and minimize hallucinations.
👩‍💻 Author & Repository
Author: Amrutha Varshini (@amrutha24-05)
Repository: https://github.com/amrutha24-05/Aurora-ai
License: MIT License
