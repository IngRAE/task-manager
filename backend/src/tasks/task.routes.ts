import { Router } from 'express';
import { HttpError, requireJsonBody, validate } from '../http/problem.js';
import type { TaskRepository } from './task.repository.js';
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from './task.schemas.js';

export function createTaskRouter(tasks: TaskRepository): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const { status } = validate(listTasksQuerySchema, req.query, 400);
    res.json({ data: tasks.list(status) });
  });

  router.post('/', requireJsonBody, (req, res) => {
    const task = tasks.create(validate(createTaskSchema, req.body, 422));
    res.status(201).location(`${req.baseUrl}/${task.id}`).json({ data: task });
  });

  router.get('/:id', (req, res) => {
    const id = parseTaskId(req.params.id);
    const task = tasks.findById(id);
    if (!task) {
      throw taskNotFound(id);
    }
    res.json({ data: task });
  });

  router.patch('/:id', requireJsonBody, (req, res) => {
    const id = parseTaskId(req.params.id);
    const { status } = validate(updateTaskSchema, req.body, 422);
    const task = tasks.updateStatus(id, status);
    if (!task) {
      throw taskNotFound(id);
    }
    res.json({ data: task });
  });

  return router;
}

function parseTaskId(value: unknown): number {
  const id = Number(value);
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw new HttpError(400, 'El id de la tarea debe ser un número entero positivo.');
  }
  return id;
}

function taskNotFound(id: number): HttpError {
  return new HttpError(404, `No existe ninguna tarea con id ${id}.`);
}
