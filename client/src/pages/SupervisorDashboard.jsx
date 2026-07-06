import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TimelineGrid from '../components/Timeline/TimelineGrid';
import TaskFormModal from '../components/UI/TaskFormModal';
import BulkTaskModal from '../components/UI/BulkTaskModal';
import PresenceBubble from '../components/Presence/PresenceBubble';
import SupervisorAlertBox from '../components/UI/SupervisorAlertBox';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { todayISO } from '../utils/time';

const STATUS_LABELS = { ONLINE: 'Online', AWAY: 'Ausente', OFFLINE: 'Offline' };
const STATUS_ORDER = ['ONLINE', 'AWAY', 'OFFLINE'];

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const { presence, onTaskChanged } = useSocket();
  const [date, setDate] = useState(todayISO());
  const [representatives, setRepresentatives] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pauses, setPauses] = useState({});
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | task object (edit)
  const [bulkModal, setBulkModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, tasksRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get(`/api/tasks?date=${date}`),
      ]);
      const reps = usersRes.data.filter(u => u.role === 'REPRESENTATIVE');
      setRepresentatives(reps);

      const pauseResults = await Promise.all(
        reps.map(r => axios.get(`/api/users/${r.id}`).then(res => ({ id: r.id, pauses: res.data.pauses || [] })))
      );
      const pauseMap = {};
      pauseResults.forEach(({ id, pauses: p }) => { pauseMap[id] = p.filter(x => x.isTemplate); });
      setPauses(pauseMap);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const off = onTaskChanged(({ taskId, status }) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    });
    return off;
  }, [onTaskChanged]);

  async function handleStatusChange(taskId, status) {
    try {
      const { data } = await axios.patch(`/api/tasks/${taskId}/status`, { status });
      setTasks(prev => prev.map(t => t.id === taskId ? data : t));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar status');
    }
  }

  async function handleDeleteTask(taskId) {
    if (!confirm('Remover esta tarefa?')) return;
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover tarefa');
    }
  }

  function handleTaskSaved(task) {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = task;
        return next;
      }
      return [...prev, task];
    });
    setTaskModal(null);
  }

  function handleBulkSaved(newTasks) {
    setTasks(prev => [...prev, ...newTasks]);
  }

  // Group tasks by representative
  const tasksByRep = {};
  tasks.forEach(t => {
    if (!tasksByRep[t.representativeId]) tasksByRep[t.representativeId] = [];
    tasksByRep[t.representativeId].push(t);
  });

  // Presence summary
  const presenceCounts = { ONLINE: 0, AWAY: 0, OFFLINE: 0 };
  representatives.forEach(r => {
    const s = presence[r.id]?.status || 'OFFLINE';
    presenceCounts[s] = (presenceCounts[s] || 0) + 1;
  });

  const formattedDate = format(new Date(date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const canReactivate = ['ADMIN', 'SUPERVISOR'].includes(user?.role);

  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* Title + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Painel do Supervisor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-0.5">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input w-auto"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button className="btn-secondary" onClick={fetchData} title="Atualizar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
          <button className="btn-secondary" onClick={() => setBulkModal(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Em Massa
          </button>
          <button className="btn-primary" onClick={() => setTaskModal('new')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Representantes', value: representatives.length, color: 'text-brand-600' },
          { label: 'Tarefas do dia',  value: tasks.length,                                    color: 'text-blue-600' },
          { label: 'Em andamento',    value: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: 'text-yellow-600' },
          { label: 'Concluídas',      value: tasks.filter(t => t.status === 'COMPLETED').length,   color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Presence panel */}
      {representatives.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Presença da Equipe</h2>
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              {STATUS_ORDER.map(s => (
                <span key={s} className="flex items-center gap-1">
                  <PresenceBubble status={s} />
                  {presenceCounts[s]} {STATUS_LABELS[s]}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {representatives
              .slice()
              .sort((a, b) => {
                const order = { ONLINE: 0, AWAY: 1, OFFLINE: 2 };
                return order[presence[a.id]?.status || 'OFFLINE'] - order[presence[b.id]?.status || 'OFFLINE'];
              })
              .map(rep => {
                const status = presence[rep.id]?.status || 'OFFLINE';
                return (
                  <div
                    key={rep.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                               bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <PresenceBubble status={status} />
                    <span className="font-medium">{rep.name}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-400">{STATUS_LABELS[status]}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Alert box */}
      <SupervisorAlertBox tasks={tasks} representatives={representatives} date={date} />

      {/* Timeline */}
      {loading ? (
        <div className="card flex items-center justify-center h-48">
          <div className="text-sm text-gray-400 animate-pulse">Carregando timeline…</div>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <TimelineGrid
            representatives={representatives}
            tasksByRep={tasksByRep}
            pausesByRep={pauses}
            canEdit={true}
            canReactivate={canReactivate}
            onStatusChange={handleStatusChange}
            onEditTask={task => setTaskModal(task)}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-600 justify-center">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-400 opacity-80 inline-block" /> Não iniciado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-yellow-400 ring-1 ring-yellow-400 inline-block" /> Em andamento
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-500 opacity-60 inline-block" /> Concluído
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600 inline-block" /> Pausa NR-17
        </span>
        <span className="flex items-center gap-1">
          <span className="w-0.5 h-3 bg-red-500 inline-block" /> Hora atual
        </span>
      </div>

      {/* Task form modal */}
      {taskModal !== null && (
        <TaskFormModal
          representatives={representatives}
          date={date}
          editTask={taskModal === 'new' ? null : taskModal}
          onSave={handleTaskSaved}
          onClose={() => setTaskModal(null)}
        />
      )}

      {/* Bulk task modal */}
      {bulkModal && (
        <BulkTaskModal
          representatives={representatives}
          date={date}
          onSave={handleBulkSaved}
          onClose={() => setBulkModal(false)}
        />
      )}
    </div>
  );
}
