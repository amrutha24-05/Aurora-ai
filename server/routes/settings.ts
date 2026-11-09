import { Router } from 'express';
import crypto from 'crypto';
import { 
  dbGetPreferences, 
  dbSavePreferences, 
  dbGetLearning, 
  dbSaveLearning,
  dbPreferences,
  dbLearning,
  dbSaveUser
} from '../db/index.ts';
import { getAuthenticatedUser, getAuthenticatedUserAsync } from './auth.ts';
import { LearningProgress, SupportedLanguage } from '../types.ts';

export const settingsRouter = Router();

// GET /api/settings
settingsRouter.get('/', async (req, res) => {
  const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
  const userId = user ? user.id : 'usr_demo_aurora_01';
  let prefs = await dbGetPreferences(userId);

  if (!prefs) {
    prefs = {
      userId,
      preferredVoice: 'Shivani',
      voiceSpeed: 1.0,
      autoPlayAudio: false,
      theme: 'dark',
      speechProvider: 'webspeech',
    };
    await dbSavePreferences(prefs);
  }

  res.json({ preferences: prefs });
});

// PUT /api/settings
settingsRouter.put('/', async (req, res) => {
  const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
  const userId = user ? user.id : 'usr_demo_aurora_01';
  const { preferredVoice, voiceSpeed, autoPlayAudio, theme, speechProvider, defaultLanguage } = req.body;

  let prefs = (await dbGetPreferences(userId)) || {
    userId,
    preferredVoice: 'Shivani',
    voiceSpeed: 1.0,
    autoPlayAudio: false,
    theme: 'dark' as const,
    speechProvider: 'webspeech' as const,
  };

  if (preferredVoice !== undefined) prefs.preferredVoice = preferredVoice;
  if (voiceSpeed !== undefined) prefs.voiceSpeed = voiceSpeed;
  if (autoPlayAudio !== undefined) prefs.autoPlayAudio = autoPlayAudio;
  if (theme !== undefined) prefs.theme = theme;
  if (speechProvider !== undefined) prefs.speechProvider = speechProvider;

  await dbSavePreferences(prefs);

  if (defaultLanguage && user) {
    user.defaultLanguage = defaultLanguage as SupportedLanguage;
    await dbSaveUser(user);
  }

  res.json({ success: true, preferences: prefs });
});

// GET /api/learning/progress
settingsRouter.get('/learning', async (req, res) => {
  const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
  const userId = user ? user.id : 'usr_demo_aurora_01';

  let progress = await dbGetLearning(userId);
  if (!progress || progress.length === 0) {
    progress = [
      {
        id: 'prog_01',
        userId,
        language: 'te',
        topic: 'Daily Telugu Greetings & Pronouns',
        score: 85,
        vocabularyMastered: 18,
        lastPracticed: new Date().toISOString(),
      },
      {
        id: 'prog_02',
        userId,
        language: 'hi',
        topic: 'Hindi Numbers & Time Expressions',
        score: 92,
        vocabularyMastered: 24,
        lastPracticed: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'prog_03',
        userId,
        language: 'ta',
        topic: 'Tamil Conversational Questions',
        score: 74,
        vocabularyMastered: 12,
        lastPracticed: new Date(Date.now() - 172800000).toISOString(),
      },
    ];
    for (const p of progress) {
      await dbSaveLearning(p);
    }
  }

  res.json({ progress });
});

// POST /api/learning/record
settingsRouter.post('/learning/record', async (req, res) => {
  const user = (await getAuthenticatedUserAsync(req)) || getAuthenticatedUser(req);
  const userId = user ? user.id : 'usr_demo_aurora_01';
  const { language, topic, score, vocabularyMastered } = req.body;

  const newRecord: LearningProgress = {
    id: 'prog_' + crypto.randomBytes(6).toString('hex'),
    userId,
    language: (language as SupportedLanguage) || 'te',
    topic: topic || 'Quick Practice Drill',
    score: typeof score === 'number' ? score : 100,
    vocabularyMastered: typeof vocabularyMastered === 'number' ? vocabularyMastered : 5,
    lastPracticed: new Date().toISOString(),
  };

  await dbSaveLearning(newRecord);
  res.json({ success: true, record: newRecord });
});
