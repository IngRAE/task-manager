import type { TaskStatus } from './task';

export const TITLE_MAX_LENGTH = 120;
export const ASSIGNEE_MAX_LENGTH = 60;

export interface TaskFormValues {
  title: string;
  assignee: string;
  status: TaskStatus;
}

export type TaskFormErrors = Partial<Record<keyof TaskFormValues, string>>;

export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};

  const titleError = validateRequiredText(values.title, 'El título', TITLE_MAX_LENGTH);
  if (titleError) {
    errors.title = titleError;
  }

  const assigneeError = validateRequiredText(values.assignee, 'El responsable', ASSIGNEE_MAX_LENGTH);
  if (assigneeError) {
    errors.assignee = assigneeError;
  }

  return errors;
}

export function hasErrors(errors: TaskFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function validateRequiredText(value: string, label: string, maxLength: number): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return `${label} es obligatorio.`;
  }
  if (trimmed.length > maxLength) {
    return `${label} no puede superar los ${maxLength} caracteres.`;
  }
  return undefined;
}
