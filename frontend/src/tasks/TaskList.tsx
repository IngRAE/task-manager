import { useState } from 'react';
import { getErrorMessage } from '../api/tasks';
import { NEXT_STATUS_ACTION, STATUS_LABELS, type StatusFilterValue, type Task, type TaskStatus } from './task';

type ChangeStatus = (id: number, status: TaskStatus) => Promise<unknown>;

interface TaskListProps {
  tasks: Task[];
  filter: StatusFilterValue;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onChangeStatus: ChangeStatus;
}

export function TaskList({ tasks, filter, isLoading, error, onRetry, onChangeStatus }: TaskListProps) {
  if (isLoading) {
    return (
      <div className="loading" role="status">
        <p className="loading-text">Cargando tareas…</p>
        {[1, 2, 3].map((row) => (
          <div key={row} className="skeleton" aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="notice notice-error" role="alert">
        <p>
          <strong>No se han podido cargar las tareas.</strong> {error}
        </p>
        <button type="button" className="button button-secondary button-small" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="empty-state">
        {filter === 'all'
          ? 'Todavía no hay tareas. Crea la primera con el formulario.'
          : `No hay tareas con estado «${STATUS_LABELS[filter]}».`}
      </p>
    );
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onChangeStatus={onChangeStatus} />
      ))}
    </ul>
  );
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

interface TaskItemProps {
  task: Task;
  onChangeStatus: ChangeStatus;
}

function TaskItem({ task, onChangeStatus }: TaskItemProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const action = NEXT_STATUS_ACTION[task.status];

  async function handleChangeStatus() {
    setIsSaving(true);
    setError(null);
    try {
      await onChangeStatus(task.id, action.status);
    } catch (changeError) {
      setError(getErrorMessage(changeError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <li className={`task task-${task.status}`}>
      <div className="task-main">
        <h3 className="task-title">{task.title}</h3>
        <p className="task-meta">
          <span>
            Responsable: <strong>{task.assignee}</strong>
          </span>
          <time dateTime={task.createdAt}>Creada el {dateFormatter.format(new Date(task.createdAt))}</time>
        </p>
        {error && (
          <p className="field-error" role="alert">
            No se ha podido cambiar el estado. {error}
          </p>
        )}
      </div>

      <div className="task-actions">
        <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={handleChangeStatus}
          disabled={isSaving}
          aria-label={isSaving ? undefined : `${action.label} «${task.title}»`}
        >
          {isSaving ? 'Guardando…' : action.label}
        </button>
      </div>
    </li>
  );
}
