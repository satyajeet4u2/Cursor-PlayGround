import { useCallback, useEffect, useState } from 'react';
import { CaseAction, UserRole } from '@ops-cases/shared';
import { useAuth } from '../auth/AuthContext';
import * as api from '../api/client';
import type { AuditEventRecord, CaseRecord, CreateCaseInput } from '../api/types';
import { CaseList } from '../components/CaseList';
import { CaseDetail } from '../components/CaseDetail';
import { CreateCaseForm } from '../components/CreateCaseForm';

export function CasesPage() {
  const { token, user } = useAuth();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [audit, setAudit] = useState<AuditEventRecord[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    setError(null);
    try {
      const list = await api.listCases(token);
      setCases(list);
      setSelectedId((prev) => prev ?? list[0]?._id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cases');
    } finally {
      setListLoading(false);
    }
  }, [token]);

  const loadDetail = useCallback(
    async (caseId: string) => {
      if (!token) return;
      setDetailLoading(true);
      try {
        const [caseDoc, events] = await Promise.all([
          api.getCase(token, caseId),
          api.getAudit(token, caseId),
        ]);
        setSelectedCase(caseDoc);
        setAudit(events);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load case');
      } finally {
        setDetailLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function handleTransition(action: CaseAction) {
    if (!token || !selectedId) return;
    setActing(true);
    setError(null);
    try {
      const result = await api.transitionCase(token, selectedId, action);
      setSelectedCase(result.case);
      await loadCases();
      const events = await api.getAudit(token, selectedId);
      setAudit(events);
    } finally {
      setActing(false);
    }
  }

  async function handleCreate(input: CreateCaseInput) {
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createCase(token, input);
      await loadCases();
      setSelectedId(created._id);
      setSelectedCase(created);
      setAudit([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create case');
      throw e;
    } finally {
      setCreating(false);
    }
  }

  const role = (user?.role ?? UserRole.Agent) as UserRole;

  return (
    <div className="dashboard">
      <aside className="panel sidebar">
        <div className="sidebar-head">
          <h2>Cases</h2>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => loadCases()}
            disabled={listLoading}
          >
            Refresh
          </button>
        </div>
        {listLoading ? (
          <p className="muted">Loading…</p>
        ) : (
          <CaseList cases={cases} selectedId={selectedId} onSelect={setSelectedId} />
        )}

        <section className="create-case-section">
          <h3>New case</h3>
          <CreateCaseForm creating={creating} onCreate={handleCreate} />
        </section>
      </aside>

      <CaseDetail
        caseRecord={selectedCase}
        audit={audit}
        loading={detailLoading}
        acting={acting}
        role={role}
        onTransition={handleTransition}
      />

      {error && <p className="error global-error">{error}</p>}
    </div>
  );
}
