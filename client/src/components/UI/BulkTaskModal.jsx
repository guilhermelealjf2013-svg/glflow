import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         getDay, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import axios from 'axios';

// ── Mini multi-date calendar ──────────────────────────────────────────────────
function MultiDatePicker({ selectedDates, onChange }) {
  const [cursor, setCursor] = useState(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd   = endOfMonth(cursor);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // leading blank cells so week starts on Sunday
  const leadingBlanks = Array(getDay(monthStart)).fill(null);

  function toggleDay(iso) {
    const next = new Set(selectedDates);
    next.has(iso) ? next.delete(iso) : next.add(iso);
    onChange(next);
  }

  const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCursor(d => subMonths(d, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
          {format(cursor, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button
          type="button"
          onClick={() => setCursor(d => addMonths(d, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {leadingBlanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(day => {
          const iso = format(day, 'yyyy-MM-dd');
          const picked = selectedDates.has(iso);
          const today  = isToday(day);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => toggleDay(iso)}
              className={`
                h-8 w-full rounded-md text-xs font-medium transition-colors
                ${picked
                  ? 'bg-brand-600 text-white'
                  : today
                    ? 'border border-brand-400 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Selected count */}
      {selectedDates.size > 0 && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {selectedDates.size} data{selectedDates.size > 1 ? 's' : ''} selecionada{selectedDates.size > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="text-xs text-red-500 hover:underline"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function BulkTaskModal({ representatives, date, onSave, onClose }) {
  const [types, setTypes]         = useState([]);
  const [selected, setSelected]   = useState(new Set(representatives.map(r => r.id)));
  const [selectedDates, setSelectedDates] = useState(new Set([date]));
  const [form, setForm]           = useState({ typeId: '', startTime: '', endTime: '', notes: '' });
  const [results, setResults]     = useState(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    axios.get('/api/task-types').then(r => setTypes(r.data)).catch(() => {});
  }, []);

  function toggleRep(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      selected.size === representatives.length
        ? new Set()
        : new Set(representatives.map(r => r.id))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (selected.size === 0 || selectedDates.size === 0) return;

    const typeName = types.find(t => t.id === form.typeId)?.name ?? '';
    const reps  = representatives.filter(r => selected.has(r.id));
    const dates = [...selectedDates].sort();

    setSaving(true);
    setResults(null);

    const ok = [], failed = [];

    // For each date × each rep
    await Promise.all(
      dates.flatMap(d =>
        reps.map(async rep => {
          try {
            const { data } = await axios.post('/api/tasks', {
              ...form,
              title: typeName,
              date: d,
              representativeId: rep.id,
            });
            ok.push({ rep, date: d, task: data });
          } catch (err) {
            failed.push({ rep, date: d, error: err.response?.data?.error || 'Erro desconhecido' });
          }
        })
      )
    );

    setResults({ ok, failed });
    setSaving(false);
    if (ok.length > 0) onSave(ok.map(x => x.task));
  }

  const allSelected  = selected.size === representatives.length;
  const noneSelected = selected.size === 0;
  const noDates      = selectedDates.size === 0;
  const totalJobs    = selected.size * selectedDates.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="card w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Tarefa em Massa</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Cria a mesma tarefa para múltiplos representantes em múltiplas datas
            </p>
          </div>
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

        <div className="overflow-y-auto flex-1">
          {results ? (
            /* Result screen */
            <div className="p-5 space-y-4">
              {results.ok.length > 0 && (
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                    ✓ {results.ok.length} tarefa{results.ok.length !== 1 ? 's' : ''} criada{results.ok.length !== 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                    {results.ok.map(({ rep, date: d }, i) => (
                      <li key={i} className="text-xs text-green-600 dark:text-green-500">
                        • {rep.name} — {format(new Date(d + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results.failed.length > 0 && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                    ✗ {results.failed.length} falha{results.failed.length !== 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                    {results.failed.map(({ rep, date: d, error }, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-500">
                        • {rep.name} — {format(new Date(d + 'T12:00:00'), "dd/MM", { locale: ptBR })} — {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <form id="bulk-form" onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* Two-column layout: reps left, calendar right */}
              <div className="grid grid-cols-2 gap-4">

                {/* Representatives */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Representantes</label>
                    <button type="button" onClick={toggleAll}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                      {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700
                                  divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                    {representatives.map(rep => (
                      <label key={rep.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer
                                   hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <input type="checkbox" checked={selected.has(rep.id)}
                          onChange={() => toggleRep(rep.id)}
                          className="w-4 h-4 rounded accent-brand-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{rep.name}</p>
                          <p className="text-xs text-gray-400">Mat. {rep.registration}</p>
                        </div>
                        {selected.has(rep.id) && (
                          <span className="text-xs text-brand-600 dark:text-brand-400">✓</span>
                        )}
                      </label>
                    ))}
                  </div>
                  {noneSelected && (
                    <p className="text-xs text-red-500 mt-1">Selecione ao menos um representante.</p>
                  )}
                </div>

                {/* Calendar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Datas</label>
                    {selectedDates.size > 0 && (
                      <span className="text-xs text-brand-600 dark:text-brand-400">
                        {selectedDates.size} selecionada{selectedDates.size !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <MultiDatePicker selectedDates={selectedDates} onChange={setSelectedDates} />
                  {noDates && (
                    <p className="text-xs text-red-500 mt-1">Selecione ao menos uma data.</p>
                  )}
                </div>
              </div>

              {/* Task fields */}
              <div className="space-y-3">
                {/* Type (full width) */}
                <div>
                  <label className="label">Tipo de Tarefa</label>
                  <select className="input" value={form.typeId}
                    onChange={e => setForm(f => ({ ...f, typeId: e.target.value }))} required>
                    <option value="">Selecione o tipo…</option>
                    {types.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {form.typeId && (
                    <p className="text-xs text-gray-400 mt-1">
                      Título da tarefa: <strong className="text-gray-600 dark:text-gray-300">
                        {types.find(t => t.id === form.typeId)?.name}
                      </strong>
                    </p>
                  )}
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Início</label>
                    <input className="input" type="time" value={form.startTime}
                      onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Fim</label>
                    <input className="input" type="time" value={form.endTime}
                      onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} required />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="label">Observações <span className="text-gray-400">(opcional)</span></label>
                  <textarea className="input resize-none" rows={2} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Detalhes adicionais…" />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          {results ? (
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary flex-1 justify-center">Fechar</button>
              {results.failed.length > 0 && (
                <button onClick={() => setResults(null)} className="btn-primary flex-1 justify-center">
                  Tentar novamente
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                Cancelar
              </button>
              <button type="submit" form="bulk-form"
                className="btn-primary flex-1 justify-center"
                disabled={saving || noneSelected || noDates}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Criando {totalJobs} tarefas…
                  </span>
                ) : (
                  <>
                    Criar {totalJobs > 0 ? `${totalJobs} tarefa${totalJobs !== 1 ? 's' : ''}` : 'tarefas'}
                    {totalJobs > 0 && (
                      <span className="ml-1 text-xs opacity-70">
                        ({selected.size} rep × {selectedDates.size} data{selectedDates.size !== 1 ? 's' : ''})
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
