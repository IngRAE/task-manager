import { useState } from 'react';
import { StatusFilter } from './tasks/StatusFilter';
import type { StatusFilterValue } from './tasks/task';
import { TaskForm } from './tasks/TaskForm';
import { TaskList } from './tasks/TaskList';
import { useTasks } from './tasks/useTasks';

export function App() {
  const [filter, setFilter] = useState<StatusFilterValue>('all');
  const { tasks, isLoading, error, reload, createTask, changeStatus } = useTasks(filter);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Gestor de tareas</h1>
        <p>Crea tareas, asígnalas a alguien y sigue en qué estado está cada una.</p>
      </header>

      <main className="layout">
        <section className="panel" aria-labelledby="new-task-heading">
          <h2 id="new-task-heading">Nueva tarea</h2>
          <TaskForm onCreate={createTask} />
        </section>

        <section className="panel" aria-labelledby="task-list-heading">
          <div className="panel-header">
            <h2 id="task-list-heading">Tareas</h2>
            <StatusFilter value={filter} onChange={setFilter} />
          </div>
          <TaskList
            tasks={tasks}
            filter={filter}
            isLoading={isLoading}
            error={error}
            onRetry={reload}
            onChangeStatus={changeStatus}
          />
        </section>
      </main>
    </div>
  );
}
