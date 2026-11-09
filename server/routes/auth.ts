import { Router } from 'express';
import crypto from 'crypto';
import { 
  dbUsers, 
  dbPreferences, 
  dbFindUserByEmail, 
  dbFindUserById, 
  dbSaveUser, 
  dbSavePreferences, 
  dbGetPreferences 
} from '../db/index.ts';
import { 
  hashPassword, 
  verifyPassword, 
  createSessionAsync, 
  validateSessionAsync, 
  destroySessionAsync,
  createSession,
  validateSession,
  destroySession 
} from '../services/auth.ts';
import { User } from '../types.ts';

export const authRouter = Router();

// Synchronous fallback helper for extracting logged-in user
export function getAuthenticatedUser(req: any): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1];
  const userId = validateSession(token);
  if (!userId) return null;
  return dbUsers.get(userId) || null;
}

// Asynchronous persistent helper for extracting logged-in user from PostgreSQL / Cache
export async function getAuthenticatedUserAsync(req: any): Promise<User | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1];
  const userId = await validateSessionAsync(token);
  if (!userId) return null;
  return await dbFindUserById(userId);
}

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name, defaultLanguage = 'en' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Please provide full name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if email already exists in DB or in-memory
    const existing = await dbFindUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const newUser: User = {
      id: userId,
      email,
      name,
      passwordHash: hashPassword(password),
      defaultLanguage,
      createdAt: new Date().toISOString(),
    };

    await dbSaveUser(newUser);

    const defaultPrefs = {
      userId,
      preferredVoice: 'Shivani',
      voiceSpeed: 1.0,
      autoPlayAudio: false,
      theme: 'dark' as const,
      speechProvider: 'webspeech' as const,
    };
    await dbSavePreferences(defaultPrefs);

    const { token, expiresAt } = await createSessionAsync(userId);

    res.json({
      token,
      expiresAt,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        defaultLanguage: newUser.defaultLanguage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const user = await dbFindUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { token, expiresAt } = await createSessionAsync(user.id);

    res.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultLanguage: user.defaultLanguage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// POST /api/auth/demo (1-Click Instant Guest Sign In)
authRouter.post('/demo', async (_req, res) => {
  const demoUserId = 'usr_demo_aurora_01';
  let demoUser = await dbFindUserById(demoUserId);

  if (!demoUser) {
    demoUser = {
      id: demoUserId,
      email: 'demo@aurora.ai',
      name: 'Amrutha Varshini',
      passwordHash: hashPassword('Aurora@2026'),
      defaultLanguage: 'te',
      createdAt: new Date().toISOString(),
    };
    await dbSaveUser(demoUser);
  }

  const { token, expiresAt } = await createSessionAsync(demoUser.id);
  res.json({
    token,
    expiresAt,
    user: {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      defaultLanguage: demoUser.defaultLanguage,
    },
  });
});

// GET /api/auth/me
authRouter.get('/me', async (req, res) => {
  const user = await getAuthenticatedUserAsync(req) || getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized or expired session' });
  }
  const prefs = await dbGetPreferences(user.id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      defaultLanguage: user.defaultLanguage,
      createdAt: user.createdAt,
    },
    preferences: prefs,
  });
});

// POST /api/auth/logout
authRouter.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    await destroySessionAsync(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});
