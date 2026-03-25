

import { Router, type Request, type Response } from 'express';
import pkg from 'bcryptjs';
const { hashSync, compareSync } = pkg;
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'node:crypto';
import { getDatabase } from './database.js';
import { RegisterSchema, LoginSchema, RecoverSchema, ChangeEmailSchema, ForgotPasswordSchema, ResetPasswordSchema } from './schemas.js';
import { createTransport, type Transporter } from 'nodemailer';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'aura-selfhosted-change-me-in-production';
const TOKEN_EXPIRY = '30d';
const RESET_TOKEN_EXPIRY = '15m';
const APP_BASE_URL = process.env['APP_BASE_URL'] ?? 'https://www.aurareads.app';

export const authRouter = Router();

// ── SMTP transport (optional — graceful fallback if not configured) ───────
let emailTransporter: Transporter | undefined;

function getEmailTransporter(): Transporter | undefined {
  if (emailTransporter) return emailTransporter;

  const smtpHost = process.env['SMTP_HOST'];
  const smtpPort = process.env['SMTP_PORT'];
  const smtpUser = process.env['SMTP_USER'];
  const smtpPassword = process.env['SMTP_PASS'];

  if (!smtpHost || !smtpUser || !smtpPassword) {
    return undefined;
  }

  try {
    emailTransporter = createTransport({
      host: smtpHost,
      port: Number.parseInt(smtpPort ?? '587', 10),
      secure: smtpPort === '465',
      auth: { user: smtpUser, pass: smtpPassword },
    });
    return emailTransporter;
  } catch {
    return undefined;
  }
}

function generateRecoveryCode(): string {
  const bytes = randomBytes(6);
  const hex = bytes.toString('hex').toUpperCase();
  return `AURA-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

function signToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

authRouter.post('/register', (request: Request, response: Response) => {
  const parseResult = RegisterSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const { username, password, email, displayName } = parseResult.data;

  const database = getDatabase();

  const existing = database.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    response.status(409).json({ error: 'Username already taken' });
    return;
  }

  const userId = randomUUID();
  const passwordHash = hashSync(password, 12);
  const recoveryCode = email ? null : generateRecoveryCode();

  database.prepare(
    'INSERT INTO users (id, username, email, password_hash, display_name, recovery_code) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, username, email ?? null, passwordHash, displayName ?? username, recoveryCode);

  // Initialize preferences
  database.prepare('INSERT INTO preferences (user_id) VALUES (?)').run(userId);

  const token = signToken(userId, username);

  response.status(201).json({
    token,
    userId,
    username,
    displayName: displayName ?? username,
    recoveryCode,
  });
});

authRouter.post('/login', (request: Request, response: Response) => {
  const parseResult = LoginSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const { username, password } = parseResult.data;

  const database = getDatabase();
  const user = database.prepare(
    'SELECT id, username, password_hash, display_name FROM users WHERE username = ?',
  ).get(username) as { id: string; username: string; password_hash: string; display_name: string } | undefined;

  if (!user || !compareSync(password, user.password_hash)) {
    response.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = signToken(user.id, user.username);

  response.json({
    token,
    userId: user.id,
    username: user.username,
    displayName: user.display_name,
  });
});

authRouter.post('/recover', (request: Request, response: Response) => {
  const parseResult = RecoverSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const { recoveryCode, newPassword } = parseResult.data;

  const database = getDatabase();
  const user = database.prepare(
    'SELECT id FROM users WHERE recovery_code = ?',
  ).get(recoveryCode) as { id: string } | undefined;

  if (!user) {
    response.status(404).json({ error: 'Invalid recovery code' });
    return;
  }

  const passwordHash = hashSync(newPassword, 12);
  database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

  response.json({ success: true });
});

// ── POST /forgot-password — send email reset link ──────────────────────────
authRouter.post('/forgot-password', (request: Request, response: Response) => {
  const parseResult = ForgotPasswordSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Username or email is required' });
    return;
  }
  const { identifier } = parseResult.data;

  const transporter = getEmailTransporter();
  if (!transporter) {
    response.status(501).json({ error: 'SMTP is not configured on this server. Email password resets are unavailable.' });
    return;
  }

  const database = getDatabase();
  const user = database.prepare(
    'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
  ).get(identifier.trim(), identifier.trim()) as { id: string; username: string; email: string | null } | undefined;

  // Always return success to prevent user enumeration
  if (!user || !user.email) {
    response.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    return;
  }

  const resetToken = jwt.sign(
    { userId: user.id, purpose: 'password-reset' },
    JWT_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRY },
  );

  const resetLink = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #000; color: #e4e4e7;">
      <h1 style="color: #06b6d4; font-size: 24px; margin-bottom: 8px;">Aura</h1>
      <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">Password Reset Request</p>
      <p style="font-size: 15px; line-height: 1.6;">Hi <strong>@${user.username}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">Someone requested a password reset for your Aura account. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" style="background: #06b6d4; color: #000; font-weight: bold; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #71717a; line-height: 1.5;">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;" />
      <p style="font-size: 12px; color: #52525b;">Aura — Your reading tracker</p>
    </div>
  `;

  transporter.sendMail({
    from: process.env['SMTP_FROM'] ?? `"Aura" <${process.env['SMTP_USER']}>`,
    to: user.email,
    subject: 'Reset your Aura password',
    html: emailHtml,
    text: `Hi @${user.username},\n\nReset your password: ${resetLink}\n\nThis link expires in 15 minutes.\n\n— Aura`,
  }).catch((error: unknown) => {
    console.error('[auth] Failed to send reset email:', error);
  });

  response.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
});

