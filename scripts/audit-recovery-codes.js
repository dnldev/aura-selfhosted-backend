#!/usr/bin/env node

import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const databasePath = path.resolve(process.argv.includes('--db-path')
  ? process.argv[process.argv.indexOf('--db-path') + 1]
  : process.env.AURA_DB_PATH ?? './data/aura.db');

function generateRecoveryCode() {
  const bytes = randomBytes(6);
  const hex = bytes.toString('hex').toUpperCase();
  return `AURA-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

console.log(`\n🔍 Auditing recovery codes in: ${databasePath}\n`);

const database = new Database(databasePath);
database.pragma('journal_mode = WAL');

const usersWithoutCodes = database.prepare(
  'SELECT id, username, email FROM users WHERE recovery_code IS NULL',
).all();

console.log(`Total users without recovery codes: ${usersWithoutCodes.length}`);

if (usersWithoutCodes.length === 0) {
  console.log('✅ All users already have recovery codes. Nothing to do.\n');
  process.exit(0);
}

const updateStatement = database.prepare('UPDATE users SET recovery_code = ? WHERE id = ?');

const backfillTransaction = database.transaction(() => {
  for (const user of usersWithoutCodes) {
    const code = generateRecoveryCode();
    updateStatement.run(code, user.id);
    console.log(`  ✓ ${user.username} (${user.email ?? 'no email'}) → ${code}`);
  }
});

backfillTransaction();

console.log(`\n✅ Backfilled ${usersWithoutCodes.length} user(s) with recovery codes.\n`);

database.close();
