import type {
  ApiErrorBody,
  AuditEventRecord,
  CaseRecord,
  CreateCaseInput,
  ManagerDashboard,
  ReportRange,
  User,
} from './types';

const API_BASE = 'https://cursor-play-ground-api.vercel.app/';

console.log('API Base URL:', API_BASE);

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!res.ok) {
    const message =
      (data as ApiErrorBody).error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(token: string) {
  const data = await request<{ user: User }>('/auth/me', { token });
  const u = data.user;
  return {
    id: u.id ?? u.userId ?? '',
    email: u.email,
    name: u.name,
    role: u.role,
  } satisfies User;
}

export async function listCases(token: string) {
  const data = await request<{ cases: CaseRecord[] }>('/cases', { token });
  return data.cases;
}

export async function createCase(token: string, input: CreateCaseInput) {
  const data = await request<{ case: CaseRecord }>('/cases', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
  return data.case;
}

export async function getCase(token: string, caseId: string) {
  const data = await request<{ case: CaseRecord }>(`/cases/${caseId}`, { token });
  return data.case;
}

export async function getAudit(token: string, caseId: string) {
  const data = await request<{ events: AuditEventRecord[] }>(`/cases/${caseId}/audit`, {
    token,
  });
  return data.events;
}

export async function getManagerDashboard(token: string) {
  return request<ManagerDashboard>('/dashboard/manager', { token });
}

export type ReportType =
  | 'closure-rate'
  | 'turnaround-by-type'
  | 'agent-productivity'
  | 'discrepancy-rate';

export async function fetchReport<T>(
  token: string,
  type: ReportType,
  from?: string,
  to?: string,
) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString();
  return request<{ range: ReportRange; rows: T[] }>(
    `/reports/${type}${q ? `?${q}` : ''}`,
    { token },
  );
}

export function reportExportUrl(type: ReportType, from?: string, to?: string): string {
  const params = new URLSearchParams({ type });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return `${API_BASE}/reports/export.csv?${params}`;
}

export async function transitionCase(
  token: string,
  caseId: string,
  action: string,
  assigneeId?: string,
) {
  return request<{ case: CaseRecord; auditEvent: AuditEventRecord }>(
    `/cases/${caseId}/transitions`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({ action, ...(assigneeId ? { assigneeId } : {}) }),
    },
  );
}
