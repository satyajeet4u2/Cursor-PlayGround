import type { ManagerDashboard } from '../api/types';
import { formatStatus } from '../utils/availableActions';

interface Props {
  data: ManagerDashboard;
}

export function ManagerDashboardView({ data }: Props) {
  const { tiles, casesByStatus, agentWorkload } = data;
  const maxStatus = Math.max(...casesByStatus.map((s) => s.count), 1);
  const maxAgent = Math.max(...agentWorkload.map((a) => a.openCount), 1);

  return (
    <div className="manager-overview">
      <p className="muted overview-meta">
        Live dashboard · updated {new Date(data.asOf).toLocaleString()}
      </p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value">{tiles.openCases}</span>
          <span className="kpi-label">Open cases</span>
          <span className="kpi-hint">Total active workload</span>
        </div>
        <div className="kpi-card alert">
          <span className="kpi-value">{tiles.breachingSla}</span>
          <span className="kpi-label">Breaching SLA</span>
          <span className="kpi-hint">Needs immediate action</span>
        </div>
        <div className="kpi-card warn">
          <span className="kpi-value">{tiles.dueIn48Hours}</span>
          <span className="kpi-label">Due in 48h</span>
          <span className="kpi-hint">Act before breach</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{tiles.closureRate30d}%</span>
          <span className="kpi-label">Closure rate (30d)</span>
          <span className="kpi-hint">
            {tiles.closedLast30} closed / {tiles.createdLast30} created
          </span>
        </div>
      </div>

      <div className="charts-row">
        <div className="panel chart-panel">
          <h3>Cases by status</h3>
          <p className="muted chart-sub">Pipeline health</p>
          <ul className="bar-chart">
            {casesByStatus.map((row) => (
              <li key={row.status}>
                <span className="bar-label">{formatStatus(row.status)}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(row.count / maxStatus) * 100}%` }}
                  />
                </div>
                <span className="bar-count">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel chart-panel">
          <h3>Agent workload</h3>
          <p className="muted chart-sub">Open cases per assignee</p>
          {agentWorkload.length === 0 ? (
            <p className="muted">No assigned open cases.</p>
          ) : (
            <ul className="bar-chart">
              {agentWorkload.map((row) => (
                <li key={row.assigneeId}>
                  <span className="bar-label" title={row.email}>
                    {row.name}
                  </span>
                  <div className="bar-track">
                    <div
                      className="bar-fill agent"
                      style={{ width: `${(row.openCount / maxAgent) * 100}%` }}
                    />
                  </div>
                  <span className="bar-count">{row.openCount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
