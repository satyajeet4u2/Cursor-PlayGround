import {
  CaseAction,
  CaseStatus,
  CaseVerdict,
  TransitionRule,
  UserRole,
} from '@ops-cases/shared';
import { ForbiddenError, InvalidTransitionError } from '../../lib/errors';

/** Single source of truth for allowed status transitions */
export const TRANSITION_RULES: TransitionRule[] = [
  { from: CaseStatus.Draft, action: CaseAction.Assign, to: CaseStatus.Assigned, managerOnly: true },
  {
    from: CaseStatus.Assigned,
    action: CaseAction.StartWork,
    to: CaseStatus.InProgress,
  },
  {
    from: CaseStatus.InProgress,
    action: CaseAction.SubmitReview,
    to: CaseStatus.PendingReview,
  },
  {
    from: CaseStatus.PendingReview,
    action: CaseAction.CloseCleared,
    to: CaseStatus.Closed,
    managerOnly: true,
    verdict: CaseVerdict.Cleared,
  },
  {
    from: CaseStatus.PendingReview,
    action: CaseAction.CloseDiscrepant,
    to: CaseStatus.Closed,
    managerOnly: true,
    verdict: CaseVerdict.Discrepant,
  },
  {
    from: CaseStatus.Assigned,
    action: CaseAction.PutOnHold,
    to: CaseStatus.OnHold,
    managerOnly: true,
  },
  {
    from: CaseStatus.InProgress,
    action: CaseAction.PutOnHold,
    to: CaseStatus.OnHold,
    managerOnly: true,
  },
  {
    from: CaseStatus.PendingReview,
    action: CaseAction.PutOnHold,
    to: CaseStatus.OnHold,
    managerOnly: true,
  },
  {
    from: CaseStatus.OnHold,
    action: CaseAction.Resume,
    to: CaseStatus.Assigned,
    managerOnly: true,
  },
];

export interface ResolvedTransition {
  toStatus: CaseStatus;
  verdict?: CaseVerdict;
  managerOnly: boolean;
}

export function resolveTransition(
  fromStatus: CaseStatus,
  action: CaseAction,
): ResolvedTransition {
  const rule = TRANSITION_RULES.find((r) => r.from === fromStatus && r.action === action);
  if (!rule) {
    throw new InvalidTransitionError(
      `Cannot perform "${action}" from status "${fromStatus}"`,
    );
  }
  return {
    toStatus: rule.to,
    verdict: rule.verdict,
    managerOnly: rule.managerOnly ?? false,
  };
}

export interface ActorContext {
  userId: string;
  role: UserRole;
}

export function assertActorMayTransition(
  resolved: ResolvedTransition,
  actor: ActorContext,
  assigneeId?: string,
): void {
  if (resolved.managerOnly && actor.role !== UserRole.Manager) {
    throw new ForbiddenError('This action requires a manager');
  }

  if (!resolved.managerOnly && actor.role === UserRole.Agent) {
    if (!assigneeId || assigneeId !== actor.userId) {
      throw new ForbiddenError('Agent may only transition cases assigned to them');
    }
  }
}
