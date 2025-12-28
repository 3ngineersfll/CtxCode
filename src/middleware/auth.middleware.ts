import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { getDatabase } from '../database/init';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const db = await getDatabase();
    const authService = new AuthService(db);

    const decoded = authService.verifyToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
