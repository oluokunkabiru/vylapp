import { COLORS, COMPANY } from "../config";

export const TERMS = {
  title: "Terms of Service",
  labelColor: COLORS.violet,
  sections: [
    { title: "1. Eligibility",      body: "You must be at least 13 years old to use Vylapp. Ages 13–18 require parent or guardian consent. By using the platform, you confirm you meet these requirements." },
    { title: "2. Your account",     body: "You are responsible for all activity under your account. Keep credentials secure. You may not create multiple accounts or allow others to use yours." },
    { title: "3. User content",     body: "You retain ownership of everything you post. By posting, you grant Vylapp a license to display your content within the platform. You can delete your content at any time." },
    { title: "4. Community rules",  body: "Hateful, harassing, violent, or illegal content is prohibited. Vylapp uses AI-assisted moderation and a progressive trust scoring system." },
    { title: "5. Spaces",           body: "Space hosts are responsible for their sessions. Recording requires consent of all participants. Unauthorized distribution of recorded Spaces is prohibited." },
    { title: "6. Payments",         body: "Paid subscriptions are billed on a recurring basis. Cancellations take effect at the end of the billing period. No refunds for unused portions except as required by law." },
    { title: "7. Contact",          body: `Questions? Email ${COMPANY.email}. Address: ${COMPANY.address}.` },
  ],
};

export const PRIVACY = {
  title: "Privacy Policy",
  labelColor: COLORS.teal,
  sections: [
    { title: "What we collect",     body: "Account information, content you post, usage data, device info, and general location from IP address. Social login provides name, email, and profile photo." },
    { title: "How we use it",       body: "To operate the platform, personalize your feed, process payments, enforce community guidelines, and improve the product. We never sell your data to advertisers." },
    { title: "Who we share it with",body: "Your public Vibes and profile are visible to other users. Service providers operate under confidentiality agreements. No sharing with advertisers." },
    { title: "Translation data",    body: "Content you translate is processed by our in-house organic engine. No content is sent to third-party APIs. Translation history can be deleted from your settings." },
    { title: "Your rights",         body: "Access, correct, export, or delete your personal data at any time from account settings. Account deletion completes within 90 days." },
    { title: "Contact",             body: `Privacy questions: ${COMPANY.email} · ${COMPANY.website} · ${COMPANY.address}.` },
  ],
};

export const GUIDELINES = {
  title: "Community Guidelines",
  labelColor: COLORS.coral,
  sections: [
    { title: "What's welcome",      body: "Speak your language and expect to be understood. Share knowledge, builds, art, and experiences. Support others' growth — especially newcomers. Disagree with ideas, never with people." },
    { title: "What's not welcome",  body: "Hate speech, harassment, or targeted abuse. Content that endangers minors. Coordinated inauthentic behavior or spam. Impersonation of creators or the Vylapp team. Sharing private information without consent." },
    { title: "How we enforce",      body: `We use progressive trust scoring. First violations result in capability restrictions. Serious violations result in immediate permanent removal. All decisions can be appealed at ${COMPANY.email}. Monthly community health reports are published publicly.` },
  ],
};
