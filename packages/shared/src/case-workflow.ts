export enum CaseStatus {
  Draft = 'draft',
  Assigned = 'assigned',
  InProgress = 'in_progress',
  PendingReview = 'pending_review',
  OnHold = 'on_hold',
  Closed = 'closed',
}

export enum CaseAction {
  Assign = 'assign',
  StartWork = 'start_work',
  SubmitReview = 'submit_review',
  CloseCleared = 'close_cleared',
  CloseDiscrepant = 'close_discrepant',
  PutOnHold = 'put_on_hold',
  Resume = 'resume',
}

export enum CaseVerdict {
  Cleared = 'cleared',
  Discrepant = 'discrepant',
}

export enum UserRole {
  Manager = 'manager',
  Agent = 'agent',
}

export interface TransitionRule {
  from: CaseStatus;
  action: CaseAction;
  to: CaseStatus;
  /** Manager-only transitions */
  managerOnly?: boolean;
  /** Sets verdict when closing */
  verdict?: CaseVerdict;
}
