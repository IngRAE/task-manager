import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { TASK_STATUSES } from './tasks/task.schemas.js';

const allowedStatuses = TASK_STATUSES.map((status) => `'${status}'`).join(', ');

const schema = `
  CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY,
    title      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (${allowedStatuses})),
    assignee   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);
`;

export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);
  db.exec(schema);
  return db;
}
