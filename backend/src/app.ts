import express, { type Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { errorHandler, notFoundHandler } from './http/problem.js';
import { TaskRepository } from './tasks/task.repository.js';
import { createTaskRouter } from './tasks/task.routes.js';

export function createApp(db: DatabaseSync): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/tasks', createTaskRouter(new TaskRepository(db)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
