import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { AppLayout } from './components/AppLayout';
import { PublicLayout } from './components/PublicLayout';
import { Spinner } from './components/ui';

import Landing from './pages/Landing';
import PublicCatalog from './pages/PublicCatalog';
import Apply from './pages/Apply';
import ApplicationStatus from './pages/ApplicationStatus';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import CourseDetail from './pages/CourseDetail';
import Study from './pages/Study';
import Exam from './pages/Exam';
import Watch from './pages/Watch';
import Movies from './pages/Movies';
import Watchlist from './pages/Watchlist';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400">
      <Spinner size={28} />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <FullPageLoader />;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/catalog" element={<PublicCatalog />} />
            <Route path="/apply" element={<Apply />} />
            <Route path="/application-status" element={<ApplicationStatus />} />
            <Route
              path="/register"
              element={
                <RedirectIfAuthed>
                  <Register />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/login"
              element={
                <RedirectIfAuthed>
                  <Login />
                </RedirectIfAuthed>
              }
            />
          </Route>

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<Catalog />} />
            <Route path="courses/:slug" element={<CourseDetail />} />
            <Route path="study/:chapterId" element={<Study />} />
            <Route path="exam/:chapterId" element={<Exam />} />
            <Route path="watch/:sessionId" element={<Watch />} />
            <Route path="movies" element={<Movies />} />
            <Route path="watchlist" element={<Watchlist />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AlertProvider>
    </AuthProvider>
  );
}
