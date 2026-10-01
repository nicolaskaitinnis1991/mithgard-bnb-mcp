import type { GuestMessageInputT, GuestMessageOutputT } from './schema.js';
import { providedData, demoResult } from '../../host-data/contracts.js';
import { messageFromData } from '../../host-data/engines.js';
import {
  buildGuestMessageOutput,
  detectTopic,
} from '../../mocks/guest-message-assistant.fixture.js';

export const guestMessageHandler = (input: GuestMessageInputT): Promise<GuestMessageOutputT> => {
  const data = providedData(input);
  if (data) return Promise.resolve(messageFromData(input.last_message, input.host_voice, data));
  const topic = detectTopic(input.last_message);
  return Promise.resolve(demoResult(buildGuestMessageOutput(topic, input.host_voice)));
};
