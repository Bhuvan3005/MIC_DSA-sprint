import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from './ui';

const FullPageLoader = () => (
  <div className="grid min-h-screen place-items-center"><Spinner className="text-brand-400" /></div>
);

/** UX-only guard. The API enforces the same rules independently on every request. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <Outlet />;
}

export function RequireStaff() {
  const { user, loading, isStaff } = useAuth();
  const loc = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (!isStaff) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading, isStaff } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to={isStaff ? '/admin' : '/dashboard'} replace />;
  return <Outlet />;
}
