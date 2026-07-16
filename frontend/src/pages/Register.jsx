import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { PrimaryButton } from "../components/ui/index.jsx";
import AuthLayout, { authInput, authLabel, authLink, authButtonStyle, focusAuthInput, blurAuthInput } from "../components/auth/AuthLayout.jsx";

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
      toast("Account created — welcome to Vylapp");
      navigate("/");
    } catch (err) {
      toast(err.message || "Failed to create account", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join the community. Vibe, learn, and connect."
      footer={
        <>Already have an account? <Link to="/login" style={authLink}>Log in</Link></>
      }
    >
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={authLabel}>Display name</label>
          <input
            type="text"
            placeholder="Your full name"
            value={form.displayName}
            onChange={set("displayName")}
            required
            style={authInput}
            onFocus={focusAuthInput}
            onBlur={blurAuthInput}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={authLabel}>Handle</label>
          <input
            type="text"
            placeholder="e.g. alex_vibe"
            value={form.handle}
            onChange={set("handle")}
            required
            pattern="[a-zA-Z0-9._]{3,20}"
            title="3–20 chars, letters/numbers/./_ only"
            style={authInput}
            onFocus={focusAuthInput}
            onBlur={blurAuthInput}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={authLabel}>Email address</label>
          <input
            type="email"
            placeholder="name@example.com"
            value={form.email}
            onChange={set("email")}
            required
            style={authInput}
            onFocus={focusAuthInput}
            onBlur={blurAuthInput}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={authLabel}>Password</label>
          <input
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={set("password")}
            required
            minLength={8}
            style={authInput}
            onFocus={focusAuthInput}
            onBlur={blurAuthInput}
          />
        </div>

        <div style={{ marginTop: 6 }}>
          <PrimaryButton full loading={loading} disabled={loading} style={authButtonStyle}>
            Create Account
          </PrimaryButton>
        </div>
      </form>
    </AuthLayout>
  );
}
