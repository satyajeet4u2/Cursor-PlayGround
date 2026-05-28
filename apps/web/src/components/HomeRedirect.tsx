import { Navigate } from 'react-router-dom';
import { UserRole } from '@ops-cases/shared';
import { useAuth } from '../auth/AuthContext';

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (user?.role === UserRole.Manager) {
    return <Navigate to="/overview" replace />;
  }
  return <Navigate to="/cases" replace />;
}
