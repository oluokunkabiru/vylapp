// ─── VYLAPP LEGAL DATA ────────────────────────────────────────────────────────
// Sourced from official Vylapp LLC legal documents (2025).
// To update via backend, replace these exports with API-fetched data.

import { COLORS, COMPANY } from "../config";

export const TERMS = {
  title: "Terms of Service",
  labelColor: COLORS.violet,
  effective: "2025",
  sections: [
    {
      title: "1. Eligibility & Account Registration",
      body: `You must be at least 13 years of age to use Vylapp. If you are between 13 and 18, you must have parent or legal guardian consent. You agree to provide accurate, current, and complete registration information, maintain your account security, and notify us immediately of any unauthorized access. You may not create multiple accounts or allow others to use your account.`
    },
    {
      title: "2. Platform & License",
      body: `Vylapp is a global community platform enabling users to share content ("Vibes"), join audio and video Spaces, connect through direct messaging and group chats, explore topics of interest, and engage with a global community of learners and creators. We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for personal, non-commercial use. You may not reverse engineer, reproduce, or use automated means to access the Platform without authorization.`
    },
    {
      title: "3. User Content",
      body: `You retain ownership of everything you post. By posting, you grant Vylapp a worldwide, non-exclusive, royalty-free license to display and distribute your content within the Platform and to promote Vylapp. You may delete your content at any time. You represent that your content does not infringe any third-party rights, does not violate applicable law, and complies with our Community Guidelines.`
    },
    {
      title: "4. Community Rules",
      body: `Prohibited content includes: hate speech, harassment, or threats; content endangering minors; sexually explicit material; spam or deceptive information; content that violates privacy; illegal content; and impersonation. Vylapp uses progressive trust scoring with AI-assisted moderation. First violations may result in capability restrictions. Serious violations result in immediate permanent removal. All decisions can be appealed at ${COMPANY.supportEmail}.`
    },
    {
      title: "5. Live Spaces & Streaming",
      body: `Space hosts are responsible for managing their sessions in compliance with these Terms. Recording a Space requires the consent of all participants. By participating in a recorded Space, you consent to being recorded. Unauthorized recording or distribution of Space content is prohibited. Vylapp reserves the right to terminate any live stream that violates these Terms.`
    },
    {
      title: "6. Payments & Subscriptions",
      body: `Paid subscriptions are billed on a recurring basis as described in your plan. Cancellations take effect at the end of the current billing period. No refunds are provided for unused portions of a subscription period except where required by applicable law. Payment details are processed by our third-party payment processor — we do not store full payment card numbers.`
    },
    {
      title: "7. Intellectual Property",
      body: `The Platform and all its content, features, and functionality (excluding User Content) — including the Vylapp name, logo, software, design, graphics, and text — are owned by ${COMPANY.name} and protected by applicable intellectual property laws. You may not use Vylapp's intellectual property without our prior written consent.`
    },
    {
      title: "8. Limitation of Liability",
      body: `To the maximum extent permitted by law, ${COMPANY.name} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability to you for any claims arising from your use of the Platform shall not exceed the greater of $100 or the amount you paid Vylapp in the past twelve months.`
    },
    {
      title: "9. Governing Law",
      body: `These Terms are governed by and construed in accordance with the laws of the State of ${COMPANY.state}, without regard to conflict of law principles. Any dispute shall be resolved by binding arbitration in ${COMPANY.state}, except that either party may seek injunctive relief in a court of competent jurisdiction.`
    },
    {
      title: "10. Contact",
      body: `Questions about these Terms? Contact us at ${COMPANY.legalEmail}. Mailing address: ${COMPANY.address}.`
    },
  ],
};

