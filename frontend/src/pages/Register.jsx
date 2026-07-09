import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { PrimaryButton, VylappWordmark } from "../components/ui/index.jsx";

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    email: "",
    handle: "",
    password: "",
    displayName: ""
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.handle || !form.password || !form.displayName) {
      toast("All fields are required", "error");
      return;
    }
    if (form.password.length < 8) {
      toast("Password must be at least 8 characters", "error");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      toast("Account created successfully! Welcome ✓");
      navigate("/");
    } catch (err) {
      toast(err.message || "Failed to create account", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 14,
    border: "1.5px solid var(--border)",
    background: "var(--bg3)",
    color: "var(--text)",
    fontSize: 15,
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
      {/* Ambient glow */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse at 50% 60%, rgba(139,92,246,0.09) 0%, transparent 60%)",
        pointerEvents: "none"
      }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", animation: "slideUp 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <VylappWordmark size={32} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginTop: 14 }}>Create your account</h2>
          <p style={{ color: "var(--text2)", marginTop: 6, fontSize: 14.5 }}>
            Join the global community. Vibe. Learn. Connect.
          </p>
        </div>

        <div style={{
          background: "rgba(13,12,24,0.75)",
          backdropFilter: "blur(12px)",
          borderRadius: 24,
          padding: "28px 24px",
          border: "1px solid rgba(139,92,246,0.15)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.3 }}>DISPLAY NAME</label>
              <input
                type="text"
                placeholder="Your full name"
                value={form.displayName}
                onChange={set("displayName")}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.3 }}>HANDLE (UNIQUE ID)</label>
              <input
                type="text"
                placeholder="e.g. alex_vibe"
                value={form.handle}
                onChange={set("handle")}
                required
                pattern="[a-zA-Z0-9._]{3,20}"
                title="3–20 chars, letters/numbers/./_ only"
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

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.3 }}>EMAIL ADDRESS</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={set("email")}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.3 }}>PASSWORD</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={set("password")}
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

            <div style={{ marginTop: 8 }}>
              <PrimaryButton full loading={loading} disabled={loading}>
                Create Account
              </PrimaryButton>
            </div>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text2)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--violet-lt)", fontWeight: 700 }}>
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
