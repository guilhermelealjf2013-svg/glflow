import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TimelineGrid from '../components/Timeline/TimelineGrid';
import PresenceBubble from '../components/Presence/PresenceBubble';
import NotificationContainer from '../components/UI/NotificationToast';
import NotificationSettings from '../components/UI/NotificationSettings';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityMonitor } from '../hooks/useActivityMonitor';
import { useTaskNotifications } from '../hooks/useTaskNotifications';
import { todayISO } from '../utils/time';

const STATUS_LABELS = { ONLINE: 'Online', AWAY: 'Ausente', OFFLINE: 'Offline' };
const WORKLOAD_LABELS = { SIX_TWENTY: '6h20', EIGHT_TWELVE: '8h12' };

const TASK_STATUS_STYLES = {
  NOT_STARTED: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  IN_PROGRESS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  COMPLETED:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const TASK_STATUS_LABELS = {
  NOT_STARTED: 'Não iniciado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED:   'Concluído',
};

export default function RepresentativeDashboard() {
  const { user } = useAuth();
  const { presence, emitTaskChanged } = useSocket();
  useActivityMonitor();

  const [date] = useState(todayISO());
  const [tasks, setTasks] = useState([]);
  const [pauses, setPauses] = useState({});
  const [loading, setLoading] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const notifCounter = useRef(0);

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [...prev, { ...notif, id: ++notifCounter.current }]);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useTaskNotifications(tasks, addNotification);

  const myStatus = presence[user?.id]?.status || 'OFFLINE';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, userRes] = await Promise.all([
        axios.get(`/api/tasks?date=${date}`),
        axios.get(`/api/users/${user.id}`),
      ]);
      setTasks(tasksRes.data);
      setPauses({ [user.id]: (userRes.data.pauses || []).filter(p => p.isTemplate) });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date, user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleStatusChange(taskId, status) {
    try {
      const { data } = await axios.patch(`/api/tasks/${taskId}/status`, { status });
      setTasks(prev => prev.map(t => t.id === taskId ? data : t));
      emitTaskChanged({
        taskId,
        status,
        taskTitle: data.title,
        repId: user.id,
        repName: user.name,
        startTime: data.startTime,
        endTime: data.endTime,
        changedAt: new Date().toISOString(),
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar status');
    }
  }

  const formattedDate = format(new Date(date + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const sortedTasks = [...tasks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Task happening right now based on clock, regardless of stored status
  const nowHHMM = (() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  })();
  // Only show "Em Andamento Agora" when the clock is inside a task's window
  const inProgress = sortedTasks.find(t =>
    t.status !== 'COMPLETED' && t.startTime <= nowHHMM && nowHHMM < t.endTime
  );

  // Next task = closest upcoming not-yet-completed task by start time
  const nextTask = sortedTasks.find(t =>
    t.status !== 'COMPLETED' && t.startTime > nowHHMM
  );

  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* Identity + status card */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          {/* Avatar / presence */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
              <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5">
              <PresenceBubble status={myStatus} size="lg" />
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{user.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Matrícula {user.registration}
              {user.workload && (
                <> · CH {WORKLOAD_LABELS[user.workload] || user.workload}</>
              )}
              <> · <span className={myStatus === 'ONLINE' ? 'text-green-500' : myStatus === 'AWAY' ? 'text-yellow-500' : 'text-gray-400'}>
                {STATUS_LABELS[myStatus]}
              </span></>
            </p>
          </div>

          {/* Horário + notif settings */}
          <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifSettings(true)}
                title="Configurar notificações"
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400
                           hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{formattedDate}</p>
            </div>
            {user.loginTime && (
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 font-mono">
                {user.loginTime} – {user.logoutTime}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total de tarefas', value: tasks.length,                                         color: 'text-gray-700 dark:text-gray-300' },
          { label: 'Em andamento',     value: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Concluídas',       value: tasks.filter(t => t.status === 'COMPLETED').length,   color: 'text-green-600 dark:text-green-400' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* In-progress highlight */}
      {inProgress && (
        <div className="card p-4 border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
          <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-1">
            Em andamento agora
          </p>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: inProgress.type?.color || '#6366f1' }}
            />
            <span className="font-medium text-gray-800 dark:text-gray-100">{inProgress.title}</span>
            <span className="text-sm text-gray-400 ml-auto font-mono">
              {inProgress.startTime} – {inProgress.endTime}
            </span>
          </div>
        </div>
      )}

      {/* Next task highlight */}
      {!inProgress && nextTask && (
        <div className="card p-4 border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/10">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
            Próxima tarefa
          </p>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: nextTask.type?.color || '#6366f1' }}
            />
            <span className="font-medium text-gray-800 dark:text-gray-100">{nextTask.title}</span>
            <span className="text-sm text-gray-400 ml-auto font-mono">
              {nextTask.startTime} – {nextTask.endTime}
            </span>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="card flex items-center justify-center h-40">
          <div className="text-sm text-gray-400 animate-pulse">Carregando sua régua…</div>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <TimelineGrid
            representatives={[{ id: user.id, name: user.name, registration: user.registration }]}
            tasksByRep={{ [user.id]: tasks }}
            pausesByRep={pauses}
            canEdit={true}
            canReactivate={false}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/* Task list (collapsible) */}
      {tasks.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setListOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50
                       transition-colors"
          >
            <span>Tarefas do dia ({tasks.length})</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${listOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {listOpen && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {sortedTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: task.type?.color || '#6366f1' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{task.title}</p>
                    {task.type && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{task.type.name}</p>
                    )}
                  </div>
                  <span className="text-xs font-mono text-gray-400 shrink-0">
                    {task.startTime} – {task.endTime}
                  </span>
                  <span className={`status-badge ${TASK_STATUS_STYLES[task.status]} shrink-0`}>
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
        Clique em uma tarefa no timeline para avançar seu status. Tarefas concluídas só podem ser reabertas pelo supervisor.
      </p>

      {/* Notification toasts */}
      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />

      {/* Notification settings modal */}
      {showNotifSettings && (
        <NotificationSettings onClose={() => setShowNotifSettings(false)} />
      )}
    </div>
  );
}
