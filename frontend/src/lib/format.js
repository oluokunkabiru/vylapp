const ACRONYMS = new Set(["ai", "api", "dm", "id", "ip", "otp", "pdf", "rbac", "sms", "url", "usd"]);

// Display-only formatting for enum values and machine keys. Callers must keep
// using the original value for API payloads, route parameters and form values.
export function humanizeIdentifier(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map(word => {
      const lower = word.toLowerCase();
      if (lower === "2fa") return "2FA";
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      return lower ? `${lower[0].toUpperCase()}${lower.slice(1)}` : "";
    })
    .join(" ");
}
