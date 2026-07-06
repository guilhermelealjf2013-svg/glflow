import { useState, useEffect } from 'react';
import axios from 'axios';

const ROLES = { ADMIN: 'Admin', MANAGER: 'Gerente', SUPERVISOR: 'Supervisor', REPRESENTATIVE: 'Representante' };
const WORKLOADS = { SIX_TWENTY: '06:20', EIGHT_TWELVE: '08:12' };

const EMPTY_FORM = {
  name: '', registration: '', username: '', password: '',
  role: 'REPRESENTATIVE', workload: 'EIGHT_TWELVE',
  loginTime: '08:00', logoutTime: '17:12', teamId: '',
  supervisorId: '',
  pauses: [
    { label: 'Pausa 1', startTime: '10:00', endTime: '10:15' },
    { label: 'Almoço',  startTime: '12:00', endTime: '13:00' },
    { label: 'Pausa 2', startTime: '15:00', endTime: '15:15' },
  ],
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [ttForm, setTtForm] = useState({ name: '', color: '#6366f1' });
  const [editId, setEditId] = useState(null);
  const [tab, setTab] = useState('users');

  useEffect(() => {
    Promise.all([
      axios.get('/api/users').then(r => setUsers(r.data)),
      axios.get('/api/task-types').then(r => setTaskTypes(r.data)),
    ]);
  }, []);

  async function saveUser(e) {
    e.preventDefault();
    try {
      if (editId) {
        const { data } = await axios.put(`/api/users/${editId}`, form);
        setUsers(prev => prev.map(u => u.id === editId ? data : u));
      } else {
        const { data } = await axios.post('/api/users', form);
        setUsers(prev => [...prev, data]);
      }
      setShowUserForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    }
  }

  async function deleteUser(id) {
    if (!confirm('Remover este usuário?')) return;
    await axios.delete(`/api/users/${id}`);
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  async function saveTaskType(e) {
    e.preventDefault();
    const { data } = await axios.post('/api/task-types', ttForm);
    setTaskTypes(prev => [...prev, data]);
    setTtForm({ name: '', color: '#6366f1' });
  }

  async function deleteTaskType(id) {
    if (!confirm('Remover este tipo?')) return;
    await axios.delete(`/api/task-types/${id}`);
    setTaskTypes(prev => prev.filter(t => t.id !== id));
  }

  function editUser(u) {
    setForm({ ...EMPTY_FORM, ...u, password: '' });
    setEditId(u.id);
    setShowUserForm(true);
  }

  function updatePause(i, field, val) {
    setForm(p => {
      const pauses = [...p.pauses];
      pauses[i] = { ...pauses[i], [field]: val };
      return { ...p, pauses };
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Administração</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {[['users', 'Usuários'], ['types', 'Tipos de Tarefa']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => { setShowUserForm(true); setEditId(null); setForm(EMPTY_FORM); }}>
              + Novo Usuário
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Nome', 'Matrícula', 'Usuário', 'Perfil', 'Supervisor', 'CH', 'Login', 'Logout', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono">{u.registration}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className="status-badge bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                        {ROLES[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {u.role === 'REPRESENTATIVE'
                        ? (users.find(s => s.id === u.supervisorId)?.name || <span className="text-red-400">Não atribuído</span>)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{WORKLOADS[u.workload] || '—'}</td>
                    <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-400">{u.loginTime || '—'}</td>
                    <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-400">{u.logoutTime || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="text-xs text-brand-600 hover:underline" onClick={() => editUser(u)}>Editar</button>
                        <button className="text-xs text-red-500 hover:underline" onClick={() => deleteUser(u.id)}>Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* User form modal */}
          {showUserForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUserForm(false)} />
              <div className="card relative z-10 w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  {editId ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <form onSubmit={saveUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="label">Nome Completo</label>
                      <input className="input" required value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Matrícula</label>
                      <input className="input" required value={form.registration}
                        onChange={e => setForm(p => ({ ...p, registration: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Usuário</label>
                      <input className="input" required value={form.username}
                        onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Senha {editId && '(deixe vazio para manter)'}</label>
                      <input className="input" type="password" value={form.password}
                        required={!editId}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Perfil</label>
                      <select className="input" value={form.role}
                        onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    {form.role === 'REPRESENTATIVE' && (
                      <>
                        {/* Supervisor */}
                        <div className="col-span-2">
                          <label className="label">Supervisor responsável</label>
                          <select className="input" value={form.supervisorId}
                            onChange={e => setForm(p => ({ ...p, supervisorId: e.target.value }))}
                            required>
                            <option value="">Selecione o supervisor…</option>
                            {users.filter(u => u.role === 'SUPERVISOR').map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="label">Carga Horária</label>
                          <select className="input" value={form.workload}
                            onChange={e => setForm(p => ({ ...p, workload: e.target.value }))}>
                            <option value="EIGHT_TWELVE">08:12</option>
                            <option value="SIX_TWENTY">06:20</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Horário de Login</label>
                          <input type="time" className="input" value={form.loginTime}
                            onChange={e => setForm(p => ({ ...p, loginTime: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">Horário de Logout</label>
                          <input type="time" className="input" value={form.logoutTime}
                            onChange={e => setForm(p => ({ ...p, logoutTime: e.target.value }))} />
                        </div>

                        {/* NR-17 Pauses */}
                        <div className="col-span-2">
                          <p className="label mb-2">Pausas NR-17</p>
                          <div className="space-y-2">
                            {form.pauses.map((pause, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input className="input w-28" value={pause.label}
                                  onChange={e => updatePause(i, 'label', e.target.value)} />
                                <input type="time" className="input w-28" value={pause.startTime}
                                  onChange={e => updatePause(i, 'startTime', e.target.value)} />
                                <span className="text-gray-400 text-sm">até</span>
                                <input type="time" className="input w-28" value={pause.endTime}
                                  onChange={e => updatePause(i, 'endTime', e.target.value)} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" className="btn-secondary" onClick={() => setShowUserForm(false)}>Cancelar</button>
                    <button type="submit" className="btn-primary">Salvar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task types tab */}
      {tab === 'types' && (
        <div className="space-y-4">
          <form onSubmit={saveTaskType} className="card p-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="label">Nome do Tipo</label>
              <input className="input" required placeholder="Ex: Atendimento" value={ttForm.name}
                onChange={e => setTtForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cor</label>
              <input type="color" className="h-10 w-16 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                value={ttForm.color}
                onChange={e => setTtForm(p => ({ ...p, color: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary">+ Adicionar</button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {taskTypes.map(t => (
              <div key={t.id} className="card p-4 flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{t.name}</span>
                <button className="text-xs text-red-500 hover:underline" onClick={() => deleteTaskType(t.id)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
