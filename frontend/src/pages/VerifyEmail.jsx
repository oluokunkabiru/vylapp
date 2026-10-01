import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { PrimaryButton } from "../components/ui/index.jsx";
import AuthLayout, { authButtonStyle, authLink, AuthStatusBadge } from "../components/auth/AuthLayout.jsx";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    api.post("/auth/verify-email", { token })
      .then(() => { setState("success"); setMessage("Your email address has been verified."); })
      .catch(error => { setState("error"); setMessage(error.message || "This verification link is invalid or has expired."); });
  }, [token]);

  return (
    <AuthLayout
      title={state === "success" ? "Email verified" : state === "loading" ? "Verifying email" : "Verification failed"}
      subtitle={state === "loading" ? "Please wait while we confirm your email address." : undefined}
      footer={<Link to="/login" style={authLink}>← Continue to login</Link>}
    >
      {state === "loading" ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text2)" }}>Checking your verification link…</div>
      ) : (
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <AuthStatusBadge tone={state === "success" ? "success" : "error"} symbol={state === "success" ? "✓" : "!"} />
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6, margin: "14px 0 20px" }}>{message}</p>
          <Link to={state === "success" ? "/login" : "/forgot-password"}>
            <PrimaryButton full style={authButtonStyle}>{state === "success" ? "Log in" : "Request a new link"}</PrimaryButton>
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
