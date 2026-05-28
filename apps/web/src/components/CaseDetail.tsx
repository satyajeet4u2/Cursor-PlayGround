import { useState } from 'react';
import { CaseStatus, UserRole, type CaseAction } from '@ops-cases/shared';
import type { AuditEventRecord, CaseRecord } from '../api/types';
import {
  formatAction,
  formatStatus,
  getAvailableActions,
} from '../utils/availableActions';
import { AuditTimeline } from './AuditTimeline';

interface Props {
  caseRecord: CaseRecord | null;
  audit: AuditEventRecord[];
  loading: boolean;
  acting: boolean;
  role: UserRole;
  onTransition: (action: CaseAction) => Promise<void>;
}

export function CaseDetail({
  caseRecord,
  audit,
  loading,
  acting,
  role,
  onTransition,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="panel detail">Loading case…</div>;
  if (!caseRecord) {
    return (
      <div className="panel detail">
        <p className="muted">Select a case from the list.</p>
      </div>
    );
  }

  const actions = getAvailableActions(role, caseRecord.status as CaseStatus);

  async function handleAction(action: CaseAction) {
    setError(null);
    try {
      await onTransition(action);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transition failed');
    }
  }

  return (
    <div className="panel detail">
      <div className="detail-header">
        <h2>{caseRecord.caseNumber}</h2>
        <span className={`status status-${caseRecord.status}`}>
          {formatStatus(caseRecord.status)}
        </span>
        {caseRecord.verdict && (
          <span className={`verdict verdict-${caseRecord.verdict}`}>
            {caseRecord.verdict}
          </span>
        )}
      </div>

      <dl className="meta">
        <div>
          <dt>Type</dt>
          <dd>{caseRecord.caseType}</dd>
        </div>
        {caseRecord.dueAt && (
          <div>
            <dt>Due</dt>
            <dd>{new Date(caseRecord.dueAt).toLocaleDateString()}</dd>
          </div>
        )}
        {caseRecord.closedAt && (
          <div>
            <dt>Closed</dt>
            <dd>{new Date(caseRecord.closedAt).toLocaleString()}</dd>
          </div>
        )}
      </dl>

      {actions.length > 0 && (
        <div className="actions">
          <h3>Workflow actions</h3>
          <div className="action-buttons">
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                className="btn primary"
                disabled={acting}
                onClick={() => handleAction(action)}
              >
                {acting ? '…' : formatAction(action)}
              </button>
            ))}
          </div>
        </div>
      )}

      {caseRecord.status === CaseStatus.Closed && (
        <p className="muted">This case is closed. No further transitions.</p>
      )}

      {actions.length === 0 && caseRecord.status !== CaseStatus.Closed && (
        <p className="muted">
          No actions available for your role at this status. Try signing in as{' '}
          {role === UserRole.Agent ? 'manager' : 'agent'}.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      <section className="audit-section">
        <h3>Audit trail</h3>
        <AuditTimeline events={audit} />
      </section>
    </div>
  );
}
