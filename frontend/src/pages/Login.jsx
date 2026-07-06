import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { PrimaryButton, VylappWordmark } from "../components/ui/index.jsx";

export default function Login() {
  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ email:"", handle:"", password:"", displayName:"" });
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email || form.handle, form.password);
      } else {
        await register(form);
      }
      navigate("/");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width:"100%", padding:"13px 16px", borderRadius:14, border:"1.5px solid var(--border)",
    background:"var(--bg3)", color:"var(--text)", fontSize:15, outline:"none",
    transition:"border-color 0.15s",
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:24,
      background:"var(--bg)",
    }}>
      {/* Ambient glow */}
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at 50% 60%, rgba(124,58,237,0.08) 0%, transparent 60%)", pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:380, position:"relative" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <VylappWordmark size={32} />
          <p style={{ color:"var(--text2)", marginTop:8, fontSize:15 }}>
            {mode === "login" ? "Welcome back to the community" : "Join the global community"}
          </p>
        </div>

        <div style={{
          background:"var(--bg2)", borderRadius:24, padding:"28px 24px",
          border:"1px solid var(--border)", boxShadow:"var(--shadow-card)",
        }}>
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {mode === "register" && (
              <>
                <input type="text" placeholder="Your name" value={form.displayName} onChange={set("displayName")}
                  required style={inputStyle} />
                <input type="text" placeholder="Handle (e.g. aisha.k)" value={form.handle} onChange={set("handle")}
                  required pattern="[a-zA-Z0-9._]{3,20}" title="3–20 chars, letters/numbers/./_ only"
                  style={inputStyle} />
              </>
            )}
            <input
              type={mode === "login" ? "text" : "email"}
              placeholder={mode === "login" ? "Email or handle" : "Email"}
              value={mode === "login" ? (form.email || form.handle) : form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required style={inputStyle}
            />
            <input type="password" placeholder="Password" value={form.password} onChange={set("password")}
              required minLength={8} style={inputStyle} />

            <PrimaryButton full loading={loading} disabled={loading}>
              {mode === "login" ? "Log in" : "Create account"}
            </PrimaryButton>
          </form>

          <div style={{ textAlign:"center", marginTop:20, fontSize:14, color:"var(--text2)" }}>
            {mode === "login" ? "New to Vylapp? " : "Already have an account? "}
            <button onClick={() => setMode(m => m==="login"?"register":"login")} style={{
              background:"none", border:"none", color:"var(--violet-lt)", fontWeight:700, cursor:"pointer",
            }}>{mode === "login" ? "Join now" : "Log in"}</button>
          </div>

          {mode === "login" && (
            <div style={{ textAlign:"center", marginTop:16, padding:"12px 0", borderTop:"1px solid var(--border2)" }}>
              <span style={{ fontSize:12.5, color:"var(--text3)" }}>Demo persona: </span>
              <button onClick={()=>setForm(f=>({...f,email:"aisha.k",password:"VylappDemo123!"}))} style={{
                background:"none", border:"none", color:"var(--sky)", fontSize:12.5, fontWeight:700, cursor:"pointer",
              }}>aisha.k / VylappDemo123!</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
