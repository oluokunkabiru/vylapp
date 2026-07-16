import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { PrimaryButton } from "../components/ui/index.jsx";
import AuthLayout, { authInput, authLabel, authLink, authButtonStyle, focusAuthInput, blurAuthInput, AuthStatusBadge } from "../components/auth/AuthLayout.jsx";

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast("Invalid reset link. No token found.", "error");
    }
  }, [token, toast]);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast("Reset token is missing. Please request a new link.", "error");
      return;
    }
    if (form.newPassword.length < 8) {
      toast("Password must be at least 8 characters long", "error");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      toast("Password reset successfully");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      toast(err.message || "Failed to reset password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Create a secure password to protect your Vylapp account."
      footer={<Link to="/login" style={authLink}>← Return to login</Link>}
    >
      {!token ? (
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <AuthStatusBadge tone="error" symbol="!" />
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Invalid reset link</h3>
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <PrimaryButton full style={authButtonStyle}>Request New Link</PrimaryButton>
          </Link>
        </div>
      ) : !success ? (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <label style={authLabel}>New password</label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={form.newPassword}
              onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))}
              required
              minLength={8}
              style={authInput}
              onFocus={focusAuthInput}
              onBlur={blurAuthInput}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <label style={authLabel}>Confirm password</label>
            <input
              type="password"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              required
              style={authInput}
              onFocus={focusAuthInput}
              onBlur={blurAuthInput}
            />
          </div>

          <PrimaryButton full loading={loading} disabled={loading} style={authButtonStyle}>
            Reset Password
          </PrimaryButton>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <AuthStatusBadge tone="success" />
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Password updated</h3>
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            Your password has been successfully reset.
          </p>
          <p style={{ color: "var(--text3)", fontSize: 12.5, marginBottom: 20 }}>
            Redirecting you to the login page...
          </p>
          <Link to="/login">
            <PrimaryButton full style={authButtonStyle}>Login Now</PrimaryButton>
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
