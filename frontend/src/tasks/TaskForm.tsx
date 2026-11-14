import { useRef, useState, type FormEvent } from 'react';
import { ApiError, getErrorMessage, type FieldError } from '../api/tasks';
import { STATUS_LABELS, TASK_STATUSES, type NewTask, type Task, type TaskStatus } from './task';
import { hasErrors, validateTaskForm, type TaskFormErrors, type TaskFormValues } from './validation';

const EMPTY_FORM: TaskFormValues = { title: '', assignee: '', status: 'pending' };

interface TaskFormProps {
  onCreate: (task: NewTask) => Promise<Task>;
}

export function TaskForm({ onCreate }: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdTitle, setCreatedTitle] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const assigneeInput = useRef<HTMLInputElement>(null);

  function updateField<Field extends keyof TaskFormValues>(field: Field, value: TaskFormValues[Field]) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (errors[field]) {
      setErrors({ ...errors, [field]: validateTaskForm(nextValues)[field] });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setCreatedTitle(null);

    const validationErrors = validateTaskForm(values);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) {
      (validationErrors.title ? titleInput : assigneeInput).current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const task = await onCreate({
        title: values.title.trim(),
        assignee: values.assignee.trim(),
        status: values.status,
      });
      setValues(EMPTY_FORM);
      setCreatedTitle(task.title);
      titleInput.current?.focus();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(toFormErrors(error.fieldErrors));
      }
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
      <div className="field">
        <label htmlFor="task-title">Título</label>
        <input
          ref={titleInput}
          id="task-title"
          name="title"
          autoComplete="off"
          placeholder="Ej.: Preparar la demo del viernes"
          required
          readOnly={isSubmitting}
          value={values.title}
          onChange={(event) => updateField('title', event.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'task-title-error' : undefined}
        />
        {errors.title && (
          <p id="task-title-error" className="field-error">
            {errors.title}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="task-assignee">Responsable</label>
        <input
          ref={assigneeInput}
          id="task-assignee"
          name="assignee"
          autoComplete="off"
          placeholder="Ej.: Ana García"
          required
          readOnly={isSubmitting}
          value={values.assignee}
          onChange={(event) => updateField('assignee', event.target.value)}
          aria-invalid={Boolean(errors.assignee)}
          aria-describedby={errors.assignee ? 'task-assignee-error' : undefined}
        />
        {errors.assignee && (
          <p id="task-assignee-error" className="field-error">
            {errors.assignee}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="task-status">Estado inicial</label>
        <select
          id="task-status"
          name="status"
          disabled={isSubmitting}
          value={values.status}
          onChange={(event) => updateField('status', event.target.value as TaskStatus)}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {submitError && (
        <p role="alert" className="notice notice-error">
          {submitError}
        </p>
      )}

      <button type="submit" className="button button-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Creando…' : 'Crear tarea'}
      </button>

      <p role="status" className="form-status">
        {createdTitle && `Tarea «${createdTitle}» creada.`}
      </p>
    </form>
  );
}

function toFormErrors(fieldErrors: FieldError[]): TaskFormErrors {
  const formErrors: TaskFormErrors = {};
  for (const { field, message } of fieldErrors) {
    if (field === 'title' || field === 'assignee' || field === 'status') {
      formErrors[field] ??= message;
    }
  }
  return formErrors;
}
