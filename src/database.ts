import Database from 'better-sqlite3';
import { mkdirSync, accessSync, constants } from 'node:fs';
import nodePath from "node:path";
const { resolve, dirname } = nodePath;

const DATABASE_PATH = resolve(process.env['AURA_DB_PATH'] ?? './data/aura.db');

let database: Database.Database | undefined;

/**
 * Ensures the parent directory of the database file exists and is writable.
 * This prevents "unable to open database file" errors when using Docker volumes
 * with custom mount paths.
 */
function ensureDatabaseDirectory(): void {
  const databaseDirectory = dirname(DATABASE_PATH);

  try {
    mkdirSync(databaseDirectory, { recursive: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[database] Failed to create database directory "${databaseDirectory}": ${message}\n` +
      `  Ensure the path is writable. If using Docker, check your volume mount permissions.`
    );
    throw error;
  }

  try {
    accessSync(databaseDirectory, constants.W_OK);
  } catch {
    console.error(
      `[database] Database directory "${databaseDirectory}" is not writable.\n` +
      `  If using Docker, ensure the volume is mounted with correct permissions.\n` +
      `  Try: docker run --user $(id -u):$(id -g) ... or fix directory ownership.`
    );
    throw new Error(`Database directory "${databaseDirectory}" is not writable`);
  }
}

export function getDatabase(): Database.Database {
  if (!database) {
    ensureDatabaseDirectory();
    try {
      database = new Database(DATABASE_PATH);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[database] Failed to open database at "${DATABASE_PATH}": ${message}\n` +
        `  Check that AURA_DB_PATH points to a valid, writable file location.\n` +
        `  Current AURA_DB_PATH: ${process.env['AURA_DB_PATH'] ?? '(not set, using default ./data/aura.db)'}`
      );
      throw error;
    }
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
