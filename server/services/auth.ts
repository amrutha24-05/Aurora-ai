import crypto from 'crypto';
import { User } from '../types.ts';

// In-memory sessions store (token -> { userId, expiresAt })
const sessions = new Map<string, { userId: string; expiresAt: number }>();

/**
 * Hash a password using standard PBKDF2 with SHA-512 and cryptographic salt.
 * Formatted genuinely according to standard PHC (Password Hashing Competition) string format:
 * $pbkdf2-sha512$i=65536,l=64$<salt>$<hash>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 65536;
  const keyLength = 64;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha512').toString('hex');
  return `$pbkdf2-sha512$i=${iterations},l=${keyLength}$${salt}$${hash}`;
}

/**
 * Verify a plain password against an encoded hash string using timing-safe comparison.
 * Supports standard $pbkdf2-sha512$ format and backward-compatible legacy test hashes.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }

  // Standard PHC format: $pbkdf2-sha512$i=65536,l=64$<salt>$<hash>
  if (storedHash.startsWith('$pbkdf2-sha512$')) {
    const parts = storedHash.split('$');
    // Format: ["", "pbkdf2-sha512", "i=65536,l=64", salt, hash]
    if (parts.length < 5) return false;
    const salt = parts[3];
    const expectedHash = parts[4];
    const iterations = 65536;
    const keyLength = 64;
    const computedHash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha512').toString('hex');
    if (computedHash.length !== expectedHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(expectedHash));
  }

  // Backward compatibility with previous session hashes
  if (storedHash.startsWith('$argon2id$')) {
    const parts = storedHash.split('$');
    if (parts.length < 6) return false;
    const salt = parts[4];
    const expectedHash = parts[5];
    const iterations = 65536;
    const keyLength = 64;
    const computedHash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha512').toString('hex');
    if (computedHash.length !== expectedHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(expectedHash));
  }

  return false;
}

/**
 * Generate a cryptographically secure session token
 */
export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = 'aurora_' + crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  sessions.set(token, { userId, expiresAt });
  return { token, expiresAt };
}

/**
 * Validate session token and return userId if valid
 */
export function validateSession(token?: string): string | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session.userId;
}

/**
 * Destroy a session on logout
 */
export function destroySession(token?: string): boolean {
  if (!token) return false;
  return sessions.delete(token);
}

/**
 * Async persistent session creation
 */
export async function createSessionAsync(userId: string): Promise<{ token: string; expiresAt: number }> {
  const session = createSession(userId);
  try {
    const { dbSaveSession } = await import('../db/index.ts');
    await dbSaveSession(session.token, userId, session.expiresAt);
  } catch (err: any) {
    console.warn('Async session save warning:', err.message);
  }
  return session;
}

/**
 * Async persistent session validation
 */
export async function validateSessionAsync(token?: string): Promise<string | null> {
  if (!token) return null;
  const inMemoryUserId = validateSession(token);
  if (inMemoryUserId) return inMemoryUserId;

  try {
    const { dbFindSession } = await import('../db/index.ts');
    const session = await dbFindSession(token);
    if (session) {
      sessions.set(token, session);
      return session.userId;
    }
  } catch (err: any) {
    console.warn('Async session validation warning:', err.message);
  }
  return null;
}

/**
 * Async persistent session destruction
 */
export async function destroySessionAsync(token?: string): Promise<boolean> {
  if (!token) return false;
  destroySession(token);
  try {
    const { dbDeleteSession } = await import('../db/index.ts');
    await dbDeleteSession(token);
  } catch (err: any) {
    console.warn('Async session destruction warning:', err.message);
  }
  return true;
}


