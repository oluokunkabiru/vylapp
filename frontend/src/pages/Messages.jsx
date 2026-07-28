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

function NewGroupModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const toast = useToast();
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get(`/users/${user.id}/following`)
      .then(({ following }) => setFollowing(following || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  const toggle = (id) => setSelected(s => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const create = async () => {
    if (!name.trim() || !selected.size || creating) return;
    setCreating(true);
    try {
      const { conversationId } = await api.post("/messages/conversations/group", { name: name.trim(), member_ids: [...selected] });
      onCreated(conversationId, name.trim());
    } catch (e) { toast(e.message, "error"); }
    finally { setCreating(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={onClose}>
      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16, padding:24, width:360, maxHeight:"75vh", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight:800, fontSize:16, marginBottom:14 }}>New group</div>
        <input
          value={name} onChange={e => setName(e.target.value)} placeholder="Group name" maxLength={100}
          style={{ padding:"10px 14px", borderRadius:10, border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:14, marginBottom:14 }}
        />
        <div style={{ fontSize:12.5, color:"var(--text3)", marginBottom:8 }}>Add members you follow</div>
        <div style={{ flex:1, overflowY:"auto", marginBottom:14 }}>
          {loading ? <Spinner size={24} /> : (
            <>
              {following.map(f => (
                <label key={f.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 4px", cursor:"pointer" }}>
                  <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
                  <Avatar user={f} size={30} />
                  <span style={{ fontSize:13.5, fontWeight:600 }}>{f.displayName} <span style={{ color:"var(--text3)", fontWeight:400 }}>@{f.handle}</span></span>
                </label>
              ))}
              {!following.length && <div style={{ color:"var(--text3)", fontSize:13, padding:"12px 0" }}>You're not following anyone yet.</div>}
            </>
          )}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"none", border:"1px solid var(--text3)", color:"var(--text3)", fontWeight:700, fontSize:13, padding:"8px 14px", borderRadius:8, cursor:"pointer" }}>Cancel</button>
          <button onClick={create} disabled={!name.trim() || !selected.size || creating} style={{
            background: (name.trim() && selected.size) ? "var(--grad)" : "var(--bg3)",
            border:"none", color: (name.trim() && selected.size) ? "#fff" : "var(--text3)", fontWeight:700, fontSize:13,
            padding:"8px 16px", borderRadius:8, cursor: (name.trim() && selected.size) ? "pointer" : "default",
          }}>{creating ? "Creating…" : "Create group"}</button>
        </div>
      </div>
    </div>
  );
}

function ChatWindow({ convo, lang, onBack, onLeft }) {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showOriginal, setShowOriginal] = useState(new Set());
  const bottomRef = useRef(null);

  const loadMsgs = useCallback(async () => {
    if (!convo) return;
    setLoading(true);
    try {
      const { messages: m } = await api.get(`/messages/conversations/${convo.id}/messages${lang ? `?lang=${lang}` : ""}`);
      setMessages(m || []);
    } catch {}
    finally { setLoading(false); }
  }, [convo, lang]);

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
  const isGroup = convo?.type === "group";

  const leave = async () => {
    if (!window.confirm(`Leave "${convo.name}"?`)) return;
    try {
      await api.post(`/messages/conversations/${convo.id}/leave`);
      toast("Left group");
      onLeft?.();
    } catch (e) { toast(e.message, "error"); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid var(--border2)", flexShrink:0 }}>
        {onBack && <TapIcon d={ic.back} onClick={onBack} label="Back" size={22} />}
        <Avatar user={other} size={36} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:15 }}>{other?.displayName || convo?.name}</div>
          {other?.handle && <div style={{ color:"var(--text2)", fontSize:12 }}>@{other.handle}</div>}
        </div>
        {isGroup && (
          <button onClick={leave} style={{ background:"none", border:"1px solid var(--coral)", color:"var(--coral)", fontWeight:700, fontSize:12, padding:"6px 12px", borderRadius:8, cursor:"pointer" }}>
            Leave
          </button>
        )}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px" }}>
        {loading ? <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner /></div>
         : messages.length === 0 ? <Empty emoji="💬" title="No messages yet" sub="Say hello!" />
         : messages.map((m, i) => {
            const mine = m.sender?.id === user?.id;
            const key = m.id || i;
            const hasTranslation = !!m.translation;
            const original = showOriginal.has(key);
            const text = (hasTranslation && !original) ? m.translation.text : m.content;
            return (
              <div key={key} style={{ display:"flex", flexDirection:"column", alignItems:mine?"flex-end":"flex-start", marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:mine?"flex-end":"flex-start", width:"100%" }}>
                  {!mine && <Avatar user={m.sender} size={28} />}
                  <div style={{
                    maxWidth:"72%", padding:"10px 14px", borderRadius:mine?"16px 16px 4px 16px":"16px 16px 16px 4px",
                    background: mine ? "var(--grad)" : "var(--bg3)",
                    color:"var(--text)", fontSize:14.5, lineHeight:1.45,
                    marginLeft:mine?0:8, marginRight:mine?0:0,
                  }}>{text}</div>
                </div>
                {hasTranslation && (
                  <button
                    onClick={() => setShowOriginal(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                    style={{ background:"none", border:"none", color:"var(--text3)", fontSize:11, marginTop:3, cursor:"pointer", padding:0 }}
                  >
                    {original ? "See translation" : "See original"}
                  </button>
                )}
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

export default function Messages({ lang, onClearBadge }) {
  const { user } = useAuth();
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 800);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadConvos = useCallback(() => {
    return api.get("/messages/conversations").then(({ conversations: c }) => { setConvos(c||[]); onClearBadge?.(); });
  }, [onClearBadge]);

  useEffect(() => {
    if (!user) return;
    loadConvos().catch(() => {}).finally(() => setLoading(false));
  }, [user, loadConvos]);

  const onGroupCreated = (conversationId, name) => {
    setGroupModalOpen(false);
    setActive({ id: conversationId, type: "group", name, otherUser: null });
    loadConvos().catch(() => {});
  };

  const onLeftGroup = () => {
    setActive(null);
    loadConvos().catch(() => {});
  };

  if (!user) return <Empty emoji="💬" title="Sign in to message" sub="Connect with the community in private." />;
  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={32} /></div>;

  const newGroupButton = (
    <button onClick={() => setGroupModalOpen(true)} title="New group" style={{
      width:32, height:32, borderRadius:"50%", background:"var(--bg3)", border:"1px solid var(--border2)",
      display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0,
    }}>
      <Ic d={ic.plus} s={16} c="var(--text2)" />
    </button>
  );

  // Desktop: split pane; mobile: list or chat
  if (isMobile) {
    if (active) return (
      <div style={{ height:"calc(100vh - 112px)", display:"flex", flexDirection:"column" }}>
        <ChatWindow convo={active} lang={lang} onBack={()=>setActive(null)} onLeft={onLeftGroup} />
        {groupModalOpen && <NewGroupModal onClose={()=>setGroupModalOpen(false)} onCreated={onGroupCreated} />}
      </div>
    );
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px" }}>
          <span style={{ fontWeight:800, fontSize:18 }}>Messages</span>
          {newGroupButton}
        </div>
        {convos.length === 0 ? <Empty emoji="💬" title="No conversations yet" sub="Go to a profile and start a DM, or create a group." /> : <ConversationList convos={convos} active={active} onSelect={setActive} />}
        {groupModalOpen && <NewGroupModal onClose={()=>setGroupModalOpen(false)} onCreated={onGroupCreated} />}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"calc(100vh - 56px)" }}>
      <div style={{ width:320, borderRight:"1px solid var(--border2)", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px", borderBottom:"1px solid var(--border2)" }}>
          <span style={{ fontWeight:800, fontSize:18 }}>Messages</span>
          {newGroupButton}
        </div>
        {convos.length === 0 ? <Empty emoji="💬" title="No conversations" sub="Start a DM from someone's profile, or create a group." /> : <ConversationList convos={convos} active={active} onSelect={setActive} />}
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        {active ? <ChatWindow convo={active} lang={lang} onLeft={onLeftGroup} /> : <Empty emoji="💬" title="Pick a conversation" sub="Select a conversation on the left." />}
      </div>
      {groupModalOpen && <NewGroupModal onClose={()=>setGroupModalOpen(false)} onCreated={onGroupCreated} />}
    </div>
  );
}
