import { ClientSession, Types } from 'mongoose';
import { CaseAction, CaseStatus } from '@ops-cases/shared';
import { AuditEvent, IAuditEvent } from '../../models/AuditEvent';

export interface CreateAuditInput {
  caseId: Types.ObjectId;
  action: CaseAction;
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  actorId: Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export async function insertAuditEvent(
  input: CreateAuditInput,
  session?: ClientSession,
): Promise<IAuditEvent> {
  const [event] = await AuditEvent.create(
    [
      {
        caseId: input.caseId,
        action: input.action,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actorId: input.actorId,
        at: new Date(),
        metadata: input.metadata,
      },
    ],
    { session },
  );
  return event;
}

export async function listAuditEventsForCase(caseId: Types.ObjectId) {
  return AuditEvent.find({ caseId }).sort({ at: -1 }).lean();
}
