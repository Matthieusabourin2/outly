/**
 * Privacy policy and terms for the launch (SPEC A6, PLAN "En attente des CEO").
 * Plain-English drafts written for Australia; to be approved by the CEOs and reviewed
 * by a lawyer if Outly continues after the test. Contact address set per environment.
 */
export const PRIVACY_CONTACT = process.env.EXPO_PUBLIC_PRIVACY_EMAIL ?? 'privacy@outly.app';
export const LEGAL_UPDATED = '9 October 2026';

export type LegalSection = { heading: string; body: string[] };

export const PRIVACY: LegalSection[] = [
  {
    heading: 'Who we are',
    body: [
      `Outly is a going-out app for Sydney. "We" means the Outly team. For anything about your personal information, email ${PRIVACY_CONTACT}.`,
    ],
  },
  {
    heading: 'What we collect',
    body: [
      'Account details: your email address, first name, username and date of birth. If you sign in with Google, we receive your email address from Google.',
      'What you do in Outly: the guest lists you join, when your pass is scanned at a venue, whether you chose to appear on an attendee list (classic) or not (ghost), and any reports or blocks you make.',
      'Technical data: basic logs such as the time of a request and errors, used to keep the service running and secure.',
      'We do not collect your location, your contacts or photos.',
    ],
  },
  {
    heading: 'Why we use it',
    body: [
      'To run your account and your guest pass, check you are 18 or over, let venue staff confirm your pass at the door, keep the community safe (reports, blocks, suspensions) and understand how Outly is used through overall statistics.',
      'We do not sell your personal information.',
    ],
  },
  {
    heading: 'Who sees what',
    body: [
      'Other guests: only your username, and only if you choose classic mode. In ghost mode nobody sees you on the list. People you block never see you.',
      'Venue staff: your username when they scan your pass, and overall numbers for their venue (how many joined, how many came in).',
      'The Outly team: account information when needed to run the service or handle a report.',
      'Service providers who host our data and send our emails (Supabase, our email provider), under their own security commitments. Our database is hosted in Australia.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'We keep your information while your account is open. When you delete your account in Profile, your account, profile, passes and choices are deleted. Reports you made about others may be kept in anonymised form to keep the community safe.',
    ],
  },
  {
    heading: 'Your choices and rights',
    body: [
      'You can change ghost or classic mode at any time, block anyone, and delete your account from Profile.',
      `You can ask to access or correct your information, or make a complaint, at ${PRIVACY_CONTACT}. If you are not satisfied with our answer, you can contact the Office of the Australian Information Commissioner (oaic.gov.au).`,
    ],
  },
  { heading: 'Changes', body: ['If we change this policy we will update this page and the date below.'] },
];

export const TERMS: LegalSection[] = [
  {
    heading: '18 and over only',
    body: ['You must be 18 or older to create an account. Accounts with a false date of birth will be removed.'],
  },
  {
    heading: 'Your Outly pass is a perk, not a ticket',
    body: [
      'An Outly pass gives access to the benefit shown for that event, such as the fast lane. You still need a valid ticket where one is required.',
      'Entry is always at the venue’s discretion. Security can refuse entry, check ID and tickets, and apply the venue’s conditions of entry and the responsible service of alcohol rules.',
      'Each pass is personal and works once. Sharing or copying a pass will not work and may lead to your account being suspended.',
    ],
  },
  {
    heading: 'Be respectful',
    body: [
      'Do not harass, threaten or impersonate anyone, or use a username that is offensive. You can report and block anyone. We may suspend accounts that break these rules.',
    ],
  },
  {
    heading: 'Drink responsibly',
    body: ['Outly does not encourage excessive drinking. Plan a safe way home, drink water, and look after your friends.'],
  },
  {
    heading: 'The service',
    body: [
      'Outly is new and still being tested. We do our best to keep it working but cannot promise it will always be available. Venues are responsible for their own events, offers and premises.',
      'Nothing in these terms limits your rights under the Australian Consumer Law.',
    ],
  },
  {
    heading: 'Closing your account',
    body: ['You can delete your account at any time from Profile. We can close accounts that break these terms.'],
  },
  { heading: 'Law', body: ['These terms are governed by the laws of New South Wales, Australia.'] },
];
