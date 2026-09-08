import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../lib/socket.js";
import { Avatar, Spinner, Empty, TapIcon, ic, Ic } from "../components/ui/index.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { isRtl } from "../lib/languages.js";

function timeAgo(ts) {
  if (!ts) return "";
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return "now";
  if (d < 3600000) return `${Math.floor(d/60000)}m`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h`;
  return `${Math.floor(d/86400000)}d`;
}

// C-13 — a stranger's first DM lands here, not in the main inbox, until
// accepted (explicitly, or implicitly by replying — see sendMessage on
// the backend). Decline just hides it; the sender is never told.
function RequestList({ requests, onAccept, onDecline }) {
  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      {requests.map(c => {
        const other = c.otherUser;
        return (
          <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderBottom:"1px solid var(--border2)" }}>
            <Avatar user={other} size={48} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>{other?.displayName || c.name || "Someone"}</div>
              <div style={{ fontSize:13.5, color:"var(--text2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.lastMessagePreview || "No messages yet"}</div>
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <button onClick={()=>onAccept(c.id)} style={{ padding:"6px 12px", borderRadius:"var(--radius-pill)", background:"var(--grad)", color:"#fff", fontWeight:700, fontSize:12.5 }}>Accept</button>
              <button onClick={()=>onDecline(c.id)} style={{ padding:"6px 12px", borderRadius:"var(--radius-pill)", border:"1px solid var(--border)", background:"transparent", color:"var(--text2)", fontWeight:700, fontSize:12.5 }}>Decline</button>
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [replyTo, setReplyTo] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStreamRef = useRef(null);

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
        // Found live: sending a message both appends it locally (below) AND
        // the server broadcasts it back over the socket to every member of
        // the conversation, including the sender — without this guard the
        // sender saw their own message twice. Dedupe by id.
        setMessages(m => m.some(x => x.id === data.message.id) ? m : [...m, { ...data.message, sender: data.message.sender || { id: data.message.senderId } }]);
      }
    };
    socket.on("message:new", onMsg);
    return () => { socket.off("message:new", onMsg); socket.emit("conversation:leave", convo.id); };
  }, [convo]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  useEffect(() => () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const uploadFiles = async files => {
    const room = 4 - attachments.length;
    const selected = [...files].slice(0, room);
    if (!selected.length) {
      toast("A message can contain up to 4 attachments", "error");
      return [];
    }
    setUploading(true);
    const uploaded = [];
    try {
      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        const { media } = await api.upload("/media/upload", form);
        uploaded.push({ ...media, name: file.name });
      }
      setAttachments(current => [...current, ...uploaded]);
      return uploaded;
    } catch (error) {
      await Promise.all(uploaded.map(item => api.delete(`/media/${item.id}`).catch(() => {})));
      toast(error.message, "error");
      return [];
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = async item => {
    setAttachments(current => current.filter(attachment => attachment.id !== item.id));
    await api.delete(`/media/${item.id}`).catch(() => {});
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast("Voice recording is not supported by this browser", "error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      const chunks = [];
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const fileType = (recorder.mimeType || "audio/webm").split(";")[0];
        const extension = fileType === "audio/mp4" ? "m4a" : "webm";
        if (blob.size) await uploadFiles([new File([blob], `voice-note-${Date.now()}.${extension}`, { type: fileType })]);
      };
      recorder.start();
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(value => value + 1), 1000);
    } catch (error) {
      toast(error?.name === "NotAllowedError" ? "Microphone permission was denied" : "Could not start voice recording", "error");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  };

  const send = async () => {
    const text = draft.trim();
    if ((!text && !attachments.length) || sending || uploading || recording) return;
    const pendingAttachments = attachments;
    const pendingReply = replyTo;
    setDraft("");
    setSending(true);
    try {
      const { message } = await api.post(`/messages/conversations/${convo.id}/messages`, {
        content: text,
        mediaIds: pendingAttachments.map(item => item.id),
        replyToId: pendingReply?.id || null,
      });
      // Guards the same way the socket handler above does — the socket
      // broadcast and this response can arrive in either order.
      setMessages(m => m.some(x => x.id === message.id) ? m : [...m, {
        ...message,
        replyTo: message.replyTo || (pendingReply ? {
          id: pendingReply.id,
          content: pendingReply.content,
          contentType: pendingReply.contentType,
          sender: pendingReply.sender,
        } : null),
        sender: { id: user.id, displayName: user.displayName },
      }]);
      setAttachments([]);
      setReplyTo(null);
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
        {onBack && <TapIcon d={ic.back} onClick={onBack} label="Back" size={22} directional />}
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
            // Design doc: "a conversation where two people write in different
            // scripts and each reads in their own is the most powerful
            // demonstration your product has." The bubble text was never
            // carrying lang/dir, so mixed-script conversations rendered with
            // no per-script line-height (D-02/D-04) and no bidi correctness.
            const shownLang = (hasTranslation && !original) ? lang : (m.language || "en");
            return (
              <div key={key} style={{ display:"flex", flexDirection:"column", alignItems:mine?"flex-end":"flex-start", marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:mine?"flex-end":"flex-start", width:"100%" }}>
                  {!mine && <Avatar user={m.sender} size={28} />}
                  <div lang={shownLang} dir={isRtl(shownLang) ? "rtl" : "ltr"} className={`vy-message-bubble ${mine ? "vy-message-bubble--mine" : "vy-message-bubble--other"}`} style={{
                    maxWidth:"72%", padding:"10px 14px", borderRadius:mine?"16px 16px 4px 16px":"16px 16px 16px 4px",
                    background: mine ? "var(--grad)" : "var(--bg3)",
                    color:"var(--text)", fontSize:14.5, lineHeight:1.45,
                    marginLeft:mine?0:8, marginRight:mine?0:0,
                  }}>
                    {m.replyTo && (
                      <div style={{ borderLeft:"3px solid currentColor", padding:"5px 8px", marginBottom:7, opacity:0.72, background:"rgba(0,0,0,0.1)", borderRadius:6, fontSize:12 }}>
                        <strong>{m.replyTo.sender?.displayName || "Message"}</strong>
                        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:250 }}>{m.replyTo.content || "Attachment"}</div>
                      </div>
                    )}
                    {(m.media || []).map(media => (
                      <div key={media.id || media.url} style={{ marginBottom:m.content ? 8 : 0 }}>
                        {media.mediaType === "image" && <a href={media.url} target="_blank" rel="noreferrer"><img src={media.url} alt="Message attachment" style={{ display:"block", maxWidth:"100%", maxHeight:300, borderRadius:10 }} /></a>}
                        {media.mediaType === "video" && <video src={media.url} poster={media.thumbnailUrl || undefined} controls playsInline style={{ display:"block", maxWidth:"100%", maxHeight:300, borderRadius:10 }} />}
                        {media.mediaType === "audio" && <audio src={media.url} controls preload="metadata" style={{ width:"min(280px, 100%)", display:"block" }} />}
                        {media.mediaType === "document" && <a href={media.url} target="_blank" rel="noreferrer" style={{ color:"inherit", fontWeight:800, textDecoration:"underline" }}>📄 Open PDF attachment</a>}
                      </div>
                    ))}
                    {text && <span style={{ whiteSpace:"pre-wrap", overflowWrap:"anywhere" }}>{text}</span>}
                  </div>
                </div>
                {hasTranslation && (
                  <button
                    onClick={() => setShowOriginal(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                    style={{ background:"none", border:"none", color:"var(--text3)", fontSize:11, marginTop:3, cursor:"pointer", padding:0 }}
                  >
                    {original ? "See translation" : "See original"}
                  </button>
                )}
                <button onClick={() => setReplyTo(m)} style={{ background:"none", border:"none", color:"var(--text3)", fontSize:11, marginTop:3, padding:"2px 4px", cursor:"pointer" }}>↩ Reply</button>
              </div>
            );
          })}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px", borderTop:"1px solid var(--border2)", background:"var(--bg2)" }}>
          <div style={{ flex:1, minWidth:0, borderLeft:"3px solid var(--violet-lt)", paddingLeft:10 }}>
            <div style={{ fontSize:12, color:"var(--violet-lt)", fontWeight:800 }}>Replying to {replyTo.sender?.displayName || "message"}</div>
            <div style={{ color:"var(--text2)", fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{replyTo.content || "Attachment"}</div>
          </div>
          <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" style={{ background:"none", border:"none", color:"var(--text2)", fontSize:20, cursor:"pointer" }}>×</button>
        </div>
      )}

      {!!attachments.length && (
        <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"8px 16px", borderTop:"1px solid var(--border2)", background:"var(--bg2)" }}>
          {attachments.map(item => (
            <div key={item.id} style={{ position:"relative", minWidth:76, width:76, height:62, borderRadius:10, overflow:"hidden", border:"1px solid var(--border)", background:"var(--bg3)" }}>
              {item.mediaType === "image" ? <img src={item.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (
                <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:5, fontSize:10, textAlign:"center", color:"var(--text2)" }}>
                  <span style={{ fontSize:18 }}>{item.mediaType === "audio" ? "🎤" : item.mediaType === "video" ? "🎬" : "📄"}</span>
                  <span style={{ width:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name || item.mediaType}</span>
                </div>
              )}
              <button onClick={() => removeAttachment(item)} aria-label="Remove attachment" style={{ position:"absolute", top:2, right:2, width:20, height:20, borderRadius:"50%", border:0, background:"rgba(0,0,0,.72)", color:"#fff", cursor:"pointer" }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderTop:"1px solid var(--border2)", flexShrink:0 }}>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,audio/*,application/pdf" multiple hidden onChange={event => uploadFiles(event.target.files)} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading || recording || attachments.length >= 4} title="Attach image, video, audio, or PDF" aria-label="Add attachment" style={{ width:40, height:40, flexShrink:0, borderRadius:"50%", border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text2)", fontSize:20, cursor:"pointer", opacity:uploading?0.55:1 }}>📎</button>
        <input dir="auto"
          value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={recording ? `Recording voice note… ${Math.floor(recordingSeconds/60)}:${String(recordingSeconds%60).padStart(2,"0")}` : attachments.length ? "Add a caption…" : "Type a message…"}
          disabled={recording}
          style={{
            flex:1, padding:"11px 16px", borderRadius:"var(--radius-pill)",
            background:"var(--bg3)", border:"1px solid var(--border2)",
            color:"var(--text)", fontSize:14.5, outline:"none",
          }}
        />
        {!draft.trim() && !attachments.length ? (
          <button onClick={recording ? stopRecording : startRecording} disabled={uploading} title={recording ? "Stop recording" : "Record voice note"} aria-label={recording ? "Stop recording" : "Record voice note"} style={{
            width:44, height:44, borderRadius:"50%", border:"none", display:"flex", alignItems:"center", justifyContent:"center",
            background:recording?"var(--coral)":"var(--violet-dim)", color:recording?"#fff":"var(--violet-lt)", cursor:"pointer", fontSize:18,
          }}>{recording ? "■" : <Ic d={ic.mic} s={19} />}</button>
        ) : <button onClick={send} disabled={sending||uploading||recording} style={{
          width:44, height:44, borderRadius:"50%",
          background: "var(--grad)",
          border:"none", display:"flex", alignItems:"center", justifyContent:"center",
          cursor: sending || uploading ? "wait" : "pointer",
        }}>
          <Ic d={ic.send} s={18} c="#fff" className="vy-dir-icon" />
        </button>}
      </div>
    </div>
  );
}

export default function Messages({ lang, onClearBadge }) {
  const { user } = useAuth();
  const toast = useToast();
  const [convos, setConvos] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("chats"); // "chats" | "requests"
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 800);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadConvos = useCallback(() => {
    return api.get("/messages/conversations").then(({ conversations: c }) => {
      const list = c || [];
      setConvos(list);
      if (requestedConversationId) {
        const requested = list.find(conversation => conversation.id === requestedConversationId);
        if (requested) {
          setActive(requested);
          setTab("chats");
        }
      }
      onClearBadge?.();
    });
  }, [onClearBadge, requestedConversationId]);

  const loadRequests = useCallback(() => {
    return api.get("/messages/requests").then(({ requests: r }) => setRequests(r||[])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([loadConvos().catch(() => {}), loadRequests()]).finally(() => setLoading(false));
  }, [user, loadConvos, loadRequests]);

  const acceptRequest = async id => {
    try {
      await api.post(`/messages/conversations/${id}/accept`);
      await Promise.all([loadConvos(), loadRequests()]);
      toast("Request accepted");
    } catch (e) { toast(e.message, "error"); }
  };
  const declineRequest = async id => {
    try {
      await api.post(`/messages/conversations/${id}/decline`);
      setRequests(r => r.filter(c => c.id !== id));
    } catch (e) { toast(e.message, "error"); }
  };

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

  // C-13 — kept as simple pills rather than the shared Tabs primitive: this
  // needs a badge count on "Requests", which Tabs doesn't support.
  const tabRow = (
    <div style={{ display:"flex", gap:8, padding:"0 16px 12px" }}>
      {[["chats","Chats"], ["requests", requests.length ? `Requests · ${requests.length}` : "Requests"]].map(([k,l]) => (
        <button key={k} onClick={()=>setTab(k)} style={{
          padding:"6px 14px", borderRadius:"var(--radius-pill)", fontSize:13, fontWeight:700,
          border:`1px solid ${tab===k ? "var(--violet)" : "var(--border)"}`,
          background: tab===k ? "var(--violet-dim)" : "transparent",
          color: tab===k ? "var(--violet-lt)" : "var(--text2)",
        }}>{l}</button>
      ))}
    </div>
  );

  const listBody = tab === "requests"
    ? (requests.length === 0
        ? <Empty emoji="✅" title="No pending requests" sub="Messages from people who don't follow you land here." />
        : <RequestList requests={requests} onAccept={acceptRequest} onDecline={declineRequest} />)
    : (convos.length === 0
        ? <Empty emoji="💬" title="No conversations yet" sub="Go to a profile and start a DM, or create a group." />
        : <ConversationList convos={convos} active={active} onSelect={setActive} />);

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
        {tabRow}
        {listBody}
        {groupModalOpen && <NewGroupModal onClose={()=>setGroupModalOpen(false)} onCreated={onGroupCreated} />}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"calc(100vh - 56px)" }}>
      <div className="vy-message-list" style={{ width:320, borderRight:"1px solid var(--border2)", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 16px 12px" }}>
          <span style={{ fontWeight:800, fontSize:18 }}>Messages</span>
          {newGroupButton}
        </div>
        {tabRow}
        <div style={{ borderTop:"1px solid var(--border2)", flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {listBody}
        </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        {active ? <ChatWindow convo={active} lang={lang} onLeft={onLeftGroup} /> : <Empty emoji="💬" title="Pick a conversation" sub="Select a conversation on the left." />}
      </div>
      {groupModalOpen && <NewGroupModal onClose={()=>setGroupModalOpen(false)} onCreated={onGroupCreated} />}
    </div>
  );
}
