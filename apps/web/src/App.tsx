// apps/web/src/App.tsx — complete shell
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@lib/query-client";
import { useAuthStore } from "@stores/auth.store";
import { Suspense, lazy } from "react";

// Lazy-load role layouts — code-split at the layout boundary
const AdminLayout = lazy(() => import("@features/layouts/AdminLayout"));
const DonorLayout = lazy(() => import("@features/layouts/DonorLayout"));
const ControllerLayout = lazy(
  () => import("@features/layouts/ControllerLayout"),
);
const NGOLayout = lazy(() => import("@features/layouts/NGOLayout"));
const VendorLayout = lazy(() => import("@features/layouts/VendorLayout"));
const LoginPage = lazy(() => import("@pages/auth/LoginPage"));

// Guards
function AuthGuard() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RoleGuard({ allowedRoles }: { allowedRoles: string[] }) {
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role ?? "")) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RoleRouter() {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return <Navigate to="/login" replace />;
  switch (role) {
    case "system_admin":
      return <Navigate to="/admin/dashboard" replace />;
    case "system_controller":
      return <Navigate to="/controller/dashboard" replace />;
    case "donor":
      return <Navigate to="/donor/dashboard" replace />;
    case "ngo":
      return <Navigate to="/ngo/programs" replace />;
    case "vendor":
      return <Navigate to="/vendor/orders" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function LoadingFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
        Loading…
      </p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<LoginPage mode="register" />} />

            {/* Protected — route to role layout */}
            <Route element={<AuthGuard />}>
              <Route path="/" element={<RoleRouter />} />

              {/* Admin */}
              <Route element={<RoleGuard allowedRoles={["system_admin"]} />}>
                <Route path="/admin/*" element={<AdminLayout />} />
              </Route>

              {/* Controller */}
              <Route element={<RoleGuard allowedRoles={["system_controller"]} />}>
                <Route path="/controller/*" element={<ControllerLayout />} />
              </Route>

              {/* Donor */}
              <Route element={<RoleGuard allowedRoles={["donor"]} />}>
                <Route path="/donor/*" element={<DonorLayout />} />
              </Route>

              {/* NGO */}
              <Route element={<RoleGuard allowedRoles={["ngo"]} />}>
                <Route path="/ngo/*" element={<NGOLayout />} />
              </Route>

              {/* Vendor */}
              <Route element={<RoleGuard allowedRoles={["vendor"]} />}>
                <Route path="/vendor/*" element={<VendorLayout />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
