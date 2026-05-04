import { describe, it, expect } from 'vitest';
import { GuestMessageInput } from '../../src/tools/guest-message-assistant/schema.js';

describe('GuestMessageInput', () => {
  it('accepts valid input and defaults host_voice', () => {
    const r = GuestMessageInput.parse({ thread_id: 't1', last_message: 'hi' });
    expect(r.host_voice).toBe('warm');
  });

  it('rejects empty last_message', () => {
    const r = GuestMessageInput.safeParse({ thread_id: 't1', last_message: '' });
    expect(r.success).toBe(false);
  });
});
