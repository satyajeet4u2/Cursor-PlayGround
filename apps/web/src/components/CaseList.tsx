import type { CaseRecord } from '../api/types';
import { formatStatus } from '../utils/availableActions';

interface Props {
  cases: CaseRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CaseList({ cases, selectedId, onSelect }: Props) {
  if (!cases.length) {
    return <p className="muted empty">No cases found. Run the API seed script.</p>;
  }

  return (
    <ul className="case-list">
      {cases.map((c) => (
        <li key={c._id}>
          <button
            type="button"
            className={`case-item ${selectedId === c._id ? 'active' : ''}`}
            onClick={() => onSelect(c._id)}
          >
            <span className="case-number">{c.caseNumber}</span>
            <span className={`status status-${c.status}`}>{formatStatus(c.status)}</span>
            <span className="case-type">{c.caseType}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
