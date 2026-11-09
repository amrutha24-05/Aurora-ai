import { Router } from 'express';
import crypto from 'crypto';
import { 
  dbConversations, 
  dbMessages, 
  dbSavedResponses, 
  dbUsers,
  dbGetConversations,
  dbGetConversationById,
  dbSaveConversation,
  dbDeleteConversation,
  dbGetMessages,
  dbSaveMessage,
  dbGetSavedResponses,
  dbSaveSavedResponse
} from '../db/index.ts';
import { getAuthenticatedUser, getAuthenticatedUserAsync } from './auth.ts';
import { 
  AGENT_PERSONAS, 
  classifyIntent, 
  classifyIntentAsync,
  orchestrateAgentResponse,
  streamAgentResponse 
} from '../services/orchestrator.ts';
import { AgentId, Conversation, Message, SupportedLanguage } from '../types.ts';

export const chatRouter = Router();

// GET /api/chat/agents - List all 5 specialized agents and their configurations
chatRouter.get('/agents', (_req, res) => {
  res.json({
    agents: Object.values(AGENT_PERSONAS),
  });
});

// GET /api/chat/conversations - List conversations for authenticated user
chatRouter.get('/conversations', async (req, res) => {
  try {
    const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
    const userId = user ? user.id : 'usr_demo_aurora_01';

    const userConversations = await dbGetConversations(userId);
    return res.json({ conversations: userConversations || [] });
  } catch (err: any) {
    console.error('Error listing conversations:', err.message);
    return res.json({ conversations: [] });
  }
});

// POST /api/chat/conversations - Create a new conversation
chatRouter.post('/conversations', async (req, res) => {
  try {
    const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
    const userId = user ? user.id : 'usr_demo_aurora_01';
    const { agentId = 'technical', language = 'en', title } = req.body;

    const validAgentId: AgentId = AGENT_PERSONAS[agentId as AgentId] ? (agentId as AgentId) : 'personal';
    const convId = 'conv_' + crypto.randomBytes(8).toString('hex');
    const persona = AGENT_PERSONAS[validAgentId];

    const newConv: Conversation = {
      id: convId,
      userId,
      agentId: validAgentId,
      title: title || `New Chat with ${persona.name}`,
      language: (language as SupportedLanguage) || 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbSaveConversation(newConv);
    return res.json({ conversation: newConv });
  } catch (err: any) {
    console.error('Error creating conversation:', err.message);
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/chat/conversations/:id/messages - Get messages in a conversation
chatRouter.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Valid conversation ID is required', conversation: null, messages: [] });
    }

    const conv = await dbGetConversationById(id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found', conversation: null, messages: [] });
    }

    const messages = await dbGetMessages(id);
    return res.json({
      conversation: conv,
      messages: messages || [],
    });
  } catch (err: any) {
    console.error('Error fetching conversation messages:', err.message);
    return res.status(500).json({ error: 'Failed to fetch conversation messages', conversation: null, messages: [] });
  }
});

