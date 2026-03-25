

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';

import { getDatabase } from './database.js';
import { NewBookSchema, UpdateBookSchema, NewSessionSchema, NewTicketSchema, UpdateTicketSchema } from './schemas.js';

export const booksRouter = Router();
export const sessionsRouter = Router();
export const preferencesRouter = Router();
export const ticketsRouter = Router();

type AuthenticatedRequest = Request & { userId: string };

// ── Books ────────────────────────────────────────────────────────────────

booksRouter.get('/', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const database = getDatabase();
  const books = database.prepare(
    'SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC',
  ).all(userId);

  response.json(books.map((row) => mapBookRow(row as Record<string, unknown>)));
});

booksRouter.post('/', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const parseResult = NewBookSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const book = parseResult.data;
  const id = randomUUID();
  const now = new Date().toISOString();
  const database = getDatabase();

  database.prepare(`
    INSERT INTO books (id, user_id, title, author, cover_url, status, rating, review, series,
      page_count, current_page, total_hours, current_hours, playback_speed,
      date_started, date_finished, worldbuilding, characters, plot, writing,
      created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId,
    book.title ?? '', book.author ?? 'Unknown Author', book.coverUrl ?? null,
    book.status ?? 'want-to-read', book.rating ?? null, book.review ?? null,
    book.series ?? null, book.pageCount ?? null, book.currentPage ?? null,
    book.totalHours ?? null, book.currentHours ?? null, book.playbackSpeed ?? null,
    book.dateStarted ?? null, book.dateFinished ?? null,
    book.worldbuilding ?? null, book.characters ?? null,
    book.plot ?? null, book.writing ?? null,
    now, now,
  );

  const created = database.prepare('SELECT * FROM books WHERE id = ?').get(id);
  response.status(201).json(mapBookRow(created as Record<string, unknown>));
});

booksRouter.patch('/:id', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const bookId = request.params['id'];
  const parseResult = UpdateBookSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const updates = parseResult.data;
  const database = getDatabase();

  // Verify ownership
  const existing = database.prepare(
    'SELECT id FROM books WHERE id = ? AND user_id = ?',
  ).get(bookId, userId);

  if (!existing) {
    response.status(404).json({ error: 'Book not found' });
    return;
  }

  const allowedFields: Record<string, string> = {
    title: 'title', author: 'author', coverUrl: 'cover_url',
    status: 'status', rating: 'rating', review: 'review',
    series: 'series', pageCount: 'page_count', currentPage: 'current_page',
    totalHours: 'total_hours', currentHours: 'current_hours',
    playbackSpeed: 'playback_speed', dateStarted: 'date_started',
    dateFinished: 'date_finished', worldbuilding: 'worldbuilding',
    characters: 'characters', plot: 'plot', writing: 'writing',
  };

  const setClauses: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];

  for (const [camelCase, columnName] of Object.entries(allowedFields)) {
    if (camelCase in updates) {
      setClauses.push(`${columnName} = ?`);
      values.push((updates as Record<string, unknown>)[camelCase]);
    }
  }

  values.push(bookId, userId);

  database.prepare(
    `UPDATE books SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`,
  ).run(...values);

  response.status(204).send();
});

booksRouter.delete('/:id', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const bookId = request.params['id'];
  const database = getDatabase();

  const result = database.prepare(
    'DELETE FROM books WHERE id = ? AND user_id = ?',
  ).run(bookId, userId);

  if (result.changes === 0) {
    response.status(404).json({ error: 'Book not found' });
    return;
  }

  response.status(204).send();
});

// ── Sessions ─────────────────────────────────────────────────────────────

sessionsRouter.get('/', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const database = getDatabase();
  const sessions = database.prepare(
    'SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC',
  ).all(userId);

  response.json(sessions.map((row) => mapSessionRow(row as Record<string, unknown>)));
});

sessionsRouter.post('/', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const parseResult = NewSessionSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const session = parseResult.data;
  const id = randomUUID();
  const now = new Date().toISOString();
  const database = getDatabase();

  database.prepare(`
    INSERT INTO sessions (id, user_id, book_id, date, pages_read, minutes_listened, minutes_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, session.bookId, session.date,
    session.pagesRead ?? 0, session.minutesListened ?? null,
    session.minutesRead ?? null, now,
  );

  const created = database.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  response.status(201).json(mapSessionRow(created as Record<string, unknown>));
});

