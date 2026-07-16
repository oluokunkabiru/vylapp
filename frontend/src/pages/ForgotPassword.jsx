import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { PrimaryButton } from "../components/ui/index.jsx";
import AuthLayout, { authInput, authLabel, authLink, authButtonStyle, focusAuthInput, blurAuthInput, AuthStatusBadge } from "../components/auth/AuthLayout.jsx";

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
      toast("Reset link sent to your email");
    } catch (err) {
      toast(err.message || "Failed to send reset link", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email address and we'll send you a link to reset your password."
      footer={<Link to="/login" style={authLink}>← Back to login</Link>}
    >
      {!submitted ? (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <label style={authLabel}>Email address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={authInput}
              onFocus={focusAuthInput}
              onBlur={blurAuthInput}
            />
          </div>

          <PrimaryButton full loading={loading} disabled={loading} style={authButtonStyle}>
            Send Reset Link
          </PrimaryButton>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <AuthStatusBadge tone="success" />
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Check your inbox</h3>
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            We've sent a password reset link to <strong>{email}</strong>.
            Check your email and click the link to continue.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--auth-accent)",
              fontWeight: 600,
              fontSize: 13.5,
            }}
          >
            Resend link
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
