import { CaseAction, CaseStatus, UserRole } from '@ops-cases/shared';
import { InvalidTransitionError, ForbiddenError } from '../../lib/errors';
import {
  TRANSITION_RULES,
  assertActorMayTransition,
  resolveTransition,
} from './fsm';

describe('resolveTransition', () => {
  const allowed: Array<[CaseStatus, CaseAction, CaseStatus]> = [
    [CaseStatus.Draft, CaseAction.Assign, CaseStatus.Assigned],
    [CaseStatus.Assigned, CaseAction.StartWork, CaseStatus.InProgress],
    [CaseStatus.InProgress, CaseAction.SubmitReview, CaseStatus.PendingReview],
    [CaseStatus.PendingReview, CaseAction.CloseCleared, CaseStatus.Closed],
    [CaseStatus.PendingReview, CaseAction.CloseDiscrepant, CaseStatus.Closed],
    [CaseStatus.Assigned, CaseAction.PutOnHold, CaseStatus.OnHold],
    [CaseStatus.OnHold, CaseAction.Resume, CaseStatus.Assigned],
  ];

  it.each(allowed)(
    'allows %s + %s → %s',
    (from, action, expectedTo) => {
      const result = resolveTransition(from, action);
      expect(result.toStatus).toBe(expectedTo);
    },
  );

  const forbidden: Array<[CaseStatus, CaseAction]> = [
    [CaseStatus.Draft, CaseAction.StartWork],
    [CaseStatus.Draft, CaseAction.CloseCleared],
    [CaseStatus.Assigned, CaseAction.CloseCleared],
    [CaseStatus.Closed, CaseAction.StartWork],
    [CaseStatus.InProgress, CaseAction.Assign],
  ];

  it.each(forbidden)('rejects %s + %s', (from, action) => {
    expect(() => resolveTransition(from, action)).toThrow(InvalidTransitionError);
  });

  it('covers every rule in TRANSITION_RULES', () => {
    expect(TRANSITION_RULES.length).toBeGreaterThanOrEqual(8);
    for (const rule of TRANSITION_RULES) {
      const result = resolveTransition(rule.from, rule.action);
      expect(result.toStatus).toBe(rule.to);
    }
  });
});

describe('assertActorMayTransition', () => {
  const agentActor = { userId: 'agent-id', role: UserRole.Agent };
  const managerActor = { userId: 'mgr-id', role: UserRole.Manager };

  it('allows assignee agent on non-manager transitions', () => {
    const resolved = resolveTransition(CaseStatus.Assigned, CaseAction.StartWork);
    expect(() =>
      assertActorMayTransition(resolved, agentActor, 'agent-id'),
    ).not.toThrow();
  });

  it('forbids agent not assigned to case', () => {
    const resolved = resolveTransition(CaseStatus.Assigned, CaseAction.StartWork);
    expect(() =>
      assertActorMayTransition(resolved, agentActor, 'other-agent'),
    ).toThrow(ForbiddenError);
  });

  it('forbids agent on manager-only transition', () => {
    const resolved = resolveTransition(CaseStatus.PendingReview, CaseAction.CloseCleared);
    expect(() =>
      assertActorMayTransition(resolved, agentActor, 'agent-id'),
    ).toThrow(ForbiddenError);
  });

  it('allows manager on manager-only transition', () => {
    const resolved = resolveTransition(CaseStatus.PendingReview, CaseAction.CloseCleared);
    expect(() =>
      assertActorMayTransition(resolved, managerActor, 'agent-id'),
    ).not.toThrow();
  });
});
