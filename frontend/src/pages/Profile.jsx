import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Avatar, VerifiedBadge, PrimaryButton, GhostButton, TapIcon, Spinner, Empty, Ic, ic, numFmt, Tabs } from "../components/ui/index.jsx";
import PostCard from "../components/feed/PostCard.jsx";

const CAT_GRADS = { TECH_VIBES:"linear-gradient(135deg,#38BDF8,#7C3AED)", GLOBAL_CONNECT:"linear-gradient(135deg,#10F5A0,#2DD4BF)", CREATIVE_LEARN:"linear-gradient(135deg,#FFB830,#FF6B6B)", HUMAN_POTENTIAL:"linear-gradient(135deg,#A78BFA,#7C3AED)", SPACES_INVITE:"linear-gradient(135deg,#FF6B6B,#FFB830)", GENERAL:"linear-gradient(135deg,#7C3AED,#2DD4BF)" };
const CAT_EMOJI = { TECH_VIBES:"⚡", GLOBAL_CONNECT:"🌍", CREATIVE_LEARN:"🎨", HUMAN_POTENTIAL:"🧠", SPACES_INVITE:"🎙️", GENERAL:"✦" };

export default function Profile() {
  const { handle } = useParams();
  const { user: me, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [openingChat, setOpeningChat] = useState(false);
  const socialView = searchParams.get("view");
  const [socialUsers, setSocialUsers] = useState([]);
  const [socialLoading, setSocialLoading] = useState(false);

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
    api.get(`/vibes/user/${encodeURIComponent(profile.handle)}?pageSize=30`).then(({ vibes: v }) => setVibes(v || [])).catch(() => {});
    if (isMe) {
      api.get("/vibes/me/bookmarks").then(({ vibes: v }) => setSaved(v || [])).catch(() => {});
    }
  }, [profile?.id, profile?.handle, isMe]);

  useEffect(() => {
    if (!profile?.id || !["followers", "following"].includes(socialView || "")) return;
    setSocialLoading(true);
    const endpoint = socialView === "followers" ? "connections" : "following";
    api.get(`/users/${profile.id}/${endpoint}`)
      .then(data => setSocialUsers(data[endpoint] || []))
      .catch(() => setSocialUsers([]))
      .finally(() => setSocialLoading(false));
  }, [profile?.id, socialView]);

  const openSocial = (view) => setSearchParams({ view });
  const closeSocial = () => setSearchParams({});

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
              {profile.verificationTier && profile.verificationTier !== "none" && <VerifiedBadge size={16} />}
              {ravenTier && <span title={ravenTier.label} style={{ fontSize:18 }}>{ravenTier.badge}</span>}
            </div>
            <div style={{ color:"var(--text2)", fontSize:13.5, fontFamily:"var(--mono)", marginTop:2 }}>@{profile.handle}</div>
            {profile.roleTag && <div style={{ color:"var(--text3)", fontSize:13, marginTop:4 }}>{profile.roleTag}</div>}
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            {isMe ? (
              <>
                <TapIcon d={ic.settings} onClick={() => navigate("/settings")} label="Settings" />
                <GhostButton onClick={()=>setEditMode(e=>!e)}>{editMode?"Cancel":"Edit"}</GhostButton>
                <GhostButton onClick={logout}>Log out</GhostButton>
              </>
            ) : (
              <>
                <PrimaryButton onClick={toggleFollow} sx={{ padding:"10px 18px" }}>
                  {following ? "Connected" : "Connect"}
                </PrimaryButton>
                <GhostButton loading={openingChat} onClick={async()=>{
                  if (openingChat) return;
                  setOpeningChat(true);
                  try {
                    const { conversationId } = await api.post("/messages/conversations/dm", { userId: profile.id });
                    navigate(`/messages?conversation=${encodeURIComponent(conversationId)}`);
                  } catch (e) {
                    toast(e.message,"error");
                    setOpeningChat(false);
                  }
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
            [profile.vibesCount||0, "Vibes", () => setTab("vibes")],
            [profile.connectionsCount||0, "Connects", () => openSocial("followers")],
            [profile.followingCount||0, "Following", () => openSocial("following")],
          ].map(([n, l, onClick]) => (
            <button key={l} onClick={onClick} style={{ textAlign:"center", border:0, padding:0, background:"none", color:"var(--text)", cursor:"pointer" }} title={`View ${String(l).toLowerCase()}`}>
              <div style={{ fontWeight:800, fontSize:18 }}>{numFmt(n)}</div>
              <div style={{ color:"var(--text2)", fontSize:12.5 }}>{l}</div>
            </button>
          ))}
        </div>
      </div>

      <Tabs
        items={[{ key:"vibes", label:"Posts" }, isMe && { key:"saved", label:"Saved" }].filter(Boolean)}
        active={tab}
        onChange={setTab}
      />

      {/* Profile timeline: this is the user's complete chronological posts,
          not a filtered slice of the personalized home feed. */}
      <div>
        {displayVibes.map((v,i) => <PostCard key={v.id||i} vibe={v} lang={me?.uiLanguage || "en"} />)}
        {displayVibes.length === 0 && (
          <Empty emoji="✦" title={tab==="vibes"?"No vibes yet":"Nothing saved"} sub={tab==="vibes"?"Share the first one!":"Saved vibes will show here."} />
        )}
      </div>

      {socialView && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto", boxSizing:"border-box" }} onClick={closeSocial}>
          <div style={{ width:"min(440px, calc(100% - 28px))", maxHeight:"70vh", overflowY:"auto", background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:18, padding:20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><div style={{ fontWeight:850 }}>{socialView === "followers" ? "Followers" : "Following"}</div><GhostButton onClick={closeSocial}>Close</GhostButton></div>
            {socialLoading ? <div style={{ display:"flex", justifyContent:"center", padding:24 }}><Spinner size={24} /></div> : socialUsers.map(person => <Link key={person.id} to={`/profile/${person.handle}`} onClick={closeSocial} style={{ display:"flex", justifyContent:"space-between", padding:"11px 0", borderTop:"1px solid var(--border2)", color:"var(--text)", textDecoration:"none" }}><span style={{ fontWeight:700 }}>{person.displayName}</span><span style={{ color:"var(--text3)" }}>@{person.handle}</span></Link>)}
            {!socialLoading && !socialUsers.length && <div style={{ color:"var(--text3)", padding:"18px 0", textAlign:"center" }}>No users to show</div>}
          </div>
        </div>
      )}
    </div>
  );
}
