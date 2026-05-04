import { describe, it, expect } from 'vitest';
import { guestMessageHandler } from '../../src/tools/guest-message-assistant/handler.js';

describe('guestMessageHandler', () => {
  it('matches wifi keyword and returns 3 suggestions with approval_required', async () => {
    const out = await guestMessageHandler({
      thread_id: 't',
      last_message: 'What is the wifi password?',
      host_voice: 'warm',
    });
    expect(out._mock).toBe(true);
    expect(out.approval_required).toBe(true);
    expect(out.suggestions).toHaveLength(3);
    expect(out.suggestions[0]?.text.toLowerCase()).toContain('wifi');
  });

  it('falls back to default template for unknown topics', async () => {
    const out = await guestMessageHandler({
      thread_id: 't',
      last_message: 'random text without keywords',
      host_voice: 'casual',
    });
    expect(out.recommended_index).toBe(0);
    expect(out.suggestions[1]?.text.toLowerCase()).toContain('thanks');
  });
});
