import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSocket } from '../../contexts/SocketContext';
import PresenceBubble from '../Presence/PresenceBubble';

const ROLE_LABELS = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  SUPERVISOR: 'Supervisor',
  REPRESENTATIVE: 'Representante',
};

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { presence } = useSocket();
  const myStatus = presence[user?.id]?.status || 'OFFLINE';

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 md:px-6
                       bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">GL</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">Flow</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-9 h-9 flex items-center justify-center rounded-lg
                     text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
                     transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* User info */}
        <div className="flex items-center gap-2">
          <PresenceBubble status={myStatus} size="lg" />
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-none">{user?.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ROLE_LABELS[user?.role]}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="btn-secondary text-xs px-3 py-1.5"
          title="Sair"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
      </div>
    </header>
  );
}
