import type { GuestMessageOutputT } from '../tools/guest-message-assistant/schema.js';

export const GUEST_MESSAGE_PITCH = 'Drafts host-voiced replies with approval gate';

export type Topic = 'wifi' | 'checkin' | 'late' | 'cancel' | 'pet' | 'default';

const TOPIC_KEYWORDS: { topic: Topic; needles: string[] }[] = [
  { topic: 'wifi', needles: ['wifi', 'wlan', 'internet'] },
  { topic: 'checkin', needles: ['check-in', 'checkin', 'check in', 'einchecken'] },
  { topic: 'late', needles: ['late', 'spät', 'verspät', 'delay'] },
  { topic: 'cancel', needles: ['cancel', 'storno', 'refund', 'rückerstattung'] },
  { topic: 'pet', needles: ['pet', 'hund', 'katze', 'dog', 'cat'] },
];

export const detectTopic = (msg: string): Topic => {
  const lower = msg.toLowerCase();
  for (const { topic, needles } of TOPIC_KEYWORDS) {
    if (needles.some((n) => lower.includes(n))) return topic;
  }
  return 'default';
};

const TEMPLATES: Record<Topic, GuestMessageOutputT['suggestions']> = {
  wifi: [
    { tone: 'short', text: 'Wifi: "BnBGuest" / Password: "welcome2026". Router by the entrance.' },
    {
      tone: 'friendly',
      text: 'Hi! The wifi network is "BnBGuest" and the password is "welcome2026". The router is right by the entrance — let me know if anything is unclear!',
    },
    {
      tone: 'formal',
      text: 'Dear guest, please find the wifi credentials below: SSID "BnBGuest", password "welcome2026". The router is located at the entrance area. Kind regards.',
    },
  ],
  checkin: [
    {
      tone: 'short',
      text: 'Check-in: from 15:00. Self check-in via lockbox. Code on the day.',
    },
    {
      tone: 'friendly',
      text: 'Hi! Check-in is from 15:00. We use a self-service lockbox — I will send the code on the day of arrival. Have a great trip!',
    },
    {
      tone: 'formal',
      text: 'Dear guest, check-in begins at 15:00. We use a self-service lockbox; the access code will be shared on the day of arrival.',
    },
  ],
  late: [
    {
      tone: 'short',
      text: 'No problem — late check-in is fine, the lockbox works 24/7.',
    },
    {
      tone: 'friendly',
      text: 'No worries at all! The lockbox is accessible 24/7, so a late arrival is no problem. Safe travels!',
    },
    {
      tone: 'formal',
      text: 'Dear guest, a late arrival is no issue. The lockbox is available around the clock. Please let us know your estimated time of arrival when convenient.',
    },
  ],
  cancel: [
    {
      tone: 'short',
      text: 'Cancellations follow the listing policy. Please initiate via Airbnb.',
    },
    {
      tone: 'friendly',
      text: 'Sorry to hear plans changed! Cancellations follow the policy on the listing — please initiate it via Airbnb so the refund can be processed automatically.',
    },
    {
      tone: 'formal',
      text: 'Dear guest, please initiate any cancellation through the Airbnb platform. Refunds are handled per the listing cancellation policy.',
    },
  ],
  pet: [
    {
      tone: 'short',
      text: 'Pets are welcome (1 dog/cat, +20 EUR cleaning).',
    },
    {
      tone: 'friendly',
      text: 'Yes, pets are welcome! We allow one well-behaved dog or cat with a small additional cleaning fee of 20 EUR. Please mention the pet in the booking.',
    },
    {
      tone: 'formal',
      text: 'Dear guest, pets are permitted (one cat or dog) with an additional cleaning fee of 20 EUR. Kindly note the pet in your reservation.',
    },
  ],
  default: [
    {
      tone: 'short',
      text: 'Thanks for reaching out — getting back to you shortly.',
    },
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

const RECOMMENDED_INDEX_BY_VOICE: Record<'casual' | 'professional' | 'warm', 0 | 1 | 2> = {
  casual: 0,
  professional: 2,
  warm: 1,
};

export const buildGuestMessageOutput = (
  topic: Topic,
  voice: 'casual' | 'professional' | 'warm',
): GuestMessageOutputT => ({
  suggestions: TEMPLATES[topic],
  recommended_index: RECOMMENDED_INDEX_BY_VOICE[voice],
  approval_required: true,
  _mock: true,
  _pitch: GUEST_MESSAGE_PITCH,
});