// ── POST /reset-password — validate token + set new password ────────────────
authRouter.post('/reset-password', (request: Request, response: Response) => {
  const parseResult = ResetPasswordSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Reset token and new password are required' });
    return;
  }
  const { token, newPassword } = parseResult.data;

  let payload: { userId: string; purpose: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: string; purpose: string };
  } catch {
    response.status(401).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    return;
  }

  if (payload.purpose !== 'password-reset') {
    response.status(401).json({ error: 'Invalid reset token' });
    return;
  }

  const database = getDatabase();
  const user = database.prepare(
    'SELECT id, username, display_name FROM users WHERE id = ?',
  ).get(payload.userId) as { id: string; username: string; display_name: string } | undefined;

  if (!user) {
    response.status(404).json({ error: 'User not found' });
    return;
  }

  const passwordHash = hashSync(newPassword, 12);
  database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

  const loginToken = signToken(user.id, user.username);

  response.json({
    success: true,
    token: loginToken,
    userId: user.id,
    username: user.username,
    displayName: user.display_name,
  });
}); 

authRouter.patch('/email', (request: Request, response: Response) => {
  // Verify JWT inline since this route is on the public authRouter
  const authorizationHeader = request.headers.authorization;
  if (!authorizationHeader?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Authorization header required' });
    return;
  }

  let userId: string;
  try {
    const token = authorizationHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    userId = payload.userId;
  } catch {
    response.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const parseResult = ChangeEmailSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const { currentPassword, newEmail } = parseResult.data;
  const trimmedEmail = newEmail.trim();

  const database = getDatabase();
  const user = database.prepare(
    'SELECT id, password_hash FROM users WHERE id = ?',
  ).get(userId) as { id: string; password_hash: string } | undefined;

  if (!user) {
    response.status(404).json({ error: 'User not found' });
    return;
  }

  if (!compareSync(currentPassword, user.password_hash)) {
    response.status(401).json({ error: 'Incorrect password' });
    return;
  }

  database.prepare('UPDATE users SET email = ? WHERE id = ?').run(trimmedEmail, userId);

  response.json({ success: true });
});

/**
 * Middleware to verify JWT and attach userId to request.
 */
export function requireAuthentication(request: Request, response: Response, next: () => void): void {
  const authorizationHeader = request.headers.authorization;
  if (!authorizationHeader?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Authorization header required' });
    return;
  }

  try {
    const token = authorizationHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (request as Request & { userId: string }).userId = payload.userId;
    next();
  } catch {
    response.status(401).json({ error: 'Invalid or expired token' });
  }
}
