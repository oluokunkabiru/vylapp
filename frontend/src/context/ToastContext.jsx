import { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const toast = useCallback((message, type = "success") => {
    const id = ++counter.current;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position:"fixed", bottom:96, left:"50%", transform:"translateX(-50%)", zIndex:500, display:"flex", flexDirection:"column", gap:8, alignItems:"center", pointerEvents:"none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"11px 20px", borderRadius:"var(--radius-pill)",
            background:"var(--bg4)", color:"var(--text)",
            border:"1px solid var(--border)", boxShadow:"var(--shadow-card)",
            fontWeight:700, fontSize:14, whiteSpace:"nowrap",
            animation:"slideUp 0.22s ease",
          }}>
            {t.type === "success" && <span style={{color:"var(--green)"}}>✓</span>}
            {t.type === "error"   && <span style={{color:"var(--coral)"}}>✕</span>}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
