import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import Header from './components/Layout/Header';
import Login from './pages/Login';
import SupervisorDashboard from './pages/SupervisorDashboard';
import RepresentativeDashboard from './pages/RepresentativeDashboard';
import AdminDashboard from './pages/AdminDashboard';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="max-w-screen-2xl mx-auto">{children}</main>
    </div>
  );
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map = {
    ADMIN: '/admin',
    MANAGER: '/manager',
    SUPERVISOR: '/supervisor',
    REPRESENTATIVE: '/rep',
  };
  return <Navigate to={map[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={<RoleRedirect />} />

              <Route path="/admin" element={
                <RequireAuth roles={['ADMIN']}>
                  <AppLayout><AdminDashboard /></AppLayout>
                </RequireAuth>
              } />

              <Route path="/supervisor" element={
                <RequireAuth roles={['ADMIN', 'SUPERVISOR']}>
                  <AppLayout><SupervisorDashboard /></AppLayout>
                </RequireAuth>
              } />

              <Route path="/manager" element={
                <RequireAuth roles={['ADMIN', 'MANAGER']}>
                  <AppLayout><SupervisorDashboard /></AppLayout>
                </RequireAuth>
              } />

              <Route path="/rep" element={
                <RequireAuth roles={['REPRESENTATIVE']}>
                  <AppLayout><RepresentativeDashboard /></AppLayout>
                </RequireAuth>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
