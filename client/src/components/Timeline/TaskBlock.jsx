import { useState } from 'react';
import { timeToPercent, durationPercent } from '../../utils/time';
import ConfirmModal from '../UI/ConfirmModal';

const STATUS_STYLES = {
  NOT_STARTED: 'opacity-80 brightness-90',
  IN_PROGRESS:  '',   // handled via task-block-active class
  COMPLETED:    'opacity-60',
};

const STATUS_LABELS = {
  NOT_STARTED: 'Não Iniciado',
  IN_PROGRESS:  'Em Andamento',
  COMPLETED:    'Concluído',
};

const STATUS_NEXT = {
  NOT_STARTED: 'IN_PROGRESS',
  IN_PROGRESS:  'COMPLETED',
  COMPLETED:    null,
};

export default function TaskBlock({ task, startHour, totalHours, canEdit, canReactivate, onStatusChange, onEdit, onDelete }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const left = timeToPercent(task.startTime, startHour, totalHours);
  const width = durationPercent(task.startTime, task.endTime, totalHours);

  const isActive = task.status === 'IN_PROGRESS';
  const nextStatus = STATUS_NEXT[task.status];
  // Supervisor can reactivate a completed task back to NOT_STARTED
  const reactivating = task.status === 'COMPLETED' && canReactivate;
  const targetStatus = reactivating ? 'NOT_STARTED' : nextStatus;
  const clickable = canEdit && (nextStatus || reactivating);

  function handleClick(e) {
    e.stopPropagation();
    if (menuOpen) { setMenuOpen(false); return; }
    if (!clickable) return;
    setConfirmOpen(true);
  }

  function handleConfirm() {
    onStatusChange(task.id, targetStatus);
    setConfirmOpen(false);
  }

  function handleMenuClick(e) {
    e.stopPropagation();
    setMenuOpen(o => !o);
  }

  return (
    <>
      <div
        className={`${isActive ? 'task-block-active' : `task-block ${STATUS_STYLES[task.status]}`} group ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
        style={{
          left: `${left}%`,
          width: `${width}%`,
          backgroundColor: task.type?.color || '#6366f1',
          '--task-color': task.type?.color || '#6366f1',
        }}
        title={`${task.title} — ${task.startTime}–${task.endTime} (${STATUS_LABELS[task.status]})`}
        onClick={handleClick}
      >
        {isActive ? (
          <span className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 animate-pulse shrink-0" />
            <span className="truncate font-semibold">{task.title}</span>
            <span className="ml-auto shrink-0 text-white/70 text-xs font-mono hidden sm:block">
              {task.startTime}–{task.endTime}
            </span>
          </span>
        ) : (
          <span className="truncate flex-1">{task.title}</span>
        )}
        {task.status === 'COMPLETED' && (
          <span className="ml-1 shrink-0 text-xs">✓</span>
        )}
        {reactivating && (
          <span className="ml-1 shrink-0 text-xs opacity-70">↺</span>
        )}

        {/* Supervisor context menu button */}
        {(onEdit || onDelete) && (
          <button
            onClick={handleMenuClick}
            className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center
                       justify-center rounded hover:bg-black/20 transition-opacity"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        )}

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            className="absolute top-full right-0 mt-1 z-50 min-w-[130px] rounded-lg bg-white dark:bg-gray-800
                       border border-gray-200 dark:border-gray-700 shadow-lg py-1"
            onClick={e => e.stopPropagation()}
          >
            {onEdit && (
              <button
                onClick={() => { setMenuOpen(false); onEdit(task); }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200
                           hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Editar
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => { setMenuOpen(false); onDelete(task.id); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400
                           hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Remover
              </button>
            )}
          </div>
        )}
      </div>

      {confirmOpen && (
        <ConfirmModal
          title={reactivating ? 'Reativar tarefa' : 'Alterar status da tarefa'}
          message={
            reactivating ? (
              <span>Deseja reativar <strong>{task.title}</strong> para <strong>Não Iniciado</strong>?</span>
            ) : (
              <span>
                Deseja alterar <strong>{task.title}</strong> para{' '}
                <strong>{STATUS_LABELS[targetStatus]}</strong>?
              </span>
            )
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
