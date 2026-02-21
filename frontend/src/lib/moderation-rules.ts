import { ModerationActionInput } from '@/lib/review-state';

export function assertModerationPayload(action: ModerationActionInput, message?: string | null) {
  if ((action === 'REJECT' || action === 'REQUEST_CHANGES') && !message?.trim()) {
    throw new Error('MODERATION_MESSAGE_REQUIRED');
  }
}
