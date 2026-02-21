import { describe, expect, it } from 'vitest';
import { assertModerationPayload } from '../src/lib/moderation-rules';

describe('moderation payload rules', () => {
  it('requires message for reject and request changes', () => {
    expect(() => assertModerationPayload('REJECT', '')).toThrow('MODERATION_MESSAGE_REQUIRED');
    expect(() => assertModerationPayload('REQUEST_CHANGES', '   ')).toThrow(
      'MODERATION_MESSAGE_REQUIRED'
    );
  });

  it('allows approve/remove without message', () => {
    expect(() => assertModerationPayload('APPROVE', null)).not.toThrow();
    expect(() => assertModerationPayload('REMOVE', null)).not.toThrow();
  });
});
