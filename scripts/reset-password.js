

import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const { hashSync } = require('bcryptjs');

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.error('Usage: node scripts/reset-password.js <username> <new_password>');
  console.error('Example: node scripts/reset-password.js alice mynewpassword123');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error('Error: New password must be at least 8 characters.');
  process.exit(1);
}

const databasePath = process.env['AURA_DB_PATH'] ?? path.resolve('./data/aura.db');

console.log(`Opening database at: ${databasePath}`);
const database = new Database(databasePath);

const user = database
  .prepare('SELECT id, username, display_name FROM users WHERE username = ?')
  .get(username);

if (!user) {
  console.error(`Error: User '${username}' not found in the database.`);
  process.exit(1);
}

const passwordHash = hashSync(newPassword, 12);

database
  .prepare('UPDATE users SET password_hash = ?, recovery_code = NULL WHERE id = ?')
  .run(passwordHash, user.id);

console.log(`Password successfully reset for user '${user.display_name || user.username}'.`);
console.log('Recovery code has been cleared -- a new one will be offered on next login.');
console.log('The user can now sign in with the new password.');

database.close();