// ── Preferences ──────────────────────────────────────────────────────────

preferencesRouter.get('/', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const database = getDatabase();
  const preferences = database.prepare(
    'SELECT * FROM preferences WHERE user_id = ?',
  ).get(userId) as { default_playback_speed: number } | undefined;

  response.json({
    defaultPlaybackSpeed: preferences?.default_playback_speed ?? 1,
  });
});

// ── Row mappers (snake_case → camelCase) ─────────────────────────────────

function mapBookRow(row: Record<string, unknown>) {
  return {
    id: row['id'],
    title: row['title'],
    author: row['author'],
    coverUrl: row['cover_url'],
    status: row['status'],
    rating: row['rating'],
    review: row['review'],
    series: row['series'],
    pageCount: row['page_count'],
    currentPage: row['current_page'],
    totalHours: row['total_hours'],
    currentHours: row['current_hours'],
    playbackSpeed: row['playback_speed'],
    dateStarted: row['date_started'],
    dateFinished: row['date_finished'],
    worldbuilding: row['worldbuilding'],
    characters: row['characters'],
    plot: row['plot'],
    writing: row['writing'],
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
  };
}

function mapSessionRow(row: Record<string, unknown>) {
  return {
    id: row['id'],
    bookId: row['book_id'],
    date: row['date'],
    pagesRead: row['pages_read'],
    minutesListened: row['minutes_listened'],
    minutesRead: row['minutes_read'],
    createdAt: row['created_at'],
  };
}

// ── Tickets ──────────────────────────────────────────────────────────────

ticketsRouter.get('/', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const database = getDatabase();
  const tickets = database.prepare(
    'SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC',
  ).all(userId);
  response.json(tickets.map((row) => mapTicketRow(row as Record<string, unknown>)));
});

ticketsRouter.post('/', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const parseResult = NewTicketSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const { subject, initialMessage } = parseResult.data;
  const id = randomUUID();
  const now = new Date().toISOString();
  const messages = JSON.stringify([{ sender: 'user', text: initialMessage, timestamp: now }]);
  const database = getDatabase();

  database.prepare(`
    INSERT INTO tickets (id, user_id, subject, status, messages, created_at, updated_at)
    VALUES (?, ?, ?, 'open', ?, ?, ?)
  `).run(id, userId, subject ?? '', messages, now, now);

  const created = database.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  response.status(201).json(mapTicketRow(created as Record<string, unknown>));
});

ticketsRouter.patch('/:id', (request: Request, response: Response) => {
  const { userId } = request as AuthenticatedRequest;
  const ticketId = request.params['id'];
  const parseResult = UpdateTicketSchema.safeParse(request.body);
  if (!parseResult.success) {
    response.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }
  const { status, newMessage } = parseResult.data;
  const database = getDatabase();

  const existing = database.prepare(
    'SELECT * FROM tickets WHERE id = ? AND user_id = ?',
  ).get(ticketId, userId) as Record<string, unknown> | undefined;

  if (!existing) {
    response.status(404).json({ error: 'Ticket not found' });
    return;
  }

  let currentMessages: unknown[] = [];
  try {
    currentMessages = JSON.parse((existing['messages'] as string) ?? '[]');
  } catch { /* empty */ }

  if (newMessage) {
    currentMessages.push({
      sender: newMessage.sender,
      text: newMessage.text,
      timestamp: new Date().toISOString(),
    });
  }

  const setClauses = ["updated_at = datetime('now')", 'messages = ?'];
  const values: unknown[] = [JSON.stringify(currentMessages)];

  if (status) {
    setClauses.push('status = ?');
    values.push(status);
  }

  values.push(ticketId, userId);
  database.prepare(
    `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`,
  ).run(...values);

  response.status(204).send();
});

function mapTicketRow(row: Record<string, unknown>) {
  let messages: unknown[] = [];
  try {
    messages = JSON.parse((row['messages'] as string) ?? '[]');
  } catch { /* empty */ }

  return {
    id: row['id'],
    subject: row['subject'],
    status: row['status'],
    messages,
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
  };
}

