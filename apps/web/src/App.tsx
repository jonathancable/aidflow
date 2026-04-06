import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@lib/query-client';
import { useAuthStore } from '@stores/auth.store';

// Layouts (stubs for now — filled in S5)
const AuthLayout  = () => <div>Auth layout placeholder</div>;
const AdminLayout = () => <div>Admin layout placeholder</div>;
const DonorLayout = () => <div>Donor layout placeholder</div>;
const NGOLayout   = () => <div>NGO layout placeholder</div>;

// Pages (stubs)
const LoginPage   = () => <div>Login</div>;
const NotFound    = () => <div>404</div>;

function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<AuthLayout />} />
          <Route path="/dashboard" element={
            <AuthGuard><div>Dashboard (role-based — S5)</div></AuthGuard>
          }/>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
