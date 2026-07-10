import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { PrimaryButton } from "../components/ui/index.jsx";
import AuthLayout, { authInput, authLabel, authLink, authButtonStyle, focusAuthInput, blurAuthInput } from "../components/auth/AuthLayout.jsx";

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
      toast("Welcome back");
      navigate("/");
    } catch (err) {
      toast(err.message || "Invalid credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  const useDemoPersona = () => {
    setForm({ emailOrHandle: "aisha.k", password: "VylappDemo123!" });
    toast("Demo credentials loaded — click Log In");
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Log in to vibe, learn, and connect with the community."
      footer={
        <>New to Vylapp? <Link to="/register" style={authLink}>Create an account</Link></>
      }
    >
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <label style={authLabel}>Email or handle</label>
          <input
            type="text"
            placeholder="name@example.com or username"
            value={form.emailOrHandle}
            onChange={set("emailOrHandle")}
            required
            style={authInput}
            onFocus={focusAuthInput}
            onBlur={blurAuthInput}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={authLabel}>Password</label>
            <Link to="/forgot-password" style={{ ...authLink, fontSize: 12.5 }}>
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={set("password")}
            required
            style={authInput}
            onFocus={focusAuthInput}
            onBlur={blurAuthInput}
          />
        </div>

        <div style={{ marginTop: 6 }}>
          <PrimaryButton full loading={loading} disabled={loading} style={authButtonStyle}>
            Log In
          </PrimaryButton>
        </div>
      </form>

      <div style={{
        marginTop: 22,
        padding: "12px 14px",
        background: "var(--bg)",
        border: "1px solid var(--border2)",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <span style={{ fontSize: 12.5, color: "var(--text2)" }}>
          Testing the application?
        </span>
        <button
          type="button"
          onClick={useDemoPersona}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text2)",
            fontSize: 12.5,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 6,
            whiteSpace: "nowrap",
          }}
        >
          Use demo persona
        </button>
      </div>
    </AuthLayout>
  );
}
