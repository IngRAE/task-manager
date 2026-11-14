import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db.js';
import type { Task } from '../src/tasks/task.schemas.js';

let db: DatabaseSync;
let api: ReturnType<typeof request>;

beforeEach(() => {
  db = openDatabase(':memory:');
  api = request(createApp(db));
});

afterEach(() => {
  db.close();
});

async function createTask(body: Record<string, unknown>): Promise<Task> {
  const response = await api.post('/api/tasks').send(body).expect(201);
  return response.body.data;
}

describe('POST /api/tasks', () => {
  it('creates a pending task with trimmed values and returns its location', async () => {
    const response = await api.post('/api/tasks').send({ title: '  Preparar la demo  ', assignee: ' Ana ' });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      id: expect.any(Number),
      title: 'Preparar la demo',
      assignee: 'Ana',
      status: 'pending',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(response.headers.location).toBe(`/api/tasks/${response.body.data.id}`);
  });

  it('returns 422 with one error per invalid field', async () => {
    const response = await api
      .post('/api/tasks')
      .send({ title: '   ', assignee: 42, status: 'archived', priority: 'high' });

    expect(response.status).toBe(422);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.body).toMatchObject({ status: 422, detail: 'Los datos enviados no son válidos.' });
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'title', message: 'El título es obligatorio.' },
        { field: 'assignee', message: 'El responsable debe ser un texto.' },
        { field: 'status', message: 'El estado debe ser uno de: pending, in_progress, done.' },
        { field: 'priority', message: 'Este campo no está permitido.' },
      ]),
    );
  });

  it('rejects a title longer than 120 characters', async () => {
    const response = await api.post('/api/tasks').send({ title: 'x'.repeat(121), assignee: 'Ana' });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([
      { field: 'title', message: 'El título no puede superar los 120 caracteres.' },
    ]);
  });

  it('returns 400 when the body is malformed JSON', async () => {
    const response = await api.post('/api/tasks').set('Content-Type', 'application/json').send('{"title": ');

    expect(response.status).toBe(400);
    expect(response.body.detail).toBe('El cuerpo de la petición no es un JSON válido.');
  });

  it('returns 415 when the body is not JSON', async () => {
    const response = await api.post('/api/tasks').type('form').send('title=Hola&assignee=Ana');

    expect(response.status).toBe(415);
  });
});

describe('GET /api/tasks', () => {
  it('lists tasks newest first and filters them by status', async () => {
    const first = await createTask({ title: 'Primera', assignee: 'Ana' });
    const second = await createTask({ title: 'Segunda', assignee: 'Luis', status: 'done' });
    const third = await createTask({ title: 'Tercera', assignee: 'Ana' });

    const all = await api.get('/api/tasks').expect(200);
    expect(all.body.data.map((task: Task) => task.id)).toEqual([third.id, second.id, first.id]);

    const pending = await api.get('/api/tasks').query({ status: 'pending' }).expect(200);
    expect(pending.body.data.map((task: Task) => task.title)).toEqual(['Tercera', 'Primera']);

    const inProgress = await api.get('/api/tasks').query({ status: 'in_progress' }).expect(200);
    expect(inProgress.body.data).toEqual([]);
  });

  it('returns 400 for an unknown status filter', async () => {
    const response = await api.get('/api/tasks').query({ status: 'archived' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      { field: 'status', message: 'El estado debe ser uno de: pending, in_progress, done.' },
    ]);
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('changes the status of a task', async () => {
    const task = await createTask({ title: 'Revisar la PR', assignee: 'Ana' });

    const response = await api.patch(`/api/tasks/${task.id}`).send({ status: 'in_progress' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: task.id, title: 'Revisar la PR', status: 'in_progress' });
    const stored = await api.get(`/api/tasks/${task.id}`).expect(200);
    expect(stored.body.data.status).toBe('in_progress');
  });

  it('returns 404 when the task does not exist', async () => {
    const response = await api.patch('/api/tasks/999').send({ status: 'done' });

    expect(response.status).toBe(404);
    expect(response.body.detail).toBe('No existe ninguna tarea con id 999.');
  });

  it('returns 400 for an id that is not a positive integer', async () => {
    for (const id of ['abc', '0', '-1', '1.5']) {
      const response = await api.patch(`/api/tasks/${id}`).send({ status: 'done' });
      expect(response.status, `id "${id}"`).toBe(400);
    }
  });

  it('returns 422 for a missing or invalid status and for fields other than status', async () => {
    const task = await createTask({ title: 'Escribir el README', assignee: 'Ana' });

    const missing = await api.patch(`/api/tasks/${task.id}`).send({});
    expect(missing.status).toBe(422);
    expect(missing.body.errors).toEqual([{ field: 'status', message: 'El estado es obligatorio.' }]);

    const invalid = await api.patch(`/api/tasks/${task.id}`).send({ status: 'archived' });
    expect(invalid.status).toBe(422);

    const extraField = await api.patch(`/api/tasks/${task.id}`).send({ status: 'done', title: 'Otro' });
    expect(extraField.status).toBe(422);
    expect(extraField.body.errors).toEqual([{ field: 'title', message: 'Este campo no está permitido.' }]);
  });
});

it('answers unknown routes with a 404 problem', async () => {
  const response = await api.get('/api/unknown');

  expect(response.status).toBe(404);
  expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(response.body).toMatchObject({ type: 'about:blank', title: 'Not Found', status: 404 });
});
