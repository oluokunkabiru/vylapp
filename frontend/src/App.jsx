import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { getSocket } from "./lib/socket.js";

import TopBar from "./components/layout/TopBar.jsx";
import BottomNav from "./components/layout/BottomNav.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import CreateModal from "./components/feed/CreateModal.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Home from "./pages/Home.jsx";
import Explore from "./pages/Explore.jsx";
import SpacesPage from "./pages/SpacesPage.jsx";
import LearnHome from "./pages/LearnHome.jsx";
import CourseDetail from "./pages/CourseDetail.jsx";
import LessonViewer from "./pages/LessonViewer.jsx";
import Notifications from "./pages/Notifications.jsx";
import Messages from "./pages/Messages.jsx";
import Profile from "./pages/Profile.jsx";
import Autopilot from "./pages/Autopilot.jsx";
import CreatorEarnings from "./pages/CreatorEarnings.jsx";
import RavenLeaderboard from "./pages/RavenLeaderboard.jsx";

import { Spinner } from "./components/ui/index.jsx";

function FullscreenSpinner() {
  return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}><Spinner size={36} /></div>;
}

// ── Outer gate: unauthenticated visitors never reach the inner (vibes) app ──
function AuthGate() {
  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"var(--bg)" }}>
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ── Inner app: only ever rendered once a user is authenticated ─────────────
function InnerApp() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 860);
  const [createOpen, setCreateOpen] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("vyl_lang") || "en");
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => { localStorage.setItem("vyl_lang", lang); }, [lang]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 860);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Real-time notification/message badges
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNotif = () => setNotifCount(n => n + 1);
    const onMsg = () => setMsgCount(n => n + 1);
    socket.on("notification:new", onNotif);
    socket.on("message:new", onMsg);
    return () => { socket.off("notification:new", onNotif); socket.off("message:new", onMsg); };
  }, []);

  const commonProps = { lang };

  const mainContent = (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/" element={<Home {...commonProps} />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/spaces" element={<SpacesPage />} />
      <Route path="/learn" element={<LearnHome />} />
      <Route path="/learn/courses/:id" element={<CourseDetail />} />
      <Route path="/learn/courses/:id/lessons/:lessonId" element={<LessonViewer />} />
      <Route path="/notifications" element={<Notifications onClearBadge={()=>setNotifCount(0)} />} />
      <Route path="/messages" element={<Messages onClearBadge={()=>setMsgCount(0)} />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:handle" element={<Profile />} />
      <Route path="/autopilot" element={<Autopilot />} />
      <Route path="/creator" element={<CreatorEarnings />} />
      <Route path="/raven" element={<RavenLeaderboard />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"var(--bg)" }}>
      {isMobile ? (
        /* MOBILE LAYOUT */
        <>
          <TopBar notifCount={notifCount} msgCount={msgCount} lang={lang} setLang={setLang} />
          <main style={{ flex:1, overflowY:"auto" }}>{mainContent}</main>
          <BottomNav onCreateClick={() => setCreateOpen(true)} notifCount={notifCount} />
        </>
      ) : (
        /* DESKTOP LAYOUT */
        <div style={{ display:"flex", width:"100%", maxWidth:1100, margin:"0 auto" }}>
          <Sidebar
            onCreateClick={() => setCreateOpen(true)}
            notifCount={notifCount} msgCount={msgCount}
            lang={lang} setLang={setLang}
          />
          <main style={{ flex:1, maxWidth:480, borderRight:"1px solid var(--border2)", minHeight:"100vh" }}>
            {mainContent}
          </main>
          <RightRail lang={lang} />
        </div>
      )}

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {}}
        />
      )}
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  return user ? <InnerApp /> : <AuthGate />;
}

// ── Desktop right rail ─────────────────────────────────────────────────────
import { useState as useStateR } from "react";
import { api } from "./lib/api.js";
import { Avatar, numFmt } from "./components/ui/index.jsx";

function RightRail({ lang }) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [followed, setFollowed] = useState(new Set());

  useEffect(() => {
    api.get("/vibes/feed?pageSize=30").then(({ vibes }) => {
      const seen = new Set();
      const users = [];
      for (const v of (vibes || [])) {
        if (v.author?.id && !seen.has(v.author.id) && v.author.id !== user?.id) {
          seen.add(v.author.id);
          users.push(v.author);
        }
        if (users.length >= 5) break;
      }
      setSuggestions(users);
    }).catch(() => {});
    api.get("/search/trending/topics?limit=5").then(({ trending: t }) => setTrending(t||[])).catch(() => {});
  }, [user?.id]);

  const follow = async (u) => {
    try {
      await api.post(`/users/${u.id}/connect`);
      setFollowed(s => new Set([...s, u.id]));
    } catch {}
  };

  return (
    <div style={{ width:300, padding:"24px 20px", flexShrink:0 }}>
      {user && (
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <Avatar user={user} size={44} ring />
          <div>
            <div style={{ fontWeight:800, fontSize:14 }}>{user.displayName}</div>
            <div style={{ color:"var(--text2)", fontSize:12.5 }}>@{user.handle}</div>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
            <span style={{ color:"var(--text2)", fontSize:13, fontWeight:700 }}>Vibers to Connect</span>
          </div>
          {suggestions.map(u => (
            <div key={u.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <Avatar user={u} size={36} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.displayName}</div>
                <div style={{ color:"var(--text2)", fontSize:12 }}>{u.roleTag || u.handle}</div>
              </div>
              {!followed.has(u.id) && (
                <button onClick={()=>follow(u)} style={{ background:"none", border:"none", color:"var(--violet-lt)", fontWeight:800, fontSize:13, cursor:"pointer" }}>Connect</button>
              )}
              {followed.has(u.id) && <span style={{ color:"var(--green)", fontSize:12, fontWeight:700 }}>✓</span>}
            </div>
          ))}
        </>
      )}

      {trending.length > 0 && (
        <div style={{ marginTop:20 }}>
          <div style={{ color:"var(--text2)", fontSize:13, fontWeight:700, marginBottom:12 }}>Trending</div>
          {trending.map(t => (
            <div key={t.tag} style={{ marginBottom:10 }}>
              <div style={{ color:"var(--sky)", fontWeight:700, fontSize:13.5 }}>{t.tag}</div>
              <div style={{ color:"var(--text3)", fontSize:12 }}>{t.heat} heat · {t.momentum}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ color:"var(--text3)", fontSize:12, marginTop:28, lineHeight:1.7 }}>
        © Vylapp 2026 ·{" "}
        <a href="#" style={{ color:"var(--violet-lt)" }}>Terms</a> ·{" "}
        <a href="#" style={{ color:"var(--violet-lt)" }}>Privacy</a>
      </div>
    </div>
  );
}
