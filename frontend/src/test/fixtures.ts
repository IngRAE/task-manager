import type { Task } from '../tasks/task';

export function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Preparar la demo',
    assignee: 'Ana',
    status: 'pending',
    createdAt: '2026-11-14T09:30:00.000Z',
    updatedAt: '2026-11-14T09:30:00.000Z',
    ...overrides,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });
}
