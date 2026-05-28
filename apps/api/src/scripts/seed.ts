import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { UserRole, CaseStatus, CaseVerdict } from '@ops-cases/shared';
import { connectDb, disconnectDb } from '../lib/db';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { Case } from '../models/Case';
import { AuditEvent } from '../models/AuditEvent';

const DEMO_PASSWORD = 'demo1234';

const AGENTS = [
  { email: 'agent@demo.ops', name: 'Jordan Lee' },
  { email: 'agent2@demo.ops', name: 'Alex Morgan' },
  { email: 'agent3@demo.ops', name: 'Sam Patel' },
  { email: 'agent4@demo.ops', name: 'Riley Chen' },
  { email: 'agent5@demo.ops', name: 'Casey Brooks' },
  { email: 'agent6@demo.ops', name: 'Morgan Diaz' },
];

const CLIENTS = [
  { name: 'Acme Corp', code: 'ACME' },
  { name: 'Globex Inc', code: 'GLBX' },
  { name: 'Initech', code: 'INIT' },
  { name: 'Umbrella Logistics', code: 'UMBR' },
];

const CASE_TYPES = [
  'inventory_audit',
  'compliance_review',
  'site_inspection',
  'financial_reconciliation',
  'vendor_verification',
] as const;

const OPEN_STATUSES = [
  CaseStatus.Assigned,
  CaseStatus.InProgress,
  CaseStatus.PendingReview,
  CaseStatus.OnHold,
] as const;

function daysFrom(now: Date, n: number) {
  return new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
}

function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length];
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  await connectDb(uri);

  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({}),
    Case.deleteMany({}),
    AuditEvent.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();

  const manager = await User.create({
    email: 'manager@demo.ops',
    name: 'Demo Manager',
    role: UserRole.Manager,
    passwordHash,
    active: true,
  });

  const agents = await User.insertMany(
    AGENTS.map((a) => ({
      email: a.email,
      name: a.name,
      role: UserRole.Agent,
      passwordHash,
      active: true,
    })),
  );

  const clients = await Client.insertMany(CLIENTS);

  const caseDocs: Array<Record<string, unknown>> = [];
  let caseSeq = 1;

  // --- Open cases (~28): spread across agents and statuses ---
  for (let i = 0; i < 28; i++) {
    const agent = agents[i % agents.length];
    const client = clients[i % clients.length];
    const status = pick(OPEN_STATUSES, i);
    const dueOffset =
      status === CaseStatus.Assigned && i % 5 === 0
        ? -3
        : i % 7 === 0
          ? 1
          : 3 + (i % 14);
    const breached = dueOffset < 0;

    caseDocs.push({
      caseNumber: `CASE-2026-${String(caseSeq++).padStart(4, '0')}`,
      clientId: client._id,
      assigneeId: agent._id,
      status,
      caseType: pick(CASE_TYPES, i),
      dueAt: daysFrom(now, dueOffset),
      ...(breached ? { slaBreachedAt: daysFrom(now, -1) } : {}),
    });
  }

  // --- Closed cases (~35): last 90 days for reports ---
  for (let i = 0; i < 35; i++) {
    const agent = agents[(i * 2) % agents.length];
    const client = clients[(i + 1) % clients.length];
    const createdDaysAgo = 5 + (i % 85);
    const closedDaysAgo = Math.max(1, createdDaysAgo - (3 + (i % 10)));
    const discrepant = i % 4 === 0;

    caseDocs.push({
      caseNumber: `CASE-2025-${String(200 + i).padStart(4, '0')}`,
      clientId: client._id,
      assigneeId: agent._id,
      status: CaseStatus.Closed,
      caseType: pick(CASE_TYPES, i + 2),
      verdict: discrepant ? CaseVerdict.Discrepant : CaseVerdict.Cleared,
      createdAt: daysFrom(now, -createdDaysAgo),
      closedAt: daysFrom(now, -closedDaysAgo),
      dueAt: daysFrom(now, -createdDaysAgo + 7),
    });
  }

  // --- Draft cases (unassigned) ---
  for (let i = 0; i < 4; i++) {
    caseDocs.push({
      caseNumber: `CASE-2026-${String(caseSeq++).padStart(4, '0')}`,
      clientId: clients[i % clients.length]._id,
      status: CaseStatus.Draft,
      caseType: pick(CASE_TYPES, i + 1),
      dueAt: daysFrom(now, 10 + i),
    });
  }

  const insertedCases = await Case.insertMany(caseDocs);

  // Sample audit trail for a few closed cases
  const auditSamples = insertedCases
    .filter((c) => c.status === CaseStatus.Closed)
    .slice(0, 8);

  const auditRows: Array<Record<string, unknown>> = [];
  for (const c of auditSamples) {
    const actor = c.assigneeId ?? agents[0]._id;
    const at = c.createdAt ?? now;
    auditRows.push(
      {
        caseId: c._id,
        action: 'assign',
        fromStatus: CaseStatus.Draft,
        toStatus: CaseStatus.Assigned,
        actorId: manager._id,
        at: daysFrom(at, 0),
      },
      {
        caseId: c._id,
        action: 'start_work',
        fromStatus: CaseStatus.Assigned,
        toStatus: CaseStatus.InProgress,
        actorId: actor,
        at: daysFrom(at, 1),
      },
      {
        caseId: c._id,
        action: 'submit_review',
        fromStatus: CaseStatus.InProgress,
        toStatus: CaseStatus.PendingReview,
        actorId: actor,
        at: daysFrom(at, 3),
      },
      {
        caseId: c._id,
        action: c.verdict === CaseVerdict.Discrepant ? 'close_discrepant' : 'close_cleared',
        fromStatus: CaseStatus.PendingReview,
        toStatus: CaseStatus.Closed,
        actorId: manager._id,
        at: c.closedAt ?? daysFrom(at, 5),
      },
    );
  }

  await AuditEvent.insertMany(auditRows);

  const openCount = insertedCases.filter((c) => c.status !== CaseStatus.Closed).length;
  const closedCount = insertedCases.filter((c) => c.status === CaseStatus.Closed).length;

  console.log('Seed complete.\n');
  console.log('Password for all users:', DEMO_PASSWORD);
  console.log('\nManager:', manager.email);
  console.log('Agents:', agents.map((a) => a.email).join(', '));
  console.log('\nClients:', clients.map((c) => c.code).join(', '));
  console.log(`Cases: ${insertedCases.length} total (${openCount} open, ${closedCount} closed)`);
  console.log(`Audit events: ${auditRows.length}`);
  console.log('\nSign in as manager@demo.ops → Overview / Reports');

  await disconnectDb();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
