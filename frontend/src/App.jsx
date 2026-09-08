import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { getSocket } from "./lib/socket.js";
import { isRtl } from "./lib/languages.js";
import i18n from "./i18n.js";

import AdminGuard, { AdminPermission } from "./pages/admin/AdminGuard.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminContent from "./pages/admin/AdminContent.jsx";
import AdminModeration from "./pages/admin/AdminModeration.jsx";
import AdminLearn from "./pages/admin/AdminLearn.jsx";
import AdminForum from "./pages/admin/AdminForum.jsx";
import AdminMonetization from "./pages/admin/AdminMonetization.jsx";
import AdminRoles from "./pages/admin/AdminRoles.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminAudit from "./pages/admin/AdminAudit.jsx";

import TopBar from "./components/layout/TopBar.jsx";
import BottomNav from "./components/layout/BottomNav.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import CreateModal from "./components/feed/CreateModal.jsx";
import PushNotificationManager from "./components/layout/PushNotificationManager.jsx";

import Landing from "./pages/Landing.jsx";
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
import Onboarding from "./pages/Onboarding.jsx";
import Settings from "./pages/Settings.jsx";

import { Spinner } from "./components/ui/index.jsx";

function FullscreenSpinner() {
  return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}><Spinner size={36} /></div>;
}

// ── Outer gate: unauthenticated visitors never reach the inner (vibes) app ──
function AuthGate() {
  return (
    <div className="vy-app-shell" style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"var(--bg)" }}>
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ── Inner app: only ever rendered once a user is authenticated ─────────────
function InnerApp() {
  const { user, updateUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 860);
  const [createOpen, setCreateOpen] = useState(false);
  // The backend is authoritative so a reader's language follows them across
  // devices. localStorage remains a best-effort pre-login/offline fallback.
  const [lang, setLang] = useState(() => user?.uiLanguage || localStorage.getItem("vyl_lang") || user?.contentLanguages?.[0] || "en");
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  // V-16 — the global "+" composer posts optimistically: onCreated fires
  // with a client-built pending vibe the instant "Share" is tapped, and
  // onSettled reconciles it once the request actually resolves (swaps in
  // the real vibe, or rolls it back on failure). Home is a separate
  // component instance behind a <Route>, so there's no direct handle to
  // its state; both flow down as props instead. Home dedupes justCreated
  // by id so a later refetch that already contains it doesn't double it up.
  const [justCreated, setJustCreated] = useState(null);
  const [vibeSettle, setVibeSettle] = useState(null);

  useEffect(() => { localStorage.setItem("vyl_lang", lang); }, [lang]);

  useEffect(() => { i18n.changeLanguage(lang); }, [lang]);

  const setLanguage = useCallback((nextLanguage) => {
    if (nextLanguage === lang) return;
    setLang(nextLanguage);
    // Keep switching instant; a failed sync does not take away the reader's
    // current session preference, and the next successful change retries it.
    api.patch("/users/me", { ui_language: nextLanguage })
      .then(({ user: updatedUser }) => updateUser(updatedUser || { uiLanguage: nextLanguage }))
      .catch(() => {});
  }, [lang, updateUser]);

  // Keep <html lang>/<html dir> in sync with the reading language so
  // screen readers, spellcheck/translate prompts, and font shaping match
  // what's actually on screen. `dir` here only flips the root default —
  // it doesn't retroactively mirror layouts built assuming LTR (nav
  // order, icon direction, swipe gestures); that's D-15's remaining scope.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang]);

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
      <Route path="/" element={<Home {...commonProps} newVibe={justCreated} vibeSettle={vibeSettle} />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/spaces" element={<SpacesPage />} />
      <Route path="/learn" element={<LearnHome />} />
      <Route path="/learn/courses/:id" element={<CourseDetail lang={lang} />} />
      <Route path="/learn/courses/:id/lessons/:lessonId" element={<LessonViewer lang={lang} />} />
      <Route path="/notifications" element={<Notifications onClearBadge={()=>setNotifCount(0)} />} />
      <Route path="/messages" element={<Messages lang={lang} onClearBadge={()=>setMsgCount(0)} />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:handle" element={<Profile />} />
      <Route path="/settings" element={<Settings lang={lang} setLang={setLanguage} />} />
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
      <PushNotificationManager />
      {isMobile ? (
        /* MOBILE LAYOUT */
        <>
          <TopBar notifCount={notifCount} msgCount={msgCount} lang={lang} setLang={setLanguage} />
          <main style={{ flex:1, overflowY:"auto" }}>{mainContent}</main>
          <BottomNav onCreateClick={() => setCreateOpen(true)} notifCount={notifCount} />
        </>
      ) : (
        /* DESKTOP LAYOUT */
        <div style={{ display:"flex", width:"100%", maxWidth:1100, margin:"0 auto" }}>
          <Sidebar
            onCreateClick={() => setCreateOpen(true)}
            notifCount={notifCount} msgCount={msgCount}
            lang={lang} setLang={setLanguage}
          />
          <main className="vy-desktop-main" style={{ flex:1, maxWidth:480, borderRight:"1px solid var(--border2)", minHeight:"100vh" }}>
            {mainContent}
          </main>
          <RightRail lang={lang} />
        </div>
      )}

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={vibe => setJustCreated(vibe)}
          onSettled={(tempId, final) => setVibeSettle({ tempId, final })}
          defaultLang={lang}
        />
      )}
    </div>
  );
}

