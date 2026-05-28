import type { AuditEventRecord } from '../api/types';
import { formatAction, formatStatus } from '../utils/availableActions';
import { CaseAction } from '@ops-cases/shared';

interface Props {
  events: AuditEventRecord[];
  loading?: boolean;
}

export function AuditTimeline({ events, loading }: Props) {
  if (loading) return <p className="muted">Loading audit trail…</p>;

  if (!events.length) {
    return <p className="muted">No transitions recorded yet.</p>;
  }

  return (
    <ol className="audit-timeline">
      {events.map((e) => (
        <li key={e._id}>
          <div className="audit-action">{formatAction(e.action as CaseAction)}</div>
          <div className="audit-detail">
            {formatStatus(e.fromStatus)} → {formatStatus(e.toStatus)}
          </div>
          <time className="muted">{new Date(e.at).toLocaleString()}</time>
        </li>
      ))}
    </ol>
  );
}
