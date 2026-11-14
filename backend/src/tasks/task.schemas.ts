import { z } from 'zod';

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TITLE_MAX_LENGTH = 120;
export const ASSIGNEE_MAX_LENGTH = 60;

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  assignee: string;
  createdAt: string;
  updatedAt: string;
}

const statusSchema = z.enum(TASK_STATUSES, {
  error: (issue) =>
    issue.input === undefined
      ? 'El estado es obligatorio.'
      : `El estado debe ser uno de: ${TASK_STATUSES.join(', ')}.`,
});

function requiredText(label: string, maxLength: number) {
  return z
    .string({
      error: (issue) =>
        issue.input === undefined ? `${label} es obligatorio.` : `${label} debe ser un texto.`,
    })
    .trim()
    .min(1, { error: `${label} es obligatorio.` })
    .max(maxLength, { error: `${label} no puede superar los ${maxLength} caracteres.` });
}

const bodyMustBeAnObject = { error: 'El cuerpo de la petición debe ser un objeto JSON.' };

export const createTaskSchema = z.strictObject(
  {
    title: requiredText('El título', TITLE_MAX_LENGTH),
    assignee: requiredText('El responsable', ASSIGNEE_MAX_LENGTH),
    status: statusSchema.default('pending'),
  },
  bodyMustBeAnObject,
);

export const updateTaskSchema = z.strictObject({ status: statusSchema }, bodyMustBeAnObject);

export const listTasksQuerySchema = z.object({ status: statusSchema.optional() });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
