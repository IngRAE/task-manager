import { STATUS_CODES } from 'node:http';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import type { z } from 'zod';

export interface FieldError {
  field?: string;
  message: string;
}

export class HttpError extends Error {
  readonly status: number;
  readonly errors: FieldError[] | undefined;

  constructor(status: number, message: string, errors?: FieldError[]) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.errors = errors;
  }
}

/** Responds with an RFC 9457 "problem details" body. */
export function sendProblem(res: Response, status: number, detail: string, errors?: FieldError[]): void {
  res
    .status(status)
    .type('application/problem+json')
    .json({ type: 'about:blank', title: STATUS_CODES[status] ?? 'Error', status, detail, ...(errors && { errors }) });
}

export function validate<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  status: 400 | 422,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const detail =
    status === 422 ? 'Los datos enviados no son válidos.' : 'Los parámetros de la petición no son válidos.';
  throw new HttpError(status, detail, toFieldErrors(result.error));
}

function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.flatMap((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({ field: key, message: 'Este campo no está permitido.' }));
    }

    const field = issue.path.map(String).join('.');
    return [field ? { field, message: issue.message } : { message: issue.message }];
  });
}

export const requireJsonBody: RequestHandler = (req, _res, next) => {
  if (!req.is('application/json')) {
    throw new HttpError(415, 'El cuerpo de la petición debe enviarse como application/json.');
  }
  next();
};

export const notFoundHandler: RequestHandler = (req) => {
  throw new HttpError(404, `No existe la ruta ${req.method} ${req.path}.`);
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    sendProblem(res, error.status, error.message, error.errors);
    return;
  }

  if (isBodyParserError(error)) {
    const detail =
      error.type === 'entity.parse.failed'
        ? 'El cuerpo de la petición no es un JSON válido.'
        : (STATUS_CODES[error.status] ?? 'Petición no válida.');
    sendProblem(res, error.status, detail);
    return;
  }

  console.error(error);
  sendProblem(res, 500, 'Ha ocurrido un error inesperado.');
};

function isBodyParserError(error: unknown): error is { status: number; type: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  );
}
