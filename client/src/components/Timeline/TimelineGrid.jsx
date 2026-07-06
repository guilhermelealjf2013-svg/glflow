import { buildHourLabels } from '../../utils/time';
import TimelineRow from './TimelineRow';

const START_HOUR = 6;
const END_HOUR = 17;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export default function TimelineGrid({
  representatives, tasksByRep, pausesByRep,
  canEdit, canReactivate,
  onStatusChange, onEditTask, onDeleteTask,
}) {
  const labels = buildHourLabels(START_HOUR, END_HOUR - 1);

  return (
    <div className="card overflow-hidden" style={{ minWidth: `calc(var(--timeline-label-width) + ${TOTAL_HOURS} * 100px)` }}>
      {/* Header: hour labels */}
      <div className="flex border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
        <div
          className="shrink-0 border-r border-gray-200 dark:border-gray-700 flex items-center px-3"
          style={{ width: 'var(--timeline-label-width)', height: '36px' }}
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Representante</span>
        </div>
        <div className="relative flex-1 flex" style={{ height: '36px' }}>
          {labels.map((label, i) => (
            <div
              key={label}
              className="absolute flex items-center justify-start pl-1"
              style={{
                left: `${(i / TOTAL_HOURS) * 100}%`,
                width: `${(1 / TOTAL_HOURS) * 100}%`,
                height: '100%',
              }}
            >
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current time indicator */}
      <CurrentTimeIndicator startHour={START_HOUR} totalHours={TOTAL_HOURS} />

      {/* Rows */}
      <div className="overflow-x-auto">
        {representatives.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-600 text-sm">
            Nenhum representante encontrado
          </div>
        ) : (
          representatives.map(rep => (
            <TimelineRow
              key={rep.id}
              representative={rep}
              tasks={tasksByRep[rep.id] || []}
              pauses={pausesByRep[rep.id] || []}
              startHour={START_HOUR}
              totalHours={TOTAL_HOURS}
              canEdit={canEdit}
              canReactivate={canReactivate}
              onStatusChange={onStatusChange}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CurrentTimeIndicator({ startHour, totalHours }) {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() - startHour * 60;
  const pct = (mins / (totalHours * 60)) * 100;
  if (pct < 0 || pct > 100) return null;

  return (
    <div
      className="absolute z-20 top-9 bottom-0 w-0.5 bg-red-500 pointer-events-none"
      style={{ left: `calc(var(--timeline-label-width) + ${pct}% * (100% - var(--timeline-label-width)) / 100)` }}
    >
      <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
    </div>
  );
}
