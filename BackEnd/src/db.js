const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbFile = process.env.DB_FILE || "./data/database.sqlite";
const absolutePath = path.resolve(dbFile);

fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

const db = new Database(absolutePath);
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    due_time TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM'
      CHECK(priority IN ('LOW','MEDIUM','HIGH')),
    status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK(status IN ('PENDING','COMPLETED','CANCELLED')),
    reminder_minutes INTEGER,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
`);

module.exports = db;
