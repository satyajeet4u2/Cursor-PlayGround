import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import * as api from '../api/client';
import type { ReportType } from '../api/client';

const REPORTS: { id: ReportType; title: string; description: string }[] = [
  {
    id: 'closure-rate',
    title: 'Monthly closure rate',
    description: 'Cases created vs closed per month, with closure %.',
  },
  {
    id: 'turnaround-by-type',
    title: 'Turnaround by case type',
    description: 'Average days from creation to close, by case type.',
  },
  {
    id: 'agent-productivity',
    title: 'Agent productivity',
    description: 'Cases closed per agent, avg days to close, open count.',
  },
  {
    id: 'discrepancy-rate',
    title: 'Discrepancy rate',
    description: '% of closed cases with discrepant verdict, by type.',
  },
];

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function ReportsPage() {
  const { token } = useAuth();
  const [active, setActive] = useState<ReportType>('closure-rate');
  const [range, setRange] = useState(defaultRange);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.fetchReport<Record<string, unknown>>(
        token,
        active,
        range.from,
        range.to,
      );
      setRows(result.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, active, range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    if (!token) return;
    const url = api.reportExportUrl(active, range.from, range.to);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `${active}.csv`);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setError('Export failed'));
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="reports-page">
      <div className="page-head">
        <h1>Reports</h1>
      </div>

      <div className="report-tabs">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`tab ${active === r.id ? 'active' : ''}`}
            onClick={() => setActive(r.id)}
          >
            {r.title}
          </button>
        ))}
      </div>

      <p className="muted report-desc">
        {REPORTS.find((r) => r.id === active)?.description}
      </p>

      <div className="panel report-controls">
        <label>
          From
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </label>
        <button type="button" className="btn primary" onClick={load} disabled={loading}>
          Run report
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={exportCsv}
          disabled={loading || rows.length === 0}
        >
          Export CSV
        </button>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && rows.length > 0 && (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col.replace(/([A-Z])/g, ' $1')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col}>{String(row[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="muted">No data for this range.</p>
      )}
    </div>
  );
}
