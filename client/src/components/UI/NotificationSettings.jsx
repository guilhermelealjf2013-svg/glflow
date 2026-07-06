import { useState } from 'react';
import { loadNotifSettings, saveNotifSettings } from '../../hooks/useTaskNotifications';

const PLACEHOLDERS = [
  { var: '{tarefa}',  desc: 'Nome da tarefa' },
  { var: '{minutos}', desc: 'Minutos restantes (só no aviso)' },
  { var: '{s}',       desc: 'Plural de "minuto" (só no aviso)' },
];

export default function NotificationSettings({ onClose }) {
  const [form, setForm] = useState(loadNotifSettings());
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    saveNotifSettings(form);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  }

  function resetDefaults() {
    const defaults = {
      warningMsg: 'Atenção! A tarefa "{tarefa}" começa em {minutos} minuto{s}.',
      startMsg:   'A tarefa "{tarefa}" está começando agora!',
    };
    setForm(defaults);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="card w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Configurar Notificações
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Personalize as mensagens dos alertas sonoros</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5">

          {/* Variables reference */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Variáveis disponíveis
            </p>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS.map(p => (
                <span key={p.var}
                  className="flex items-center gap-1.5 text-xs bg-white dark:bg-gray-700
                             border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1">
                  <code className="text-brand-600 dark:text-brand-400 font-mono font-semibold">{p.var}</code>
                  <span className="text-gray-400">— {p.desc}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Warning message */}
          <div>
            <label className="label flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
              Mensagem de aviso (1–5 min antes)
            </label>
            <textarea
              className="input resize-none font-mono text-sm"
              rows={3}
              value={form.warningMsg}
              onChange={e => setForm(f => ({ ...f, warningMsg: e.target.value }))}
              required
            />
            {/* Preview */}
            <p className="text-xs text-gray-400 mt-1 italic">
              Preview: {form.warningMsg
                .replace('{tarefa}', 'Atendimento')
                .replace('{minutos}', '3')
                .replace('{s}', 's')}
            </p>
          </div>

          {/* Start message */}
          <div>
            <label className="label flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block" />
              Mensagem de início (hora exata)
            </label>
            <textarea
              className="input resize-none font-mono text-sm"
              rows={3}
              value={form.startMsg}
              onChange={e => setForm(f => ({ ...f, startMsg: e.target.value }))}
              required
            />
            <p className="text-xs text-gray-400 mt-1 italic">
              Preview: {form.startMsg.replace('{tarefa}', 'Atendimento')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={resetDefaults}
              className="btn-secondary text-xs px-3">
              Restaurar padrão
            </button>
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">
              {saved ? '✓ Salvo!' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
