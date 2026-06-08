import Database from 'better-sqlite3';
import path from 'path';

// Store DB in the root of the project
const dbPath = path.resolve(process.cwd(), 'canary.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    id TEXT PRIMARY KEY,
    token_name TEXT NOT NULL,
    memo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    token_id TEXT,
    attacker_ip TEXT,
    user_agent TEXT,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(token_id) REFERENCES tokens(id) ON DELETE CASCADE
  );
`);

export default db;
