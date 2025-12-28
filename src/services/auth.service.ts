import { Database } from 'sqlite';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

export class AuthService {
  constructor(private db: Database) {}

  async register(username: string, email: string, password: string, displayName?: string): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    const existingUser = await this.db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      username,
      email
    );

    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    await this.db.run(
      `INSERT INTO users (id, username, email, password_hash, display_name, total_points, level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      username,
      email,
      passwordHash,
      displayName || username,
      0,
      1
    );

    const user = await this.db.get('SELECT * FROM users WHERE id = ?', id);
    const token = this.generateToken(user);

    const { password_hash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async login(usernameOrEmail: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    const user = await this.db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      usernameOrEmail,
      usernameOrEmail
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user);
    const { password_hash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  verifyToken(token: string): { userId: string; username: string } {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.db.get('SELECT * FROM users WHERE id = ?', userId);

    if (!user) {
      return null;
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
