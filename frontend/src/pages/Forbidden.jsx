import { Link, useNavigate } from "react-router-dom";

export default function Forbidden({ title = "Access denied", message = "Your current role does not have permission to open this page." }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--bg)" }}>
      <div style={{ width:"min(480px, 100%)", padding:"42px 28px", borderRadius:24, background:"var(--bg2)", border:"1px solid var(--border)", textAlign:"center", boxShadow:"var(--shadow-lg)" }}>
        <div style={{ fontFamily:"var(--mono)", fontSize:64, lineHeight:1, fontWeight:900, color:"var(--coral)" }}>403</div>
        <h1 style={{ margin:"16px 0 8px", fontSize:24 }}>{title}</h1>
        <p style={{ margin:"0 auto 24px", maxWidth:360, color:"var(--text2)", fontSize:14, lineHeight:1.6 }}>{message}</p>
        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:10 }}>
          <button onClick={() => navigate(-1)} style={{ padding:"10px 16px", borderRadius:999, border:"1px solid var(--border)", background:"transparent", color:"var(--text)", fontWeight:800, cursor:"pointer" }}>Go back</button>
          <Link to="/dashboard" style={{ padding:"10px 16px", borderRadius:999, background:"var(--grad)", color:"#fff", fontWeight:800, textDecoration:"none" }}>My dashboard</Link>
        </div>
      </div>
    </div>
  );
}
