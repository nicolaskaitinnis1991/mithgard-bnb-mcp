import type { DemoOutput } from '../host-data/contracts.js';
import type { GuestMessageOutputT } from '../tools/guest-message-assistant/schema.js';

export const GUEST_MESSAGE_PITCH = 'Drafts host-voiced replies with approval gate';
export type Topic = 'wifi' | 'checkin' | 'late' | 'cancel' | 'pet' | 'default';
const TOPIC_PATTERNS: { topic: Topic; pattern: RegExp }[] = [
  { topic: 'wifi', pattern: /\b(?:wi[ -]?fi|wlan|internet)\b/i },
  { topic: 'checkin', pattern: /\b(?:check[ -]?in|einchecken)\b/i },
  { topic: 'late', pattern: /\b(?:late|delay(?:ed)?|spät|verspät\w*)\b/i },
  { topic: 'cancel', pattern: /\b(?:cancel\w*|storno\w*|refund\w*|rückerstattung\w*)\b/i },
  { topic: 'pet', pattern: /\b(?:pets?|hund\w*|katze\w*|dogs?|cats?)\b/i },
];
export const detectTopic = (message: string): Topic =>
  TOPIC_PATTERNS.find(({ pattern }) => pattern.test(message))?.topic ?? 'default';

// These are safe acknowledgement drafts. No invented credentials, permission,
// fees, availability or house rules may reach an actual guest.
const TEMPLATES: Record<Topic, GuestMessageOutputT['suggestions']> = {
  wifi: [
    {
      tone: 'short',
      text: 'I will check the correct wifi details for your accommodation and get back to you.',
    },
    {
      tone: 'friendly',
      text: 'Hi! Thanks for asking. I will confirm the wifi network and password for your accommodation and get back to you.',
    },
    {
      tone: 'formal',
      text: 'Dear guest, I will verify the wifi details for your accommodation before sharing them with you.',
    },
  ],
  checkin: [
    { tone: 'short', text: 'I will confirm your check-in time and access instructions.' },
    {
      tone: 'friendly',
      text: 'Hi! I will check the arrival time and access instructions for your booking and get back to you.',
    },
    {
      tone: 'formal',
      text: 'Dear guest, I will confirm the applicable check-in time and access instructions for your reservation.',
    },
  ],
  late: [
    {
      tone: 'short',
      text: 'Thanks for the update. I will check whether late arrival is possible for your booking.',
    },
    {
      tone: 'friendly',
      text: 'Thanks for letting me know! Please share your expected arrival time. I will check the available arrival arrangements.',
    },
    {
      tone: 'formal',
      text: 'Dear guest, please provide your expected arrival time so I can confirm the available check-in arrangements.',
    },
  ],
  cancel: [
    {
      tone: 'short',
      text: 'I will check the cancellation policy applicable to your reservation. Please review the details in Airbnb.',
    },
    {
      tone: 'friendly',
      text: 'Sorry to hear your plans changed. Please check the cancellation details shown for your reservation in Airbnb; I will verify the applicable policy too.',
    },
    {
      tone: 'formal',
      text: 'Dear guest, cancellation and refund eligibility depend on the policy applicable to your reservation. Please review the reservation details in Airbnb.',
    },
  ],
  pet: [
    {
      tone: 'short',
      text: 'I will check the pet rules and any applicable fees for your accommodation.',
    },
    {
      tone: 'friendly',
      text: 'Thanks for asking! Please let me know the pet type and number. I will confirm whether the accommodation permits them and whether any fee applies.',
    },
    {
      tone: 'formal',
      text: 'Dear guest, please provide the pet type and number so I can verify the accommodation rules and any applicable fees.',
    },
  ],
  default: [
    { tone: 'short', text: 'Thanks for reaching out — getting back to you shortly.' },
    {
      tone: 'friendly',
      text: 'Hi! Thanks for the message — I will get back to you with details shortly.',
    },
    {
      tone: 'formal',
      text: 'Dear guest, thank you for your message. I will respond with the requested information shortly.',
    },
  ],
};
const CONTEXT: Record<Topic, string[]> = {
  wifi: ['Verified listing wifi credentials'],
  checkin: ['Reservation arrival time', 'Verified listing access instructions'],
  late: ['Reservation arrival time', 'Host-approved late arrival policy'],
  cancel: ['Applicable reservation cancellation policy'],
  pet: ['Listing pet policy', 'Applicable fee and pet details'],
  default: ['Reservation and message context'],
};
const RECOMMENDED_INDEX_BY_VOICE: Record<'casual' | 'professional' | 'warm', 0 | 1 | 2> = {
  casual: 0,
  professional: 2,
  warm: 1,
};
export const buildGuestMessageOutput = (
  topic: Topic,
  voice: 'casual' | 'professional' | 'warm',
): DemoOutput<GuestMessageOutputT> => ({
  suggestions: TEMPLATES[topic],
  missing_context: CONTEXT[topic],
  recommended_index: RECOMMENDED_INDEX_BY_VOICE[voice],
  approval_required: true,
  _mock: true,
  _pitch: GUEST_MESSAGE_PITCH,
});
