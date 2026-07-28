import { Link, useLocation, Outlet } from "react-router-dom";
import { Ic, ic, VylappWordmark } from "../../components/ui/index.jsx";
import { useAdmin } from "./AdminGuard.jsx";

const NAV = [
  { to: "/admin",              label: "Overview",     icon: ic.chart,  perm: null },
  { to: "/admin/users",        label: "Users",        icon: ic.user,   perm: "admin.users.manage" },
  { to: "/admin/content",      label: "Content",      icon: ic.image,  perm: "admin.content.manage" },
  { to: "/admin/moderation",   label: "Moderation",   icon: ic.zap,    perm: "admin.content.manage" },
  { to: "/admin/learn",        label: "Learn",        icon: ic.book,   perm: "learn.manage" },
  { to: "/admin/forum",        label: "Forum",        icon: ic.comment, perm: "admin.content.manage" },
  { to: "/admin/monetization", label: "Monetization", icon: ic.coins,  perm: "creator.manage" },
  { to: "/admin/roles",        label: "Roles",        icon: ic.trophy, perm: "admin.roles.manage" },
  { to: "/admin/settings",     label: "Settings",     icon: ic.lock,   perm: "admin.system.config" },
  { to: "/admin/audit",        label: "Audit Log",    icon: ic.book,   perm: "admin.audit.read" },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { can } = useAdmin();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{
        width: 240, padding: "20px 12px", display: "flex", flexDirection: "column",
        borderRight: "1px solid var(--border2)", flexShrink: 0, position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ padding: "0 12px 22px" }}><VylappWordmark size={22} /></div>
        <div style={{ padding: "0 12px 16px", color: "var(--text3)", fontSize: 11, fontWeight: 800, letterSpacing: 0.8 }}>ADMIN CONSOLE</div>

        {NAV.filter(item => !item.perm || can(item.perm)).map(item => {
          const active = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to));
          return (
            <Link key={item.to} to={item.to} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "10px 14px",
              borderRadius: 12, background: active ? "var(--violet-dim)" : "transparent",
              border: `1px solid ${active ? "var(--violet-border)" : "transparent"}`,
              textDecoration: "none", marginBottom: 2,
            }}>
              <Ic d={item.icon} s={19} c={active ? "var(--text)" : "var(--text2)"} f={active ? "var(--text)" : "none"} />
              <span style={{ fontWeight: active ? 700 : 600, fontSize: 14, color: active ? "var(--text)" : "var(--text2)" }}>{item.label}</span>
            </Link>
          );
        })}

        <div style={{ flex: 1 }} />

        <Link to="/" style={{
          display: "flex", alignItems: "center", gap: 14, padding: "10px 14px",
          borderRadius: 12, textDecoration: "none", color: "var(--text3)", fontSize: 13, fontWeight: 600,
        }}>
          ← Exit to app
        </Link>
      </div>

      <main style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
