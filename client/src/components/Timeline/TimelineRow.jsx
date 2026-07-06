import { useState, useEffect } from 'react';
import TaskBlock from './TaskBlock';
import PauseBlock from './PauseBlock';
import PresenceBubble from '../Presence/PresenceBubble';
import { useSocket } from '../../contexts/SocketContext';
import { timeToPercent } from '../../utils/time';

function useNowPercent(startHour, totalHours) {
  const calc = () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return timeToPercent(hhmm, startHour, totalHours);
  };
  const [pct, setPct] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setPct(calc()), 30_000);
    return () => clearInterval(id);
  }, [startHour, totalHours]);
  return pct;
}

export default function TimelineRow({
  representative, tasks, pauses,
  startHour, totalHours,
  canEdit, canReactivate,
  onStatusChange, onEditTask, onDeleteTask,
}) {
  const { presence } = useSocket();
  const userPresence = presence[representative.id];
  const nowPct = useNowPercent(startHour, totalHours);

  return (
    <div className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
      {/* Label column */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
        style={{ width: 'var(--timeline-label-width)', height: 'var(--timeline-row-height)' }}
      >
        <PresenceBubble status={userPresence?.status || 'OFFLINE'} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{representative.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{representative.registration}</p>
        </div>
      </div>

      {/* Timeline track */}
      <div className="relative flex-1" style={{ height: 'var(--timeline-row-height)' }}>
        {/* Hour grid lines */}
        {Array.from({ length: totalHours }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-r border-gray-100 dark:border-gray-800"
            style={{ left: `${((i + 1) / totalHours) * 100}%` }}
          />
        ))}

        {/* Current time needle */}
        {nowPct >= 0 && nowPct <= 100 && (
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none"
            style={{ left: `${nowPct}%` }}
          >
            <div className="absolute inset-y-0 w-px bg-red-500 opacity-70" />
            <div className="absolute -top-0.5 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
          </div>
        )}

        {/* Pause blocks (NR-17) */}
        {pauses.map(p => (
          <PauseBlock key={p.id} pause={p} startHour={startHour} totalHours={totalHours} />
        ))}

        {/* Task blocks */}
        {tasks.map(t => (
          <TaskBlock
            key={t.id}
            task={t}
            startHour={startHour}
            totalHours={totalHours}
            canEdit={canEdit}
            canReactivate={canReactivate}
            onStatusChange={onStatusChange}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  );
}
