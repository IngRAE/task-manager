export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type StatusFilterValue = TaskStatus | 'all';

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  assignee: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewTask {
  title: string;
  assignee: string;
  status: TaskStatus;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecha',
};

export const NEXT_STATUS_ACTION: Record<TaskStatus, { status: TaskStatus; label: string }> = {
  pending: { status: 'in_progress', label: 'Empezar' },
  in_progress: { status: 'done', label: 'Completar' },
  done: { status: 'pending', label: 'Reabrir' },
};

export function matchesFilter(task: Task, filter: StatusFilterValue): boolean {
  return filter === 'all' || task.status === filter;
}
