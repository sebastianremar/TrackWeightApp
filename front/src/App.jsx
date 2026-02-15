import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import AuthPage from './pages/Auth/AuthPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import HabitsPage from './pages/Habits/HabitsPage';
import TodosPage from './pages/Todos/TodosPage';
import FriendsPage from './pages/Friends/FriendsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import Spinner from './components/Spinner/Spinner';

const AdminPage = lazy(() => import('./pages/Admin/AdminPage'));

function AppRoutes() {
  const { user, loading } = useAuth();
  const { syncFromProfile } = useTheme();

  useEffect(() => {
    if (user) syncFromProfile(user);
  }, [user, syncFromProfile]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<AuthPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/weight" element={<DashboardPage />} />
        <Route path="/habits" element={<HabitsPage />} />
        <Route path="/todos" element={<TodosPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {user.isAdmin && (
          <Route path="/admin" element={<Suspense fallback={<Spinner size={32} />}><AdminPage /></Suspense>} />
        )}
      </Route>
      <Route path="*" element={<Navigate to="/weight" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </AuthProvider>
  );
}
