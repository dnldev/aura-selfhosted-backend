

import Database from 'better-sqlite3';
import nodePath from "node:path";
const { resolve } = nodePath;

const DATABASE_PATH = resolve(process.env['AURA_DB_PATH'] ?? './data/aura.db');

let database: Database.Database | undefined;

export function getDatabase(): Database.Database {
  if (!database) {
    database = new Database(DATABASE_PATH);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    initializeSchema(database);
  }
  return database;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      recovery_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Unknown Author',
      cover_url TEXT,
      status TEXT NOT NULL DEFAULT 'want-to-read',
      rating REAL,
      review TEXT,
      series TEXT,
      page_count INTEGER,
      current_page INTEGER,
      total_hours REAL,
      current_hours REAL,
      playback_speed REAL,
      date_started TEXT,
      date_finished TEXT,
      worldbuilding REAL,
      characters REAL,
      plot REAL,
      writing REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      book_id TEXT NOT NULL REFERENCES books(id),
      date TEXT NOT NULL,
      pages_read INTEGER NOT NULL DEFAULT 0,
      minutes_listened REAL,
      minutes_read REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      default_playback_speed REAL DEFAULT 1.0
    );

    CREATE INDEX IF NOT EXISTS index_books_user ON books(user_id);
    CREATE INDEX IF NOT EXISTS index_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS index_sessions_book ON sessions(book_id);

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      messages TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS index_tickets_user ON tickets(user_id);
  `);
}