// POST /api/chat/send - Send a user message and orchestrate agent reply
chatRouter.post('/send', async (req, res) => {
  try {
    const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
    const userId = user ? user.id : 'usr_demo_aurora_01';
    let { 
      conversationId, 
      content, 
      agentId, 
      language, 
      languageControlMode = 'selected', 
      targetTranslationLanguage 
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    // If no conversationId is supplied, auto-create one
    let conv: Conversation | null = null;
    if (conversationId) {
      conv = await dbGetConversationById(conversationId);
    }

    if (!conv) {
      const selectedAgent: AgentId = agentId && AGENT_PERSONAS[agentId as AgentId] ? agentId : 'personal';
      const convId = 'conv_' + crypto.randomBytes(8).toString('hex');
      conv = {
        id: convId,
        userId,
        agentId: selectedAgent,
        title: content.slice(0, 32) + (content.length > 32 ? '...' : ''),
        language: (language as SupportedLanguage) || 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await dbSaveConversation(conv);
      conversationId = convId;
    }

    // Dynamic conversation-level language switch support
    if (language && language !== conv.language) {
      conv.language = language as SupportedLanguage;
    }
    // Dynamic agent switch support
    if (agentId && agentId !== conv.agentId && AGENT_PERSONAS[agentId as AgentId]) {
      conv.agentId = agentId as AgentId;
    }

    // Save user message
    const userMsg: Message = {
      id: 'msg_' + crypto.randomBytes(8).toString('hex'),
      conversationId: conv.id,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    await dbSaveMessage(userMsg);
    const currentMessages = await dbGetMessages(conv.id);

    // Call orchestrator
    const result = await orchestrateAgentResponse({
      agentId: conv.agentId,
      userPrompt: content,
      language: conv.language,
      languageControlMode,
      targetTranslationLanguage,
      conversationHistory: currentMessages,
    });

    const assistantMsg: Message = {
      id: 'msg_' + crypto.randomBytes(8).toString('hex'),
      conversationId: conv.id,
      role: 'assistant',
      content: result.content,
      ragContext: result.citations,
      tokensUsed: result.tokensUsed,
      providerInfo: result.providerInfo,
      createdAt: new Date().toISOString(),
    };

    await dbSaveMessage(assistantMsg);

    // Update conversation timestamp and synchronized language
    if (result.effectiveLanguage) {
      conv.language = result.effectiveLanguage;
    }
    conv.updatedAt = new Date().toISOString();
    await dbSaveConversation(conv);

    res.json({
      conversation: conv,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (err: any) {
    console.error('Chat send error:', err);
    res.status(500).json({ error: err.message || 'Failed to process message' });
  }
});

// POST /api/chat/stream - Server-Sent Events (SSE) streaming for real-time progressive response display
chatRouter.post('/stream', async (req, res) => {
  try {
    const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
    const userId = user ? user.id : 'usr_demo_aurora_01';
    let { 
      conversationId, 
      content, 
      message,
      agentId, 
      agentType,
      language, 
      languageControlMode = 'selected',
      targetTranslationLanguage 
    } = req.body;

    const finalContent = (content || message || '').trim();
    const finalAgentId = (agentId || agentType);

    if (!finalContent) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    let conv: Conversation | null = null;
    if (conversationId) {
      conv = await dbGetConversationById(conversationId);
    }

    if (!conv) {
      const selectedAgent: AgentId = finalAgentId && AGENT_PERSONAS[finalAgentId as AgentId] ? finalAgentId : 'personal';
      const convId = 'conv_' + crypto.randomBytes(8).toString('hex');
      conv = {
        id: convId,
        userId,
        agentId: selectedAgent,
        title: finalContent.slice(0, 32) + (finalContent.length > 32 ? '...' : ''),
        language: (language as SupportedLanguage) || 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await dbSaveConversation(conv);
      conversationId = convId;
    }

    if (language && language !== conv.language) {
      conv.language = language as SupportedLanguage;
    }
    if (finalAgentId && finalAgentId !== conv.agentId && AGENT_PERSONAS[finalAgentId as AgentId]) {
      conv.agentId = finalAgentId as AgentId;
    }

    // Save user message
    const userMsg: Message = {
      id: 'msg_' + crypto.randomBytes(8).toString('hex'),
      conversationId: conv.id,
      role: 'user',
      content: finalContent,
      createdAt: new Date().toISOString(),
    };
    await dbSaveMessage(userMsg);
    const currentMessages = await dbGetMessages(conv.id);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Stream metadata first
    res.write(`data: ${JSON.stringify({ 
      type: 'meta', 
      conversationId: conv.id, 
      userMessage: userMsg 
    })}\n\n`);

    let fullGeneratedContent = '';
    let citations: any[] = [];
    let modelUsed = 'gemini-3-flash-preview';

    for await (const chunk of streamAgentResponse({
      agentId: conv.agentId,
      userPrompt: finalContent,
      language: conv.language,
      languageControlMode,
      targetTranslationLanguage,
      conversationHistory: currentMessages,
    })) {
      if (chunk.type === 'meta') {
        citations = chunk.citations || [];
        res.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`);
      } else if (chunk.type === 'token') {
        fullGeneratedContent += chunk.token || '';
        if (chunk.model) modelUsed = chunk.model;
        res.write(`data: ${JSON.stringify({ type: 'token', token: chunk.token, model: chunk.model })}\n\n`);
      } else if (chunk.type === 'done') {
        if (chunk.fullContent) fullGeneratedContent = chunk.fullContent;
        if (chunk.model) modelUsed = chunk.model;
        if (chunk.citations) citations = chunk.citations;
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`);
      }
    }

    // Persist final assistant message
    const assistantMsg: Message = {
      id: 'msg_' + crypto.randomBytes(8).toString('hex'),
      conversationId: conv.id,
      role: 'assistant',
      content: fullGeneratedContent,
      ragContext: citations,
      providerInfo: {
        model: modelUsed,
        isMock: false,
        providerName: 'gemini',
      },
      createdAt: new Date().toISOString(),
    };

    await dbSaveMessage(assistantMsg);

    conv.updatedAt = new Date().toISOString();
    await dbSaveConversation(conv);

    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      assistantMessage: assistantMsg,
      conversation: conv
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Chat stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Stream initialization failed' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

// POST /api/chat/classify - Smart Intent Classification with Romanized Indic support
chatRouter.post('/classify', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required for intent classification' });
  }
  const result = await classifyIntentAsync(query);
  res.json(result);
});

// DELETE /api/chat/conversations/:id
chatRouter.delete('/conversations/:id', async (req, res) => {
  const { id } = req.params;
  await dbDeleteConversation(id);
  res.json({ success: true, message: 'Conversation deleted' });
});

// POST /api/chat/save-response - Save response bookmark
chatRouter.post('/save-response', async (req, res) => {
  const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
  const userId = user ? user.id : 'usr_demo_aurora_01';
  const { messageId, title, content, agentId, language } = req.body;

  const newItem = {
    id: 'save_' + crypto.randomBytes(6).toString('hex'),
    userId,
    messageId,
    title: title || 'Saved Insight',
    content,
    agentId,
    language,
    createdAt: new Date().toISOString(),
  };

  await dbSaveSavedResponse(newItem);
  res.json({ success: true, savedItem: newItem });
});

// GET /api/chat/saved-responses - List saved bookmarks
chatRouter.get('/saved-responses', async (req, res) => {
  const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
  const userId = user ? user.id : 'usr_demo_aurora_01';
  const saved = await dbGetSavedResponses(userId);
  res.json({ savedResponses: saved });
});
