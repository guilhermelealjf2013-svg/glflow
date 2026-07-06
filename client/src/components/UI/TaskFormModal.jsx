import { useState, useEffect } from 'react';
import axios from 'axios';

export default function TaskFormModal({ representatives, date, onSave, onClose, editTask = null }) {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    representativeId: editTask?.representativeId || (representatives[0]?.id ?? ''),
    typeId: editTask?.typeId || '',
    title: editTask?.title || '',
    date: editTask?.date || date,
    startTime: editTask?.startTime || '',
    endTime: editTask?.endTime || '',
    notes: editTask?.notes || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/api/task-types').then(r => setTypes(r.data)).catch(() => {});
  }, []);

  // Auto-fill title from type selection
  function handleTypeChange(typeId) {
    const t = types.find(x => x.id === typeId);
    setForm(f => ({ ...f, typeId, title: f.title || (t?.name ?? '') }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editTask) {
        const { data } = await axios.put(`/api/tasks/${editTask.id}`, form);
        onSave(data);
      } else {
        const { data } = await axios.post('/api/tasks', form);
        onSave(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar tarefa');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {editTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Representative */}
          <div>
            <label className="label">Representante</label>
            <select
              className="input"
              value={form.representativeId}
              onChange={e => setForm(f => ({ ...f, representativeId: e.target.value }))}
              required
            >
              <option value="">Selecione…</option>
              {representatives.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Type + Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                value={form.typeId}
                onChange={e => handleTypeChange(e.target.value)}
                required
              >
                <option value="">Tipo…</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Título</label>
              <input
                className="input"
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Título da tarefa"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="label">Data</label>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Início</label>
              <input
                className="input"
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Fim</label>
              <input
                className="input"
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Observações <span className="text-gray-400">(opcional)</span></label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Detalhes adicionais…"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                            px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Salvando…' : (editTask ? 'Salvar alterações' : 'Criar tarefa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
