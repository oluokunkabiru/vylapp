export type OauthProvider = "google" | "apple" | "twitter" | "linkedin";

export interface OauthProfile {
  providerId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}
