import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../lib/socket.js";
import { Avatar, Spinner, Empty, TapIcon, ic, Ic } from "../components/ui/index.jsx";
import { useToast } from "../context/ToastContext.jsx";

function timeAgo(ts) {
  if (!ts) return "";
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return "now";
  if (d < 3600000) return `${Math.floor(d/60000)}m`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h`;
  return `${Math.floor(d/86400000)}d`;
}

function ConversationList({ convos, active, onSelect }) {
  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      {convos.map(c => {
        const other = c.otherUser;
        const isActive = active?.id === c.id;
        return (
          <div key={c.id} onClick={()=>onSelect(c)} style={{
            display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
            borderBottom:"1px solid var(--border2)", cursor:"pointer",
            background: isActive ? "var(--violet-dim)" : "transparent",
          }}>
            <Avatar user={other} size={48} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>{other?.displayName || c.name || "Group"}</div>
              <div style={{
                fontSize:13.5, color: c.unreadCount ? "var(--text)" : "var(--text2)",
                fontWeight: c.unreadCount ? 700 : 400,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              }}>{c.lastMessagePreview || "No messages yet"}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
              <span style={{ color:"var(--text3)", fontSize:12 }}>{timeAgo(c.lastMessageAt)}</span>
              {c.unreadCount > 0 && (
                <span style={{ minWidth:20, height:20, borderRadius:10, background:"var(--violet)", color:"#fff", fontSize:11, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 5px" }}>{c.unreadCount}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChatWindow({ convo, onBack }) {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadMsgs = useCallback(async () => {
    if (!convo) return;
    setLoading(true);
    try {
      const { messages: m } = await api.get(`/messages/conversations/${convo.id}/messages`);
      setMessages(m || []);
    } catch {}
    finally { setLoading(false); }
  }, [convo]);

  useEffect(() => { loadMsgs(); }, [loadMsgs]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!convo) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit("conversation:join", convo.id);
    const onMsg = (data) => {
      if (data.conversationId === convo.id) {
        setMessages(m => [...m, { ...data.message, sender: { id: data.message.senderId } }]);
      }
    };
    socket.on("message:new", onMsg);
    return () => { socket.off("message:new", onMsg); socket.emit("conversation:leave", convo.id); };
  }, [convo]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setSending(true);
    try {
      const { message } = await api.post(`/messages/conversations/${convo.id}/messages`, { content: text });
      setMessages(m => [...m, { ...message, sender: { id: user.id, displayName: user.displayName } }]);
    } catch (e) { toast(e.message, "error"); setDraft(text); }
    finally { setSending(false); }
  };

  const other = convo?.otherUser;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid var(--border2)", flexShrink:0 }}>
        {onBack && <TapIcon d={ic.back} onClick={onBack} label="Back" size={22} />}
        <Avatar user={other} size={36} />
        <div>
          <div style={{ fontWeight:800, fontSize:15 }}>{other?.displayName || convo?.name}</div>
          <div style={{ color:"var(--text2)", fontSize:12 }}>@{other?.handle}</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px" }}>
        {loading ? <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner /></div>
         : messages.length === 0 ? <Empty emoji="💬" title="No messages yet" sub="Say hello!" />
         : messages.map((m, i) => {
            const mine = m.sender?.id === user?.id;
            return (
              <div key={m.id || i} style={{ display:"flex", justifyContent:mine?"flex-end":"flex-start", marginBottom:8 }}>
                {!mine && <Avatar user={m.sender} size={28} />}
                <div style={{
                  maxWidth:"72%", padding:"10px 14px", borderRadius:mine?"16px 16px 4px 16px":"16px 16px 16px 4px",
                  background: mine ? "var(--grad)" : "var(--bg3)",
                  color:"var(--text)", fontSize:14.5, lineHeight:1.45,
                  marginLeft:mine?0:8, marginRight:mine?0:0,
                }}>{m.content}</div>
              </div>
            );
          })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderTop:"1px solid var(--border2)", flexShrink:0 }}>
        <input
          value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          style={{
            flex:1, padding:"11px 16px", borderRadius:"var(--radius-pill)",
            background:"var(--bg3)", border:"1px solid var(--border2)",
            color:"var(--text)", fontSize:14.5, outline:"none",
          }}
        />
        <button onClick={send} disabled={!draft.trim()||sending} style={{
          width:44, height:44, borderRadius:"50%",
          background: draft.trim() ? "var(--grad)" : "var(--bg3)",
          border:"none", display:"flex", alignItems:"center", justifyContent:"center",
          cursor: draft.trim() ? "pointer" : "default",
        }}>
          <Ic d={ic.send} s={18} c={draft.trim()?"#fff":"var(--text3)"} />
        </button>
      </div>
    </div>
  );
}

export default function Messages({ onClearBadge }) {
  const { user } = useAuth();
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 800);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get("/messages/conversations").then(({ conversations: c }) => { setConvos(c||[]); onClearBadge?.(); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [user, onClearBadge]);

  if (!user) return <Empty emoji="💬" title="Sign in to message" sub="Connect with the community in private." />;
  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={32} /></div>;

  // Desktop: split pane; mobile: list or chat
  if (isMobile) {
    if (active) return (
      <div style={{ height:"calc(100vh - 112px)", display:"flex", flexDirection:"column" }}>
        <ChatWindow convo={active} onBack={()=>setActive(null)} />
      </div>
    );
    return (
      <div>
        {convos.length === 0 ? <Empty emoji="💬" title="No conversations yet" sub="Go to a profile and start a DM." /> : <ConversationList convos={convos} active={active} onSelect={setActive} />}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"calc(100vh - 56px)" }}>
      <div style={{ width:320, borderRight:"1px solid var(--border2)", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"16px", borderBottom:"1px solid var(--border2)", fontWeight:800, fontSize:18 }}>Messages</div>
        {convos.length === 0 ? <Empty emoji="💬" title="No conversations" sub="Start a DM from someone's profile." /> : <ConversationList convos={convos} active={active} onSelect={setActive} />}
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        {active ? <ChatWindow convo={active} /> : <Empty emoji="💬" title="Pick a conversation" sub="Select a conversation on the left." />}
      </div>
    </div>
  );
}
