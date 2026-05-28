import mongoose, { Types } from 'mongoose';
import { CaseAction } from '@ops-cases/shared';
import { Case, ICase } from '../../models/Case';
import { NotFoundError } from '../../lib/errors';
import { insertAuditEvent } from './audit.repository';
import {
  ActorContext,
  assertActorMayTransition,
  resolveTransition,
} from './fsm';
import { IAuditEvent } from '../../models/AuditEvent';

export interface TransitionResult {
  case: ICase;
  auditEvent: IAuditEvent;
}

export async function transitionCase(
  caseId: string,
  action: CaseAction,
  actor: ActorContext,
  options?: { assigneeId?: string },
): Promise<TransitionResult> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const caseDoc = await Case.findById(caseId).session(session);
    if (!caseDoc) {
      throw new NotFoundError('Case');
    }

    const fromStatus = caseDoc.status;
    const resolved = resolveTransition(fromStatus, action);

    assertActorMayTransition(
      resolved,
      actor,
      caseDoc.assigneeId?.toString(),
    );

    if (action === CaseAction.Assign && options?.assigneeId) {
      caseDoc.assigneeId = new Types.ObjectId(options.assigneeId);
    }

    caseDoc.status = resolved.toStatus;

    if (resolved.verdict) {
      caseDoc.verdict = resolved.verdict;
      caseDoc.closedAt = new Date();
    }

    await caseDoc.save({ session });

    const auditEvent = await insertAuditEvent(
      {
        caseId: caseDoc._id,
        action,
        fromStatus,
        toStatus: resolved.toStatus,
        actorId: new Types.ObjectId(actor.userId),
        metadata: options?.assigneeId
          ? { assigneeId: options.assigneeId }
          : undefined,
      },
      session,
    );

    await session.commitTransaction();
    return { case: caseDoc, auditEvent };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
