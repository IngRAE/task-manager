import type { NewTask, Task, TaskStatus } from '../tasks/task';

export interface FieldError {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldError[];

  constructor(message: string, status: number, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const TASKS_URL = '/api/tasks';

export function listTasks(status?: TaskStatus, signal?: AbortSignal): Promise<Task[]> {
  const url = status ? `${TASKS_URL}?${new URLSearchParams({ status })}` : TASKS_URL;
  return request<Task[]>(url, { signal });
}

export function createTask(task: NewTask): Promise<Task> {
  return request<Task>(TASKS_URL, { method: 'POST', body: JSON.stringify(task) });
}

export function updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  return request<Task>(`${TASKS_URL}/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.';
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (error) {
    if (init.signal?.aborted) {
      throw error;
    }
    throw new ApiError('No se ha podido conectar con el servidor. Comprueba que la API está en marcha.', 0);
  }

  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw toApiError(response.status, body);
  }
  if (!hasData<T>(body)) {
    throw new ApiError('El servidor ha devuelto una respuesta inesperada.', response.status);
  }
  return body.data;
}

function toApiError(status: number, body: unknown): ApiError {
  if (isProblemDetails(body)) {
    return new ApiError(body.detail, status, body.errors ?? []);
  }
  if (status >= 500) {
    return new ApiError('El servidor no está disponible ahora mismo. Inténtalo de nuevo en unos segundos.', status);
  }
  return new ApiError(`La petición ha fallado (HTTP ${status}).`, status);
}

function isProblemDetails(body: unknown): body is { detail: string; errors?: FieldError[] } {
  return typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string';
}

function hasData<T>(body: unknown): body is { data: T } {
  return typeof body === 'object' && body !== null && 'data' in body;
}
