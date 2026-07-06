import { timeToPercent, durationPercent } from '../../utils/time';

export default function PauseBlock({ pause, startHour, totalHours }) {
  const left = timeToPercent(pause.startTime, startHour, totalHours);
  const width = durationPercent(pause.startTime, pause.endTime, totalHours);

  return (
    <div
      className="absolute top-1 bottom-1 rounded-md flex items-center justify-center
                 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300
                 text-xs font-medium select-none cursor-default overflow-hidden"
      style={{ left: `${left}%`, width: `${width}%` }}
      title={`${pause.label}: ${pause.startTime}–${pause.endTime} (NR-17)`}
    >
      <span className="truncate px-1">{pause.label}</span>
    </div>
  );
}
