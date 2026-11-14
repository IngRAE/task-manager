import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/tasks';
import { buildTask } from '../test/fixtures';
import type { Task } from './task';
import { TaskForm } from './TaskForm';

describe('TaskForm', () => {
  it('shows an error per required field and does not submit an empty form', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<TaskForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText('Título'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El responsable es obligatorio.')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Título')).toHaveFocus();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as the field becomes valid', async () => {
    const user = userEvent.setup();
    render(<TaskForm onCreate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));
    await user.type(screen.getByLabelText('Título'), 'Revisar la PR');

    expect(screen.queryByText('El título es obligatorio.')).not.toBeInTheDocument();
    expect(screen.getByText('El responsable es obligatorio.')).toBeInTheDocument();
  });

  it('sends trimmed values, resets the form and confirms the creation', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(buildTask({ title: 'Preparar la demo', status: 'in_progress' }));
    render(<TaskForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText('Título'), '  Preparar la demo ');
    await user.type(screen.getByLabelText('Responsable'), ' Ana ');
    await user.selectOptions(screen.getByLabelText('Estado inicial'), 'En curso');
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(onCreate).toHaveBeenCalledWith({ title: 'Preparar la demo', assignee: 'Ana', status: 'in_progress' });
    expect(await screen.findByText('Tarea «Preparar la demo» creada.')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('');
    expect(screen.getByLabelText('Responsable')).toHaveValue('');
  });

  it('locks the form while the task is being saved', async () => {
    const user = userEvent.setup();
    let finishCreation: (task: Task) => void = () => {};
    const onCreate = vi.fn(
      () =>
        new Promise<Task>((resolve) => {
          finishCreation = resolve;
        }),
    );
    render(<TaskForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText('Título'), 'Preparar la demo');
    await user.type(screen.getByLabelText('Responsable'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(screen.getByRole('button', { name: 'Creando…' })).toBeDisabled();
    await user.type(screen.getByLabelText('Título'), ' y algo más');
    expect(screen.getByLabelText('Título')).toHaveValue('Preparar la demo');

    await act(async () => finishCreation(buildTask()));

    expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeEnabled();
    expect(screen.getByLabelText('Título')).toHaveValue('');
    expect(screen.getByLabelText('Título')).toHaveFocus();
  });

  it('shows the errors returned by the API and keeps what the user typed', async () => {
    const user = userEvent.setup();
    const onCreate = vi
      .fn()
      .mockRejectedValue(
        new ApiError('Los datos enviados no son válidos.', 422, [
          { field: 'assignee', message: 'El responsable no puede superar los 60 caracteres.' },
        ]),
      );
    render(<TaskForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText('Título'), 'Escribir el README');
    await user.type(screen.getByLabelText('Responsable'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Los datos enviados no son válidos.');
    expect(screen.getByText('El responsable no puede superar los 60 caracteres.')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Escribir el README');
    expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeEnabled();
  });
});
