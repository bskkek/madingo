import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import crypto from 'node:crypto';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email?: string; name?: string };
}

const TOKEN_SECRET = process.env.SQL_PASSWORD || 'madingo-local-session-secret';

export function createSessionToken(uid: string, email: string): string {
  const payload = Buffer.from(JSON.stringify({ uid, email, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `madingo.${payload}.${sig}`;
}

export function verifySessionToken(token: string): { uid: string; email: string } | null {
  if (!token.startsWith('madingo.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded && typeof decoded.uid === 'string') {
      return { uid: decoded.uid, email: decoded.email || '' };
    }
  } catch {
    return null;
  }
  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  const sessionUser = verifySessionToken(token);
  if (sessionUser) {
    req.user = sessionUser;
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
