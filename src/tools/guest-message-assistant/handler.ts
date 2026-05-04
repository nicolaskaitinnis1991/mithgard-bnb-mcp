import type { GuestMessageInputT, GuestMessageOutputT } from './schema.js';
import {
  buildGuestMessageOutput,
  detectTopic,
} from '../../mocks/guest-message-assistant.fixture.js';

export const guestMessageHandler = (input: GuestMessageInputT): Promise<GuestMessageOutputT> => {
  const topic = detectTopic(input.last_message);
  return Promise.resolve(buildGuestMessageOutput(topic, input.host_voice));
};
