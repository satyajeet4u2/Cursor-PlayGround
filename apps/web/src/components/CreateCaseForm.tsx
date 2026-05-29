import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { CreateCaseDocument, CreateCaseInput } from '../api/types';

interface Props {
  creating: boolean;
  onCreate: (input: CreateCaseInput) => Promise<void>;
}

const caseTypes = [
  'inventory_audit',
  'compliance_review',
  'site_inspection',
  'financial_reconciliation',
  'vendor_verification',
];

const maxFileSize = 1024 * 1024;
const maxFiles = 3;

function readFile(file: File): Promise<CreateCaseDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const result = String(reader.result);
      const data = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        data,
      });
    };
    reader.readAsDataURL(file);
  });
}

export function CreateCaseForm({ creating, onCreate }: Props) {
  const [clientName, setClientName] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [caseType, setCaseType] = useState(caseTypes[0]);
  const [dueAt, setDueAt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const selected = Array.from(e.target.files ?? []);
    const tooLarge = selected.find((file) => file.size > maxFileSize);
    if (tooLarge) {
      setFiles([]);
      setError(`${tooLarge.name} is larger than 1 MB`);
      return;
    }
    setFiles(selected.slice(0, maxFiles));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const documents = await Promise.all(files.map(readFile));
      await onCreate({
        clientName,
        clientCode,
        caseType,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        documents,
      });
      setClientName('');
      setClientCode('');
      setCaseType(caseTypes[0]);
      setDueAt('');
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create case');
    }
  }

  return (
    <form className="create-case-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Client name
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label>
          Client code
          <input
            value={clientCode}
            onChange={(e) => setClientCode(e.target.value.toUpperCase())}
            required
            maxLength={12}
          />
        </label>
        <label>
          Case type
          <select value={caseType} onChange={(e) => setCaseType(e.target.value)}>
            {caseTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </label>
      </div>

      <label>
        Documents
        <input type="file" multiple onChange={handleFiles} />
      </label>
      {files.length > 0 && (
        <ul className="upload-list">
          {files.map((file) => (
            <li key={`${file.name}-${file.lastModified}`}>
              {file.name} <span>{Math.ceil(file.size / 1024)} KB</span>
            </li>
          ))}
        </ul>
      )}

      <button type="submit" className="btn primary block" disabled={creating}>
        {creating ? 'Creating...' : 'Create case'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
