import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ROLE_ROUTES = {
    ADMIN: '/admin',
    MANAGER: '/manager',
    SUPERVISOR: '/supervisor',
    REPRESENTATIVE: '/rep',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const profile = await login(form.username, form.password);
      navigate(ROLE_ROUTES[profile.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 w-9 h-9 flex items-center justify-center rounded-lg
                   text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-bold">GL</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Flow</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestão de Régua de Trabalho</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
            Organizando seu trabalho, impulsionando resultados.
          </p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-lg">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Entrar na plataforma</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="username">Usuário</label>
              <input
                id="username"
                type="text"
                className="input"
                placeholder="seu.usuario"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                              px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          GLFlow © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
