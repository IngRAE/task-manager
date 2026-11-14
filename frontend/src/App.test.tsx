import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { App } from './App';
import { buildTask, jsonResponse } from './test/fixtures';

const pendingTask = buildTask({ id: 1, title: 'Preparar la demo', status: 'pending' });
const doneTask = buildTask({ id: 2, title: 'Escribir el README', assignee: 'Luis', status: 'done' });

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
});

describe('App', () => {
  it('shows a loading state and then the tasks returned by the API', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [pendingTask, doneTask] }));
    render(<App />);

    expect(screen.getByText('Cargando tareas…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Preparar la demo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Escribir el README' })).toBeInTheDocument();
    expect(screen.queryByText('Cargando tareas…')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('shows an error with a retry button when the API cannot be reached', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ data: [pendingTask] }));
    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se han podido cargar las tareas.');
    expect(alert).toHaveTextContent('No se ha podido conectar con el servidor.');

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: 'Preparar la demo' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('asks the API for the tasks of the selected status', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [pendingTask, doneTask] }))
      .mockResolvedValueOnce(jsonResponse({ data: [doneTask] }));
    render(<App />);
    await screen.findByRole('heading', { name: 'Preparar la demo' });

    await user.click(screen.getByRole('button', { name: 'Hechas' }));

    expect(screen.getByRole('button', { name: 'Hechas' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('heading', { name: 'Escribir el README' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Preparar la demo' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tasks?status=done', expect.anything());
  });

  it('moves a task to the next status with its button', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [pendingTask] }))
      .mockResolvedValueOnce(jsonResponse({ data: { ...pendingTask, status: 'in_progress' } }));
    render(<App />);
    const item = await screen.findByRole('listitem');

    await user.click(within(item).getByRole('button', { name: 'Empezar «Preparar la demo»' }));

    expect(await within(item).findByText('En curso')).toBeInTheDocument();
    expect(within(item).getByRole('button', { name: 'Completar «Preparar la demo»' })).toBeEnabled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/tasks/1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'in_progress' }) }),
    );
  });

  it('keeps the task and explains the problem when the status change fails', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [pendingTask] }))
      .mockResolvedValueOnce(jsonResponse({ status: 404, detail: 'No existe ninguna tarea con id 1.' }, 404));
    render(<App />);
    const item = await screen.findByRole('listitem');

    await user.click(within(item).getByRole('button', { name: 'Empezar «Preparar la demo»' }));

    expect(await within(item).findByRole('alert')).toHaveTextContent('No existe ninguna tarea con id 1.');
    expect(within(item).getByText('Pendiente')).toBeInTheDocument();
  });

  it('adds a newly created task to the list', async () => {
    const user = userEvent.setup();
    const created = buildTask({ id: 3, title: 'Llamar al cliente', assignee: 'Marta' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] })).mockResolvedValueOnce(jsonResponse({ data: created }, 201));
    render(<App />);
    expect(await screen.findByText('Todavía no hay tareas. Crea la primera con el formulario.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Título'), 'Llamar al cliente');
    await user.type(screen.getByLabelText('Responsable'), 'Marta');
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByRole('heading', { name: 'Llamar al cliente' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/tasks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Llamar al cliente', assignee: 'Marta', status: 'pending' }),
      }),
    );
  });
});
