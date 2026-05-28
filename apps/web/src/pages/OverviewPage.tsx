import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import * as api from '../api/client';
import type { ManagerDashboard } from '../api/types';
import { ManagerDashboardView } from '../components/ManagerDashboard';

export function OverviewPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.getManagerDashboard(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  if (loading) return <p className="muted">Loading dashboard…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!data) return null;

  return (
    <>
      <div className="page-head">
        <h1>Manager overview</h1>
        <button type="button" className="btn secondary small" onClick={load}>
          Refresh
        </button>
      </div>
      <ManagerDashboardView data={data} />
    </>
  );
}