export const PRIVACY = {
  title: "Privacy Policy",
  labelColor: COLORS.teal,
  effective: "2025",
  sections: [
    {
      title: "1. Information We Collect",
      body: `We collect: (a) Account information — name, email, username, password, and optional profile details (photo, bio, location); (b) Content you post — Vibes, comments, messages, audio/video in Spaces; (c) Usage data — pages viewed, features used, session duration; (d) Device information — device type, OS, browser, IP address; (e) General location derived from IP address (precise location only if you grant permission); and (f) Information from social login providers (Google, Apple) — name, email, and profile photo.`
    },
    {
      title: "2. How We Use Your Information",
      body: `We use your information to: operate and improve the Platform; create and manage your account; personalize your experience; process payments; send transactional communications and (where consented) marketing; enforce our Terms and Community Guidelines; detect and prevent fraud and security incidents; comply with legal obligations; and conduct platform analytics. We never sell your data to advertisers.`
    },
    {
      title: "3. Translation & AI Features",
      body: `Content you translate is processed by our in-house organic multilingual engine. No content is sent to third-party translation APIs. Your translation history is stored locally and can be deleted from your account settings at any time.`
    },
    {
      title: "4. How We Share Your Information",
      body: `Your public Vibes, profile, and participation in public Spaces are visible to other users. We share data with trusted service providers (cloud hosting, payment processors, analytics) who are contractually bound to protect your information. We may share information when required by law or to protect safety. In the event of a merger or acquisition, you will be notified before your data is subject to a materially different privacy policy.`
    },
    {
      title: "5. Cookies & Tracking",
      body: `We use essential cookies (required for platform function), preference cookies (to remember your settings), and analytics cookies (to understand usage). We do not use marketing or advertising tracking cookies. You may control cookie preferences through your browser settings. Disabling essential cookies may affect Platform functionality.`
    },
    {
      title: "6. Data Retention",
      body: `We retain your personal information for as long as your account is active or as necessary to provide our services, comply with legal obligations, and prevent fraud. If you delete your account, we will delete or anonymize your personal information within 90 days, except where retention is required by law.`
    },
    {
      title: "7. Your Privacy Rights",
      body: `Depending on your location, you may have the right to: access a copy of your personal data; correct inaccurate information; request deletion of your data; receive a portable copy of your data; and object to or restrict certain processing. To exercise these rights, contact us at ${COMPANY.supportEmail}. We will respond within 30 days.`
    },
    {
      title: "8. Security",
      body: `${COMPANY.name} implements commercially reasonable technical and organizational security measures to protect your personal information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security. We will notify you promptly in the event of a data breach that affects your personal information.`
    },
    {
      title: "9. Contact",
      body: `Privacy questions: ${COMPANY.supportEmail} · ${COMPANY.website} · ${COMPANY.address}.`
    },
  ],
};

export const GUIDELINES = {
  title: "Community Guidelines",
  labelColor: COLORS.coral,
  sections: [
    {
      title: "Welcome to Vylapp",
      body: `Vylapp is built on the belief that your language, culture, and perspective are assets — not barriers. These guidelines exist to protect that belief and ensure every member can vibe, learn, and connect in a space that feels safe and genuine.`
    },
    {
      title: "What's welcome",
      body: `Speak your language and expect to be understood. Share knowledge, builds, art, and experiences. Support others' growth — especially newcomers to the community. Disagree with ideas, never with people. Celebrate cultural diversity — it is the core of what makes Vylapp different.`
    },
    {
      title: "What's not welcome",
      body: `Hate speech, harassment, or targeted abuse in any language. Content that endangers or exploits minors. Coordinated inauthentic behavior, spam, or bot activity. Impersonation of creators, community members, or the Vylapp team. Sharing private information without explicit consent. Illegal content of any kind.`
    },
    {
      title: "Spaces & Live Content",
      body: `Space hosts are responsible for their rooms. Recording requires the consent of all participants. Disrupting, trolling, or brigading a live Space is grounds for immediate removal from that session and may result in account action. Content that would violate these guidelines offline also violates them in a live Space.`
    },
    {
      title: "How we enforce",
      body: `We use a progressive trust scoring system. First violations typically result in temporary capability restrictions and a warning. Serious violations — hate speech, content endangering minors, illegal activity — result in immediate permanent removal. All enforcement decisions can be appealed at ${COMPANY.supportEmail}. Monthly community health reports are published publicly.`
    },
    {
      title: "Reporting",
      body: `Every piece of content on Vylapp can be reported. Reports are reviewed by our Trust & Safety team within 24 hours for high-severity issues and within 72 hours for standard reports. We will notify you of the outcome of your report.`
    },
  ],
};
