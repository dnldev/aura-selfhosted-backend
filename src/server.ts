
import express from 'express';
import { authRouter, requireAuthentication } from './auth.js';
import { booksRouter, sessionsRouter, preferencesRouter, ticketsRouter } from './routes.js';

const PORT = Number.parseInt(process.env['PORT'] ?? '3400', 10);

const app = express();
app.disable('x-powered-by');

// CORS for Expo/React Native
app.use((_request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_request.method === 'OPTIONS') {
    response.status(204).send();
    return;
  }
  next();
});

app.use(express.json());

// Health check — exposed at both /health and /api/health
// (Aura mobile app tests connection at /health, API consumers use /api/health)
app.get(['/health', '/api/health'], (_request, response) => {
  response.json({ status: 'ok', version: '1.0.0' });
});

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/books', requireAuthentication, booksRouter);
app.use('/api/sessions', requireAuthentication, sessionsRouter);
app.use('/api/preferences', requireAuthentication, preferencesRouter);
app.use('/api/tickets', requireAuthentication, ticketsRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aura self-hosted backend running on port ${PORT}`);
});

export { app };
