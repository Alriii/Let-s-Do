import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { FullPageSpinner } from './components/ui/Feedback';
import { ToastProvider } from './components/ui/Toast';
import { useAuth, AuthProvider } from './stores/auth';
import { CompletedPage } from './pages/CompletedPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PendingPage } from './pages/PendingPage';
import { SignupPage } from './pages/SignupPage';
import { SignupSuccessPage } from './pages/SignupSuccessPage';
import { UpcomingPage } from './pages/UpcomingPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <FullPageSpinner />;
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <FullPageSpinner label="Checking your session…" />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/signup/success" element={<SignupSuccessPage />} />
                <Route path="/verify" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<ShellLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/upcoming" element={<UpcomingPage />} />
                  <Route path="/pending" element={<PendingPage />} />
                  <Route path="/completed" element={<CompletedPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
