import request from 'supertest';
import bcrypt from 'bcryptjs';
import { CaseAction, CaseStatus, UserRole } from '@ops-cases/shared';
import { createApp } from '../../app';
import { User } from '../../models/User';
import { Client } from '../../models/Client';
import { Case } from '../../models/Case';
import { AuditEvent } from '../../models/AuditEvent';
import { signToken } from '../../middleware/auth';

const app = createApp();

describe('POST /cases/:id/transitions', () => {
  let caseId: string;
  let agentId: string;
  let managerId: string;
  let agentToken: string;
  let managerToken: string;
  let otherAgentToken: string;

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Client.deleteMany({}),
      Case.deleteMany({}),
      AuditEvent.deleteMany({}),
    ]);

    const hash = await bcrypt.hash('pass', 10);
    const manager = await User.create({
      email: 'm@test.com',
      name: 'Manager',
      role: UserRole.Manager,
      passwordHash: hash,
    });
    const agent = await User.create({
      email: 'a@test.com',
      name: 'Agent',
      role: UserRole.Agent,
      passwordHash: hash,
    });
    const other = await User.create({
      email: 'o@test.com',
      name: 'Other',
      role: UserRole.Agent,
      passwordHash: hash,
    });
    const client = await Client.create({ name: 'Client', code: 'C1' });

    managerId = manager._id.toString();
    agentId = agent._id.toString();

    const caseDoc = await Case.create({
      caseNumber: 'T-001',
      clientId: client._id,
      assigneeId: agent._id,
      status: CaseStatus.Assigned,
      caseType: 'test',
    });
    caseId = caseDoc._id.toString();

    managerToken = signToken({
      userId: managerId,
      role: UserRole.Manager,
      email: manager.email,
    });
    agentToken = signToken({
      userId: agentId,
      role: UserRole.Agent,
      email: agent.email,
    });
    otherAgentToken = signToken({
      userId: other._id.toString(),
      role: UserRole.Agent,
      email: other.email,
    });
  });

  it('agent starts work on assigned case', async () => {
    const res = await request(app)
      .post(`/cases/${caseId}/transitions`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ action: CaseAction.StartWork })
      .expect(200);

    expect(res.body.case.status).toBe(CaseStatus.InProgress);
    expect(res.body.auditEvent.action).toBe(CaseAction.StartWork);
    expect(res.body.auditEvent.fromStatus).toBe(CaseStatus.Assigned);
    expect(res.body.auditEvent.toStatus).toBe(CaseStatus.InProgress);

    const audits = await AuditEvent.find({ caseId });
    expect(audits).toHaveLength(1);
  });

  it('returns 409 for invalid transition from current status', async () => {
    await request(app)
      .post(`/cases/${caseId}/transitions`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ action: CaseAction.CloseCleared })
      .expect(409);

    const caseDoc = await Case.findById(caseId);
    expect(caseDoc!.status).toBe(CaseStatus.Assigned);
    expect(await AuditEvent.countDocuments({ caseId })).toBe(0);
  });

  it('returns 403 when agent is not assignee', async () => {
    await request(app)
      .post(`/cases/${caseId}/transitions`)
      .set('Authorization', `Bearer ${otherAgentToken}`)
      .send({ action: CaseAction.StartWork })
      .expect(403);
  });

  it('manager closes case with verdict after full workflow', async () => {
    await Case.findByIdAndUpdate(caseId, { status: CaseStatus.PendingReview });

    const res = await request(app)
      .post(`/cases/${caseId}/transitions`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ action: CaseAction.CloseCleared })
      .expect(200);

    expect(res.body.case.status).toBe(CaseStatus.Closed);
    expect(res.body.case.verdict).toBe('cleared');
    expect(res.body.case.closedAt).toBeDefined();
  });

  it('full happy path: start → submit → close discrepant', async () => {
    await request(app)
      .post(`/cases/${caseId}/transitions`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ action: CaseAction.StartWork })
      .expect(200);

    await request(app)
      .post(`/cases/${caseId}/transitions`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ action: CaseAction.SubmitReview })
      .expect(200);

    const res = await request(app)
      .post(`/cases/${caseId}/transitions`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ action: CaseAction.CloseDiscrepant })
      .expect(200);

    expect(res.body.case.verdict).toBe('discrepant');
    expect(await AuditEvent.countDocuments({ caseId })).toBe(3);
  });

  it('GET /cases/:id/audit returns timeline', async () => {
    await request(app)
      .post(`/cases/${caseId}/transitions`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ action: CaseAction.StartWork });

    const res = await request(app)
      .get(`/cases/${caseId}/audit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].action).toBe(CaseAction.StartWork);
  });
});
