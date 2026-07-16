import { VylappWordmark } from "../ui/index.jsx";

// Shared building blocks for the auth flow (Login/Register/Forgot/Reset).
// Deliberately flatter and more conservative than the rest of the app:
// no blur/glow, muted borders, a single accent color, sharp-ish corners.

export const authCard = {
  background: "var(--bg2)",
  border: "1px solid var(--border2)",
  borderRadius: 10,
  padding: "36px 32px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.24), 0 10px 28px rgba(0,0,0,0.3)",
};

export const authInput = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 6,
  border: "1px solid var(--border2)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14.5,
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export function focusAuthInput(e) {
  e.target.style.borderColor = "var(--auth-accent)";
  e.target.style.boxShadow = "0 0 0 3px var(--auth-accent-dim)";
}
export function blurAuthInput(e) {
  e.target.style.borderColor = "var(--border2)";
  e.target.style.boxShadow = "none";
}

export const authLabel = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--text2)",
  letterSpacing: 0.1,
};

export const authLink = {
  color: "var(--auth-accent)",
  fontWeight: 600,
};

export const authButtonStyle = {
  borderRadius: 6,
  background: "var(--auth-accent)",
  boxShadow: "none",
  fontWeight: 600,
  fontSize: 14.5,
  letterSpacing: 0,
};

export function AuthStatusBadge({ tone = "success", symbol = "✓" }) {
  const color = tone === "success" ? "var(--green)" : "var(--auth-danger)";
  const bg = tone === "success" ? "var(--green-dim)" : "var(--auth-danger-dim)";
  return (
    <div style={{
      width: 52, height: 52, borderRadius: "50%",
      background: bg, border: `1px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      margin: "0 auto 20px",
    }}>
      <span style={{ color, fontSize: 20, fontWeight: 700 }}>{symbol}</span>
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <div className="auth-brand-panel" style={{
        flex: "0 0 38%",
        maxWidth: 440,
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 44px",
        background: "var(--bg2)",
        borderRight: "1px solid var(--border2)",
      }}>
        <VylappWordmark size={22} />
        <div>
          <div style={{ fontSize: 21, fontWeight: 700, color: "var(--text)", lineHeight: 1.4, marginBottom: 12 }}>
            One place to vibe, learn, and connect.
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.6 }}>
            Sign in to your account to pick up right where you left off.
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text3)" }}>© Vylapp 2026</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div className="auth-mobile-mark" style={{ marginBottom: 24 }}>
            <VylappWordmark size={22} />
          </div>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{title}</h1>
            {subtitle && (
              <p style={{ color: "var(--text2)", marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>{subtitle}</p>
            )}
          </div>

          <div style={authCard}>{children}</div>

          {footer && <div style={{ marginTop: 20, textAlign: "center", fontSize: 13.5, color: "var(--text2)" }}>{footer}</div>}
        </div>
      </div>
    </div>
  );
}
