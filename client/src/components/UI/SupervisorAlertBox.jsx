import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function timeToMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

let _idCounter = 0;
function uid() { return ++_idCounter; }

// ── Alert item ────────────────────────────────────────────────────────────────
function AlertItem({ alert, onDismiss }) {
  const isCompleted = alert.type === 'completed';

  return (
    <div className={`
      flex items-start gap-3 px-4 py-3 rounded-xl border transition-all
      ${isCompleted
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}
    `}>
      {/* Icon */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5
        ${isCompleted ? 'bg-green-100 dark:bg-green-800/50' : 'bg-red-100 dark:bg-red-800/50'}`}>
        {isCompleted ? (
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold uppercase tracking-wide mb-0.5
          ${isCompleted ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
          {isCompleted ? 'Tarefa Concluída' : `Atrasada ${alert.minutesLate} min`}
        </p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
          {alert.taskTitle}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {alert.repName}
          <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {alert.startTime}–{alert.endTime}
          <span className="ml-auto font-mono">{alert.receivedAt}</span>
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(alert.id)}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full
                   text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                   hover:bg-black/5 dark:hover:bg-white/10 transition-colors mt-0.5"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SupervisorAlertBox({ tasks, representatives, date }) {
  const { onTaskChanged } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const overdueTracked = useRef(new Set()); // taskIds already alerted as overdue

  const repMap = Object.fromEntries((representatives || []).map(r => [r.id, r.name]));

  const addAlert = useCallback((alert) => {
    setAlerts(prev => [alert, ...prev].slice(0, 50)); // max 50 alerts
  }, []);

  // ── Listen for real-time task completions via socket ──────────────────────
  useEffect(() => {
    const off = onTaskChanged((payload) => {
      if (payload.status !== 'COMPLETED') return;
      addAlert({
        id: uid(),
        type: 'completed',
        taskId: payload.taskId,
        taskTitle: payload.taskTitle || 'Tarefa',
        repName: payload.repName || repMap[payload.repId] || 'Representante',
        startTime: payload.startTime || '—',
        endTime: payload.endTime || '—',
        receivedAt: fmtTime(payload.changedAt || new Date().toISOString()),
      });
    });
    return off;
  }, [onTaskChanged, addAlert, repMap]);

  // ── Poll every 60s for overdue tasks ─────────────────────────────────────
  const checkOverdue = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (date !== today) return; // only check today's tasks

    const now = nowMinutes();
    tasks.forEach(task => {
      if (task.status === 'COMPLETED') return;
      if (overdueTracked.current.has(task.id)) return;

      const endMin = timeToMin(task.endTime);
      const minutesLate = now - endMin;
      if (minutesLate <= 0) return;

      overdueTracked.current.add(task.id);
      addAlert({
        id: uid(),
        type: 'overdue',
        taskId: task.id,
        taskTitle: task.title,
        repName: repMap[task.representativeId] || 'Representante',
        startTime: task.startTime,
        endTime: task.endTime,
        minutesLate,
        receivedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
    });
  }, [tasks, date, addAlert, repMap]);

  // Reset overdue tracking when tasks or date changes
  useEffect(() => {
    overdueTracked.current = new Set();
    checkOverdue();
  }, [tasks, date]);

  useEffect(() => {
    const id = setInterval(checkOverdue, 60_000);
    return () => clearInterval(id);
  }, [checkOverdue]);

  const dismissAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const unreadCount = alerts.length;
  const overdueCount = alerts.filter(a => a.type === 'overdue').length;
  const completedCount = alerts.filter(a => a.type === 'completed').length;

  return (
    <div className={`card overflow-hidden transition-all ${overdueCount > 0 ? 'ring-1 ring-red-300 dark:ring-red-800' : ''}`}>

      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {/* Bell icon */}
        <div className={`relative shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
          ${overdueCount > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
          <svg className={`w-4 h-4 ${overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white
                             text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        {/* Title + summary */}
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Alertas da Equipe
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {unreadCount === 0
              ? 'Nenhuma ocorrência no momento'
              : `${overdueCount > 0 ? `${overdueCount} atrasada${overdueCount > 1 ? 's' : ''}` : ''}${overdueCount > 0 && completedCount > 0 ? ' · ' : ''}${completedCount > 0 ? `${completedCount} concluída${completedCount > 1 ? 's' : ''}` : ''}`}
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2 shrink-0">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                             bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
            </span>
          )}
          {completedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                             bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
              ✓ {completedCount}
            </span>
          )}
          {unreadCount > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setAlerts([]); overdueTracked.current = new Set(); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         underline underline-offset-2 transition-colors"
            >
              Limpar
            </button>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Alert list */}
      {!collapsed && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-600">Tudo em ordem por aqui</p>
              <p className="text-xs text-gray-300 dark:text-gray-700 mt-0.5">
                Alertas aparecerão quando uma tarefa for concluída ou atrasar
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
              {alerts.map(alert => (
                <AlertItem key={alert.id} alert={alert} onDismiss={dismissAlert} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
