import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { PrimaryButton, VylappWordmark } from "../components/ui/index.jsx";

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
      toast("Password reset successfully! ✓");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      toast(err.message || "Failed to reset password", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 14,
    border: "1.5px solid var(--border)",
    background: "var(--bg3)",
    color: "var(--text)",
    fontSize: 15.5,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "var(--bg)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at 50% 45%, rgba(139,92,246,0.11) 0%, transparent 60%)",
        pointerEvents: "none"
      }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", animation: "slideUp 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <VylappWordmark size={36} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginTop: 16 }}>Set New Password</h2>
          <p style={{ color: "var(--text2)", marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>
            Create a secure password to protect your Vylapp account.
          </p>
        </div>

        <div style={{
          background: "rgba(13,12,24,0.7)",
          backdropFilter: "blur(12px)",
          borderRadius: 24,
          padding: "36px 30px",
          border: "1px solid rgba(139,92,246,0.15)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}>
          {!token ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Invalid Reset Link</h3>
              <p style={{ color: "var(--text2)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 24 }}>
                This password reset link is invalid or has expired. Please request a new link.
              </p>
              <Link to="/forgot-password">
                <PrimaryButton full>Request New Link</PrimaryButton>
              </Link>
            </div>
          ) : !success ? (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.3 }}>NEW PASSWORD</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={form.newPassword}
                  onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                  minLength={8}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--violet-lt)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.3 }}>CONFIRM PASSWORD</label>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--violet-lt)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <PrimaryButton full loading={loading} disabled={loading}>
                Reset Password
              </PrimaryButton>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--green-dim)",
                border: "1px solid var(--green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <span style={{ color: "var(--green)", fontSize: 28, fontWeight: 800 }}>✓</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Password Updated</h3>
              <p style={{ color: "var(--text2)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 20 }}>
                Your password has been successfully reset.
              </p>
              <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 20 }}>
                Redirecting you to the login page...
              </p>
              <Link to="/login">
                <PrimaryButton full>Login Now</PrimaryButton>
              </Link>
            </div>
          )}

          <div style={{
            textAlign: "center",
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid var(--border2)",
            fontSize: 14,
            color: "var(--text2)"
          }}>
            <Link to="/login" style={{ color: "var(--violet-lt)", fontWeight: 700 }}>
              ← Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
