import { useState, useEffect } from 'react';

const TYPE_CONFIG = {
  warning: {
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    bar:  'bg-yellow-400',
    bg:   'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon_color: 'text-yellow-500',
  },
  start: {
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bar:  'bg-brand-500',
    bg:   'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    icon_color: 'text-brand-500',
  },
};

// Individual toast
function Toast({ notif, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const cfg = TYPE_CONFIG[notif.type];
  const DURATION = notif.type === 'start' ? 15000 : 10000;

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true));

    // Progress bar countdown
    const step = 100 / (DURATION / 100);
    const pid = setInterval(() => {
      setProgress(p => {
        if (p - step <= 0) { clearInterval(pid); return 0; }
        return p - step;
      });
    }, 100);

    // Auto-dismiss
    const tid = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(notif.id), 350);
    }, DURATION);

    return () => { clearInterval(pid); clearTimeout(tid); };
  }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(() => onDismiss(notif.id), 350);
  }

  return (
    <div
      className={`
        w-80 rounded-xl border shadow-xl overflow-hidden
        transition-all duration-350 ease-out
        ${cfg.bg}
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      {/* Color bar top */}
      <div className={`h-1 ${cfg.bar}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon with task color dot */}
          <div className="relative mt-0.5">
            <span className={cfg.icon_color}>{cfg.icon}</span>
            {notif.task?.type?.color && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900"
                style={{ backgroundColor: notif.task.type.color }}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${cfg.text} opacity-70`}>
              {notif.type === 'start' ? 'Início de tarefa' : `${notif.minutesBefore} min para iniciar`}
            </p>
            <p className={`text-sm font-medium leading-snug ${cfg.text}`}>
              {notif.message}
            </p>
            {notif.task && (
              <p className="text-xs mt-1 opacity-60 font-mono" style={{ color: notif.task.type?.color }}>
                {notif.task.startTime} – {notif.task.endTime}
              </p>
            )}
          </div>

          {/* Close */}
          <button
            onClick={dismiss}
            className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full
                        opacity-50 hover:opacity-100 transition-opacity ${cfg.text}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar bottom */}
      <div className="h-0.5 bg-black/10 dark:bg-white/10">
        <div
          className={`h-full ${cfg.bar} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Container — renders all active toasts
export default function NotificationContainer({ notifications, onDismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 items-end pointer-events-none">
      {notifications.map(n => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notif={n} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