// ── Admin console: its own layout, entirely separate from the vibes app chrome ──
function AdminApp() {
  return (
    <AdminGuard>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminPermission permission="admin.users.manage"><AdminUsers /></AdminPermission>} />
          <Route path="content" element={<AdminPermission permission="admin.content.manage"><AdminContent /></AdminPermission>} />
          <Route path="moderation" element={<AdminPermission permission="admin.content.manage"><AdminModeration /></AdminPermission>} />
          <Route path="learn" element={<AdminPermission permission="learn.manage"><AdminLearn /></AdminPermission>} />
          <Route path="forum" element={<AdminPermission permission="admin.content.manage"><AdminForum /></AdminPermission>} />
          <Route path="monetization" element={<AdminPermission permission="creator.manage"><AdminMonetization /></AdminPermission>} />
          <Route path="roles" element={<AdminPermission permission="admin.roles.manage"><AdminRoles /></AdminPermission>} />
          <Route path="settings" element={<AdminPermission permission="admin.system.config"><AdminSettings /></AdminPermission>} />
          <Route path="audit" element={<AdminPermission permission="admin.audit.read"><AdminAudit /></AdminPermission>} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminGuard>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullscreenSpinner />;

  if (location.pathname.startsWith("/admin")) {
    if (!user) return <AuthGate />;
    return <AdminApp />;
  }

  if (!user) return <AuthGate />;
  if (!user.onboardingDone) return <Onboarding />;
  return <InnerApp />;
}

// ── Desktop right rail ─────────────────────────────────────────────────────
import { useState as useStateR } from "react";
import { api } from "./lib/api.js";
import { Avatar, numFmt } from "./components/ui/index.jsx";

function RightRail({ lang }) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    api.get("/vibes/feed?pageSize=30").then(({ vibes }) => {
      const seen = new Set();
      const users = [];
      for (const v of (vibes || [])) {
        if (
          v.author?.id &&
          !seen.has(v.author.id) &&
          v.author.id !== user?.id &&
          !v.author.viewerFollows &&
          !v.author.connectionRequested
        ) {
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
      setSuggestions(current => current.filter(candidate => candidate.id !== u.id));
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
              <button onClick={()=>follow(u)} style={{ background:"none", border:"none", color:"var(--violet-lt)", fontWeight:800, fontSize:13, cursor:"pointer" }}>Connect</button>
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
