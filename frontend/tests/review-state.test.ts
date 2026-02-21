import { describe, expect, it } from 'vitest';
import { moderationActionToStatus } from '../src/lib/review-state';

describe('review submission state transitions', () => {
  it('maps moderation actions to final statuses', () => {
    expect(moderationActionToStatus('APPROVE')).toBe('APPROVED');
    expect(moderationActionToStatus('REJECT')).toBe('REJECTED');
    expect(moderationActionToStatus('REQUEST_CHANGES')).toBe('CHANGES_REQUESTED');
    expect(moderationActionToStatus('REMOVE')).toBe('REMOVED');
  });
});
