export type AgentId = 'technical' | 'cultural' | 'school' | 'personal' | 'language_learning';

export type SupportedLanguage = 
  | 'en'
  | 'te'
  | 'hi'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'bn'
  | 'mr'
  | 'gu'
  | 'pa';

export interface User {
  id: string;
  email: string;
  name: string;
  defaultLanguage: SupportedLanguage;
  createdAt?: string;
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

export interface AgentPersona {
  id: AgentId;
  name: string;
  roleTitle: string;
  avatarIcon: string;
  accentColor: string;
  description: string;
  capabilities: string[];
  samplePrompts: { label: string; text: string; language: SupportedLanguage }[];
  toolsAllowed: string[];
}

export interface UserPreferences {
  userId: string;
  preferredVoice: string;
  voiceSpeed: number;
  autoPlayAudio: boolean;
  theme: 'dark' | 'light';
  speechProvider: 'webspeech' | 'gnani';
}

export interface LearningRecord {
  id: string;
  userId: string;
  language: SupportedLanguage;
  topic: string;
  score: number;
  vocabularyMastered: number;
  lastPracticed: string;
}

export interface SavedResponse {
  id: string;
  userId: string;
  messageId: string;
  title: string;
  content: string;
  agentId: AgentId;
  language: SupportedLanguage;
  createdAt: string;
}
