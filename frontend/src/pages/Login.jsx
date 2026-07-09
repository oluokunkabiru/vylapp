import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { PrimaryButton, VylappWordmark } from "../components/ui/index.jsx";

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ emailOrHandle: "", password: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.emailOrHandle || !form.password) {
      toast("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      await login(form.emailOrHandle, form.password);
      toast("Welcome back! ✓");
      navigate("/");
    } catch (err) {
      toast(err.message || "Invalid credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  const useDemoPersona = () => {
    setForm({ emailOrHandle: "aisha.k", password: "VylappDemo123!" });
    toast("Demo credentials loaded! Click Log In.");
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
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <VylappWordmark size={36} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginTop: 16 }}>Welcome Back</h2>
          <p style={{ color: "var(--text2)", marginTop: 6, fontSize: 14.5 }}>
            Log in to vibe, learn, and connect with the community.
          </p>
        </div>

        <div style={{
          background: "rgba(13,12,24,0.75)",
          backdropFilter: "blur(12px)",
          borderRadius: 24,
          padding: "36px 30px",
          border: "1px solid rgba(139,92,246,0.15)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.3 }}>EMAIL OR HANDLE</label>
              <input
                type="text"
                placeholder="name@example.com or username"
                value={form.emailOrHandle}
                onChange={set("emailOrHandle")}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.3 }}>PASSWORD</label>
                <Link to="/forgot-password" style={{ fontSize: 12.5, color: "var(--violet-lt)", fontWeight: 700 }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
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

            <div style={{ marginTop: 8 }}>
              <PrimaryButton full loading={loading} disabled={loading}>
                Log In
              </PrimaryButton>
            </div>
          </form>

          {/* Quick Demo Assist */}
          <div style={{
            marginTop: 24,
            padding: "12px 14px",
            background: "rgba(56,189,248,0.06)",
            border: "1px dashed rgba(56,189,248,0.25)",
            borderRadius: 12,
            textAlign: "center"
          }}>
            <span style={{ fontSize: 12.5, color: "var(--text2)", display: "block", marginBottom: 6 }}>
              Testing the application?
            </span>
            <button 
              type="button"
              onClick={useDemoPersona}
              style={{
                background: "var(--sky-dim)",
                border: "1px solid var(--sky)",
                color: "var(--sky)",
                fontSize: 12.5,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(56,189,248,0.2)"}
              onMouseLeave={(e) => e.target.style.background = "var(--sky-dim)"}
            >
              Use Demo Persona
            </button>
          </div>

          <div style={{
            textAlign: "center",
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid var(--border2)",
            fontSize: 14,
            color: "var(--text2)"
          }}>
            New to Vylapp?{" "}
            <Link to="/register" style={{ color: "var(--violet-lt)", fontWeight: 700 }}>
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
