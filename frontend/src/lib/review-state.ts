export type ModerationActionInput = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'REMOVE';
export type ReviewStatusOutput = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'REMOVED';

export function moderationActionToStatus(action: ModerationActionInput): ReviewStatusOutput {
  if (action === 'APPROVE') return 'APPROVED';
  if (action === 'REJECT') return 'REJECTED';
  if (action === 'REQUEST_CHANGES') return 'CHANGES_REQUESTED';
  return 'REMOVED';
}
