import { describe, expect, it } from 'vitest';
import { scanPII } from '../src/lib/security/pii';

describe('scanPII', () => {
  it('flags obvious contact details', () => {
    const result = scanPII('contact me at joao@example.com or +351 912 345 678');
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('email');
    expect(result.reasons).toContain('phone');
    expect(result.block).toBe(true);
  });

  it('flags apartment identifiers', () => {
    const result = scanPII('It was in apt 4B near the lift');
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('unit_identifier');
    expect(result.block).toBe(true);
  });

  it('allows neutral condition-based content', () => {
    const result = scanPII('Good insulation, occasional traffic noise, and limited parking.');
    expect(result.flagged).toBe(false);
    expect(result.block).toBe(false);
  });
});
