import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { PrimaryButton, GhostButton } from "../ui/index.jsx";
import { authInput, authLabel, focusAuthInput, blurAuthInput } from "./AuthLayout.jsx";

// I-02: phone + one-time code, collapsed behind a toggle so it doesn't
// compete with the primary email/password form. One flow covers both a
// returning number and a brand new one — the backend finds-or-creates the
// account on verify, so there's nothing here that branches on "is this
// registration or login."
export default function PhoneSignIn() {
  const { requestPhoneOtp, verifyPhoneOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("phone"); // "phone" | "code"
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast("Enter a phone number", "error");
    setLoading(true);
    try {
      const res = await requestPhoneOtp(phone.trim());
      setDevCode(res?.devCode || null); // only ever present in dev/mock mode — see backend/.env OTP_PROVIDER
      setStep("code");
      toast(res?.devCode ? `Dev mode — code is ${res.devCode}` : "Code sent");
    } catch (err) {
      toast(err.message || "Couldn't send a code — check the number and try again", "error");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!code.trim()) return toast("Enter the code", "error");
    setLoading(true);
    try {
      await verifyPhoneOtp(phone.trim(), code.trim());
      toast("Welcome!");
      navigate("/");
    } catch (err) {
      toast(err.message || "That code didn't work", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border2)",
          background: "var(--bg)", color: "var(--text)", fontSize: 14, fontWeight: 600,
          textDecoration: "none", cursor: "pointer", width: "100%", marginTop: 10,
        }}
      >
        Continue with phone
      </button>
    );
  }

  return (
    <div style={{ marginTop: 14, padding: 14, borderRadius: 10, border: "1px solid var(--border2)", display: "flex", flexDirection: "column", gap: 12 }}>
      {step === "phone" ? (
        <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={authLabel}>Phone number</label>
          <input
            type="tel"
            placeholder="+15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={authInput}
            onFocus={focusAuthInput}
            onBlur={blurAuthInput}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryButton full loading={loading} disabled={loading}>Send code</PrimaryButton>
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
          </div>
        </form>
      ) : (
        <form onSubmit={verify} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={authLabel}>Enter the code sent to {phone}</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            style={authInput}
            onFocus={focusAuthInput}
            onBlur={blurAuthInput}
          />
          {devCode && (
            <div style={{ fontSize: 12.5, color: "var(--text3)" }}>
              Dev mode (no SMS provider configured) — the code is <strong>{devCode}</strong>.
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryButton full loading={loading} disabled={loading}>Verify &amp; continue</PrimaryButton>
            <GhostButton onClick={() => { setStep("phone"); setCode(""); }}>Back</GhostButton>
          </div>
        </form>
      )}
    </div>
  );
}
