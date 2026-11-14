import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/tasks';
import { matchesFilter, type NewTask, type StatusFilterValue, type Task, type TaskStatus } from './task';

interface LoadedTasks {
  requestKey: string;
  filter: StatusFilterValue;
  tasks: Task[];
  error: string | null;
}

export interface UseTasksResult {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  createTask: (task: NewTask) => Promise<Task>;
  changeStatus: (id: number, status: TaskStatus) => Promise<Task>;
}

/**
 * Loads the tasks for the selected filter. Each load is identified by a request key, so the
 * list counts as loading until the response for the current key arrives; responses of
 * superseded requests are aborted and never shown.
 */
export function useTasks(filter: StatusFilterValue): UseTasksResult {
  const [reloadCount, setReloadCount] = useState(0);
  const [loaded, setLoaded] = useState<LoadedTasks | null>(null);
  const requestKey = `${filter}#${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();

    api.listTasks(filter === 'all' ? undefined : filter, controller.signal).then(
      (tasks) => {
        if (!controller.signal.aborted) {
          setLoaded({ requestKey, filter, tasks, error: null });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({ requestKey, filter, tasks: [], error: api.getErrorMessage(error) });
        }
      },
    );

    return () => controller.abort();
  }, [filter, requestKey]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  const createTask = useCallback(async (input: NewTask) => {
    const created = await api.createTask(input);
    setLoaded(
      (current) =>
        current && {
          ...current,
          tasks: matchesFilter(created, current.filter) ? [created, ...current.tasks] : current.tasks,
        },
    );
    return created;
  }, []);

  const changeStatus = useCallback(async (id: number, status: TaskStatus) => {
    const updated = await api.updateTaskStatus(id, status);
    setLoaded(
      (current) =>
        current && {
          ...current,
          tasks: matchesFilter(updated, current.filter)
            ? current.tasks.map((task) => (task.id === updated.id ? updated : task))
            : current.tasks.filter((task) => task.id !== updated.id),
        },
    );
    return updated;
  }, []);

  const current = loaded?.requestKey === requestKey ? loaded : null;

  return {
    tasks: current?.tasks ?? [],
    isLoading: current === null,
    error: current?.error ?? null,
    reload,
    createTask,
    changeStatus,
  };
}
