import type { DatabaseSync, StatementSync } from 'node:sqlite';
import type { CreateTaskInput, Task, TaskStatus } from './task.schemas.js';

const COLUMNS = 'id, title, status, assignee, created_at AS createdAt, updated_at AS updatedAt';
const NEWEST_FIRST = 'ORDER BY created_at DESC, id DESC';

export class TaskRepository {
  readonly #insert: StatementSync;
  readonly #findById: StatementSync;
  readonly #listAll: StatementSync;
  readonly #listByStatus: StatementSync;
  readonly #updateStatus: StatementSync;

  constructor(db: DatabaseSync) {
    this.#insert = db.prepare(
      `INSERT INTO tasks (title, status, assignee) VALUES (:title, :status, :assignee) RETURNING ${COLUMNS}`,
    );
    this.#findById = db.prepare(`SELECT ${COLUMNS} FROM tasks WHERE id = ?`);
    this.#listAll = db.prepare(`SELECT ${COLUMNS} FROM tasks ${NEWEST_FIRST}`);
    this.#listByStatus = db.prepare(`SELECT ${COLUMNS} FROM tasks WHERE status = ? ${NEWEST_FIRST}`);
    this.#updateStatus = db.prepare(
      `UPDATE tasks
          SET status = :status, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = :id
    RETURNING ${COLUMNS}`,
    );
  }

  list(status?: TaskStatus): Task[] {
    const rows = status ? this.#listByStatus.all(status) : this.#listAll.all();
    return rows.map(toTask);
  }

  findById(id: number): Task | undefined {
    const row = this.#findById.get(id);
    return row && toTask(row);
  }

  create({ title, status, assignee }: CreateTaskInput): Task {
    const row = this.#insert.get({ title, status, assignee });
    if (!row) {
      throw new Error('The INSERT statement did not return the new task');
    }
    return toTask(row);
  }

  updateStatus(id: number, status: TaskStatus): Task | undefined {
    const row = this.#updateStatus.get({ id, status });
    return row && toTask(row);
  }
}

function toTask(row: Record<string, unknown>): Task {
  return {
    id: Number(row.id),
    title: String(row.title),
    status: row.status as TaskStatus,
    assignee: String(row.assignee),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}
