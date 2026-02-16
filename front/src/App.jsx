import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import AuthPage from './pages/Auth/AuthPage';
import WellnessPage from './pages/Wellness/WellnessPage';
import PlannerPage from './pages/Planner/PlannerPage';
import FriendsPage from './pages/Friends/FriendsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import Spinner from './components/Spinner/Spinner';
import IntroCarousel from './components/IntroCarousel/IntroCarousel';

const AdminPage = lazy(() => import('./pages/Admin/AdminPage'));

function AppRoutes() {
  const { user, loading } = useAuth();
  const { syncFromProfile } = useTheme();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (user) syncFromProfile(user);
  }, [user, syncFromProfile]);

  useEffect(() => {
    if (user && user.hasSeenIntro !== true) setShowIntro(true);
  }, [user]);

  useEffect(() => {
    const handler = () => setShowIntro(true);
    window.addEventListener('show-intro', handler);
    return () => window.removeEventListener('show-intro', handler);
  }, []);

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
    <>
      {showIntro && <IntroCarousel onComplete={() => setShowIntro(false)} />}
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/wellness" element={<WellnessPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {user.isAdmin && (
            <Route path="/admin" element={<Suspense fallback={<Spinner size={32} />}><AdminPage /></Suspense>} />
          )}
        </Route>
        {/* Redirects from old routes */}
        <Route path="/weight" element={<Navigate to="/wellness" replace />} />
        <Route path="/workouts" element={<Navigate to="/wellness" replace />} />
        <Route path="/habits" element={<Navigate to="/planner" replace />} />
        <Route path="/calendar" element={<Navigate to="/planner" replace />} />
        <Route path="/todos" element={<Navigate to="/planner" replace />} />
        <Route path="*" element={<Navigate to="/wellness" replace />} />
      </Routes>
    </>
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
