import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { Avatar, Ic, ic, Spinner, Empty } from "../components/ui/index.jsx";

const TYPE_ICON = { like:ic.heart, repost:ic.repeat, reply:ic.comment, mention:ic.comment, follow:ic.user, connection_request:ic.user, space_invite:ic.spaces, space_live:ic.spaces, dm:ic.send, creator_tip:ic.heart, creator_sub:ic.check, badge_earned:ic.check, system:ic.bell };

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

export default function Notifications({ onClearBadge }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notifications").then(({ notifications: n }) => {
      setNotifs(n || []);
      api.post("/notifications/read-all").catch(() => {});
      onClearBadge?.();
    }).catch(() => {}).finally(() => setLoading(false));
  }, [onClearBadge]);

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={32} /></div>;

  return (
    <div>
      {notifs.length === 0
        ? <Empty emoji="🔔" title="No activity yet" sub="Likes, replies, and connects will show here." />
        : notifs.map(n => (
            <div key={n.id} style={{
              display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
              borderBottom:"1px solid var(--border2)",
              background: n.isRead ? "transparent" : "var(--violet-dim)",
              transition:"background 0.3s",
            }}>
              <Avatar user={n.actor} size={44} />
              <div style={{ flex:1, fontSize:14, lineHeight:1.45 }}>
                <span style={{ fontWeight:800 }}>{n.actor?.displayName || "Vylapp"}</span>{" "}
                <span style={{ color:"var(--text2)" }}>{n.body}</span>
                <div style={{ color:"var(--text3)", fontSize:12, marginTop:3 }}>{timeAgo(n.createdAt)}</div>
              </div>
              <div style={{
                width:38, height:38, borderRadius:10, background:"var(--bg3)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>
                <Ic d={TYPE_ICON[n.type] || ic.bell} s={17} c="var(--text2)" />
              </div>
            </div>
          ))
      }
    </div>
  );
}
