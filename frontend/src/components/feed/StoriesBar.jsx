import { useState, useEffect } from "react";
import { api } from "../../lib/api.js";
import { Avatar } from "../ui/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export function StoriesBar({ onOpenStory }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("/vibes/feed?pageSize=20")
      .then(({ vibes }) => {
        const seen = new Set();
        const storyUsers = [];
        for (const v of (vibes || [])) {
          if (v.author?.id && !seen.has(v.author.id) && v.author.id !== user?.id) {
            seen.add(v.author.id);
            storyUsers.push(v.author);
          }
          if (storyUsers.length >= 8) break;
        }
        setUsers(storyUsers);
      })
      .catch(() => {});
  }, [user?.id]);

  return (
    <div style={{
      display:"flex", gap:16, padding:"14px 16px", overflowX:"auto",
      borderBottom:"1px solid var(--border2)",
    }}>
      {/* My story slot */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0, width:62 }}>
        <div style={{ position:"relative" }}>
          <Avatar user={user} size={58} />
          <div style={{
            position:"absolute", bottom:-2, right:-2, width:20, height:20,
            borderRadius:"50%", background:"var(--violet)",
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"2px solid var(--bg)", fontSize:16, color:"#fff", fontWeight:700,
          }}>+</div>
        </div>
        <span style={{ fontSize:12, color:"var(--text2)", fontWeight:600 }}>Your story</span>
      </div>

      {users.map(u => (
        <div key={u.id} onClick={() => onOpenStory(u)}
          style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0, width:62, cursor:"pointer" }}>
          <Avatar user={u} size={58} story />
          <span style={{
            fontSize:12, color:"var(--text)", fontWeight:600,
            maxWidth:62, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>{u.displayName?.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

export function StoryViewer({ user: storyUser, onClose }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!storyUser) return;
    setProgress(0);
    const t = setInterval(() => setProgress(p => {
      if (p >= 100) { clearInterval(t); setTimeout(onClose, 200); return 100; }
      return p + 1.5;
    }), 60);
    return () => clearInterval(t);
  }, [storyUser, onClose]);

  if (!storyUser) return null;
  const color = storyUser.avatarColor || "#7C3AED";

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"#000", zIndex:400,
      display:"flex", justifyContent:"center",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%", maxWidth:420, display:"flex", flexDirection:"column",
      }}>
        <div style={{ padding:"10px 12px 0", display:"flex", gap:4 }}>
          <div style={{ flex:1, height:3, borderRadius:2, background:"rgba(255,255,255,0.2)", overflow:"hidden" }}>
            <div style={{ height:"100%", background:"#fff", width:`${progress}%`, transition:"width 0.06s linear" }} />
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }} onClick={e=>e.stopPropagation()}>
          <Avatar user={storyUser} size={34} />
          <div style={{ flex:1 }}>
            <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>{storyUser.displayName}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12 }}>@{storyUser.handle}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#fff", fontSize:22, lineHeight:1, padding:8 }}>✕</button>
        </div>
        <div style={{ flex:1, background:`linear-gradient(160deg, ${color}, #08070F)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:80 }}>
          ✦
        </div>
      </div>
    </div>
  );
}
