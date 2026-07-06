import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Avatar, VerifiedBadge, PrimaryButton, GhostButton, Spinner, Empty, Ic, ic, numFmt } from "../components/ui/index.jsx";

const CAT_GRADS = { TECH_VIBES:"linear-gradient(135deg,#38BDF8,#7C3AED)", GLOBAL_CONNECT:"linear-gradient(135deg,#10F5A0,#2DD4BF)", CREATIVE_LEARN:"linear-gradient(135deg,#FFB830,#FF6B6B)", HUMAN_POTENTIAL:"linear-gradient(135deg,#A78BFA,#7C3AED)", SPACES_INVITE:"linear-gradient(135deg,#FF6B6B,#FFB830)", GENERAL:"linear-gradient(135deg,#7C3AED,#2DD4BF)" };
const CAT_EMOJI = { TECH_VIBES:"⚡", GLOBAL_CONNECT:"🌍", CREATIVE_LEARN:"🎨", HUMAN_POTENTIAL:"🧠", SPACES_INVITE:"🎙️", GENERAL:"✦" };

export default function Profile() {
  const { handle } = useParams();
  const { user: me } = useAuth();
  const toast = useToast();
  const isMe = !handle || handle === me?.handle;
  const [profile, setProfile] = useState(isMe ? me : null);
  const [vibes, setVibes] = useState([]);
  const [tab, setTab] = useState("vibes");
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(!isMe);
  const [following, setFollowing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [ravenTier, setRavenTier] = useState(null);

  useEffect(() => {
    const targetHandle = handle || me?.handle;
    if (!targetHandle) return;
    setLoading(true);
    Promise.all([
      api.get(`/users/${targetHandle}`),
      !isMe ? Promise.resolve(null) : api.get("/raven/me").catch(() => null),
    ]).then(([{ user: u }, raven]) => {
      setProfile(u);
      setFollowing(u.viewerFollows ?? false);
      setEditForm({ displayName: u.displayName, bio: u.bio || "", location: u.location || "", website: u.website || "" });
      if (raven) setRavenTier(raven.tier);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [handle, me?.handle, isMe]);

  useEffect(() => {
    if (!profile?.id) return;
    // Load vibes from feed filtered to this user's handle
    api.get(`/vibes/feed?pageSize=30`).then(({ vibes: v }) => {
      setVibes((v || []).filter(x => x.author?.handle === profile.handle));
    }).catch(() => {});
    if (isMe) {
      api.get("/vibes/me/bookmarks").then(({ vibes: v }) => setSaved(v || [])).catch(() => {});
    }
  }, [profile?.id, profile?.handle, isMe]);

  const toggleFollow = async () => {
    if (!me) { toast("Sign in to connect", "error"); return; }
    const was = following;
    setFollowing(!was);
    try {
      if (was) await api.delete(`/users/${profile.id}/connect`);
      else { await api.post(`/users/${profile.id}/connect`); toast(`Connected with ${profile.displayName} ✓`); }
    } catch (e) { setFollowing(was); toast(e.message, "error"); }
  };

  const saveEdit = async () => {
    try {
      const { user: u } = await api.patch("/users/me", editForm);
      setProfile(u);
      setEditMode(false);
      toast("Profile updated ✓");
    } catch (e) { toast(e.message, "error"); }
  };

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={32} /></div>;
  if (!profile) return <Empty emoji="🔍" title="User not found" sub="This account doesn't exist." />;

  const displayVibes = tab === "vibes" ? vibes : saved;

  return (
    <div>
      {/* Cover banner */}
      <div style={{ height:140, background:"linear-gradient(135deg,#7C3AED22,#10F5A022)", position:"relative" }}>
        <div style={{ position:"absolute", bottom:-40, left:16 }}>
          <Avatar user={profile} size={82} ring />
        </div>
      </div>

      {/* Profile header */}
      <div style={{ padding:"48px 16px 20px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontWeight:800, fontSize:20 }}>{profile.displayName}</span>
              {profile.verified && <VerifiedBadge size={16} />}
              {ravenTier && <span title={ravenTier.label} style={{ fontSize:18 }}>{ravenTier.badge}</span>}
            </div>
            <div style={{ color:"var(--text2)", fontSize:13.5, fontFamily:"var(--mono)", marginTop:2 }}>@{profile.handle}</div>
            {profile.roleTag && <div style={{ color:"var(--text3)", fontSize:13, marginTop:4 }}>{profile.roleTag}</div>}
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            {isMe ? (
              <GhostButton onClick={()=>setEditMode(e=>!e)}>{editMode?"Cancel":"Edit"}</GhostButton>
            ) : (
              <>
                <PrimaryButton onClick={toggleFollow} sx={{ padding:"10px 18px" }}>
                  {following ? "Connected" : "Connect"}
                </PrimaryButton>
                <GhostButton onClick={async()=>{
                  try {
                    const { conversationId } = await api.post("/messages/conversations/dm", { userId: profile.id });
                    toast("Chat opened ✓");
                  } catch (e) { toast(e.message,"error"); }
                }}>Message</GhostButton>
              </>
            )}
          </div>
        </div>

        {editMode ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
            {["displayName","bio","location","website"].map(k => (
              <input key={k} value={editForm[k]} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={k.charAt(0).toUpperCase()+k.slice(1)}
                style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:14.5, outline:"none" }} />
            ))}
            <PrimaryButton onClick={saveEdit}>Save profile</PrimaryButton>
          </div>
        ) : (
          <>
            {profile.bio && <p style={{ fontSize:14.5, lineHeight:1.55, marginBottom:12 }}>{profile.bio}</p>}
            {profile.location && <div style={{ color:"var(--text2)", fontSize:13.5, marginBottom:4 }}>📍 {profile.location}</div>}
            {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color:"var(--sky)", fontSize:13.5, marginBottom:12, display:"block" }}>🔗 {profile.website}</a>}
          </>
        )}

        {/* Stats */}
        <div style={{ display:"flex", gap:24, marginBottom:4 }}>
          {[
            [profile.vibesCount||0, "Vibes"],
            [profile.connectionsCount||0, "Connects"],
            [profile.followingCount||0, "Following"],
          ].map(([n, l]) => (
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontWeight:800, fontSize:18 }}>{numFmt(n)}</div>
              <div style={{ color:"var(--text2)", fontSize:12.5 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderTop:"1px solid var(--border2)", borderBottom:"1px solid var(--border2)" }}>
        {[["vibes","Posts"], isMe && ["saved","Saved"]].filter(Boolean).map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{
            flex:1, textAlign:"center", padding:"12px 0", fontWeight:800, fontSize:13.5, border:"none",
            background:"transparent", cursor:"pointer",
            color: tab===k ? "var(--text)" : "var(--text3)",
            borderBottom: tab===k ? "2px solid var(--violet)" : "2px solid transparent",
          }}>{l.toUpperCase()}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:2, padding:"2px" }}>
        {displayVibes.map((v,i) => (
          <div key={v.id||i} style={{
            aspectRatio:"1/1", background:CAT_GRADS[v.category]||CAT_GRADS.GENERAL,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:28,
          }}>{CAT_EMOJI[v.category]||"✦"}</div>
        ))}
        {displayVibes.length === 0 && (
          <div style={{ gridColumn:"1/-1" }}>
            <Empty emoji="✦" title={tab==="vibes"?"No vibes yet":"Nothing saved"} sub={tab==="vibes"?"Share the first one!":"Saved vibes will show here."} />
          </div>
        )}
      </div>
    </div>
  );
}
