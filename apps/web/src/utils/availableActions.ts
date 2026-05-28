import { CaseAction, CaseStatus, UserRole } from '@ops-cases/shared';

/** Actions the UI may offer for the current role + case status */
export function getAvailableActions(
  role: UserRole,
  status: CaseStatus,
): CaseAction[] {
  if (role === UserRole.Manager) {
    switch (status) {
      case CaseStatus.PendingReview:
        return [
          CaseAction.CloseCleared,
          CaseAction.CloseDiscrepant,
          CaseAction.PutOnHold,
        ];
      case CaseStatus.Assigned:
      case CaseStatus.InProgress:
        return [CaseAction.PutOnHold];
      case CaseStatus.OnHold:
        return [CaseAction.Resume];
      default:
        return [];
    }
  }

  if (role === UserRole.Agent) {
    switch (status) {
      case CaseStatus.Assigned:
        return [CaseAction.StartWork];
      case CaseStatus.InProgress:
        return [CaseAction.SubmitReview];
      default:
        return [];
    }
  }

  return [];
}

export function formatAction(action: CaseAction): string {
  return action.replace(/_/g, ' ');
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
