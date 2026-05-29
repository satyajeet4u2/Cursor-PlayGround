export interface User {
  id?: string;
  userId?: string;
  email: string;
  name?: string;
  role: 'manager' | 'agent';
}

export interface CaseRecord {
  _id: string;
  caseNumber: string;
  status: string;
  caseType: string;
  verdict?: string;
  dueAt?: string;
  closedAt?: string;
  assigneeId?: string;
  updatedAt?: string;
  documents?: CaseDocumentRecord[];
}

export interface CaseDocumentRecord {
  filename: string;
  contentType: string;
  size: number;
  data?: string;
  uploadedAt?: string;
}

export interface CreateCaseDocument {
  filename: string;
  contentType: string;
  size: number;
  data: string;
}

export interface CreateCaseInput {
  clientName: string;
  clientCode: string;
  caseType: string;
  dueAt?: string;
  documents: CreateCaseDocument[];
}

export interface AuditEventRecord {
  _id: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  at: string;
  actorId?: string;
}

export interface ManagerDashboard {
  tiles: {
    openCases: number;
    breachingSla: number;
    dueIn48Hours: number;
    closureRate30d: number;
    createdLast30: number;
    closedLast30: number;
  };
  casesByStatus: { status: string; count: number }[];
  agentWorkload: {
    assigneeId: string;
    name: string;
    email?: string;
    openCount: number;
  }[];
  asOf: string;
}

export interface ReportRange {
  from: string;
  to: string;
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string };
}
