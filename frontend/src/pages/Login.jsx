import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { PrimaryButton } from "../components/ui/index.jsx";
import AuthLayout, { authInput, authLabel, authLink, authButtonStyle, focusAuthInput, blurAuthInput } from "../components/auth/AuthLayout.jsx";
import SocialSignInButtons from "../components/auth/SocialSignInButtons.jsx";

const OAUTH_ERROR_MESSAGES = {
  account_suspended: "That account has been suspended.",
  account_exists: "An account with this email already exists — log in with your password to link it.",
  invalid_or_expired_state: "That sign-in link expired — please try again.",
  oauth_failed: "Sign-in failed — please try again.",
};

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({ emailOrHandle: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Surfaces failures redirected back from the OAuth callback (?oauth_error=...)
  // — strip the param right after so a refresh doesn't re-show the toast.
  useEffect(() => {
    const err = searchParams.get("oauth_error");
    if (!err) return;
    toast(OAUTH_ERROR_MESSAGES[err] || "Sign-in failed — please try again.", "error");
    searchParams.delete("oauth_error");
    setSearchParams(searchParams, { replace: true });
  }, []); // eslint-disable-line

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
      <SocialSignInButtons />
    </AuthLayout>
  );
}
