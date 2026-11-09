/**
 * Aurora AI - Server Type Definitions
 */

export type AgentId = 'technical' | 'cultural' | 'school' | 'personal' | 'language_learning';

export type SupportedLanguage = 
  | 'en' // English
  | 'te' // Telugu
  | 'hi' // Hindi
  | 'ta' // Tamil
  | 'kn' // Kannada
  | 'ml' // Malayalam
  | 'bn' // Bengali
  | 'mr' // Marathi
  | 'gu' // Gujarati
  | 'pa'; // Punjabi

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  defaultLanguage: SupportedLanguage;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  agentId: AgentId;
  title: string;
  language: SupportedLanguage;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audioUrl?: string;
  ragContext?: RagCitation[];
  tokensUsed?: number;
  providerInfo?: {
    model: string;
    isMock: boolean;
    providerName: 'gemini' | 'gnani' | 'mock';
  };
  createdAt: string;
}

export interface RagCitation {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  snippet: string;
  relevanceScore: number;
}

export interface KnowledgeDocument {
  id: string;
  agentId: AgentId;
  title: string;
  category: string;
  sourceType: 'manual' | 'uploaded' | 'verified_system';
  chunksCount: number;
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  agentId: AgentId;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[]; // 768-dim vector
}

export interface UserPreferences {
  userId: string;
  preferredVoice: string;
  voiceSpeed: number; // 0.75 to 1.5
  autoPlayAudio: boolean;
  theme: 'dark' | 'light';
  speechProvider: 'webspeech' | 'gnani';
}

export interface LearningProgress {
  id: string;
  userId: string;
  language: SupportedLanguage;
  topic: string;
  score: number;
  vocabularyMastered: number;
  lastPracticed: string;
}

export interface IntentClassificationResult {
  recommendedAgent: AgentId;
  confidence: number;
  detectedLanguage: SupportedLanguage;
  intentCategory: string;
  explanation: string;
}

export interface AgentPersonaConfig {
  id: AgentId;
  name: string;
  roleTitle: string;
  avatarIcon: string;
  accentColor: string;
  description: string;
  systemInstruction: string;
  capabilities: string[];
  samplePrompts: { label: string; text: string; language: SupportedLanguage }[];
  toolsAllowed: string[];
}
