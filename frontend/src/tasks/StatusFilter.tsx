import type { StatusFilterValue } from './task';

const OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'done', label: 'Hechas' },
];

interface StatusFilterProps {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="filter" role="group" aria-label="Filtrar por estado">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="filter-option"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
