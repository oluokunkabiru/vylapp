import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api.js";
import { humanizeIdentifier } from "../../lib/format.js";
import { Spinner } from "../../components/ui/index.jsx";

const section = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: 18, marginBottom: 16, scrollMarginTop: 20 };
const row = { display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 0", borderTop: "1px solid var(--border2)", fontSize: 13 };
const metric = { display: "block", color: "var(--text)", textDecoration: "none", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 15, padding: 15, minWidth: 125, flex: 1 };
const title = { fontWeight: 850, fontSize: 14, marginBottom: 10 };
const muted = { color: "var(--text3)", fontSize: 12 };

function Person({ user }) {
  return user ? <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Link to={`/admin/users/${encodeURIComponent(user.handle)}`} style={{ color: "var(--sky)", textDecoration: "none" }}>@{user.handle}</Link><Link to={`/profile/${user.handle}`} title="Open public profile" style={{ color: "var(--text3)", fontSize: 11, textDecoration: "none" }}>Public ↗</Link></span> : <span style={muted}>Unknown user</span>;
}

function Card({ to, label, value, sub }) {
  return <a href={to} style={metric}><div style={{ ...muted, textTransform: "uppercase", fontWeight: 800, fontSize: 10.5 }}>{label}</div><div style={{ fontSize: 23, fontWeight: 900, marginTop: 5, fontFamily: "var(--mono)" }}>{value}</div><div style={{ ...muted, marginTop: 3 }}>{sub || "View records →"}</div></a>;
}

export default function AdminUserDetail() {
  const { handle } = useParams();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { users } = await api.get(`/admin/users?q=${encodeURIComponent(handle || "")}&page_size=100`);
        const match = (users || []).find(user => user.handle.toLowerCase() === String(handle || "").toLowerCase());
        if (!match) throw new Error("User not found");
        const data = await api.get(`/admin/users/${match.id}`);
        if (active) setDetail(data);
      } catch (e) { if (active) setError(e.message || "Could not load this user"); }
    };
    load();
    return () => { active = false; };
  }, [handle]);

  if (error) return <div style={{ padding: 32, color: "var(--coral)" }}>{error}</div>;
  if (!detail) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spinner size={34} /></div>;

  const { user: u, totals, access, content, connections, activity, notifications, moderation } = detail;
  return <div style={{ padding: "28px 32px 60px", maxWidth: 1120 }}>
    <Link to="/admin/users" style={{ color: "var(--sky)", textDecoration: "none", fontSize: 13 }}>← Back to users</Link>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, margin: "14px 0 22px", flexWrap: "wrap" }}>
      <div><h1 style={{ fontSize: 27, fontWeight: 900, margin: 0 }}>{u.display_name} <span style={{ color: "var(--text3)", fontWeight: 500 }}>@{u.handle}</span></h1><div style={{ color: "var(--text2)", marginTop: 5 }}>{u.email}</div></div>
      <Link to={`/profile/${u.handle}`} style={{ color: "var(--sky)", fontSize: 13 }}>Open public profile →</Link>
    </div>

    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
      <Card to="#vibes" label="Vibes" value={totals.vibes} sub={`Showing latest ${content.vibes.length}`} />
      <Card to="#followers" label="Followers" value={totals.followers} sub={`Showing latest ${connections.followers.length} records`} />
      <Card to="#following" label="Following" value={totals.following} sub={`Showing latest ${connections.following.length} records`} />
      <Card to="#spaces" label="Hosted spaces" value={totals.spaces} sub={`Showing latest ${content.spaces.length}`} />
      <Card to="#activity" label="Activity events" value={totals.activity} sub={`Showing latest ${activity.length}`} />
      <Card to="#notifications" label="Notifications" value={totals.notifications} sub={`Showing latest ${notifications.length} events`} />
      <Card to="#moderation" label="Reports involved" value={moderation.reports_involved} sub="Moderation context" />
    </div>

    <section style={section}>
      <div style={title}>Account and security review</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 12, fontSize: 13 }}>
        {[
          ["Account status", u.is_suspended ? `Suspended: ${u.suspended_reason || "reason not recorded"}` : u.is_deactivated ? "Deactivated" : "Active"],
          ["Identity verification", humanizeIdentifier(u.verification_tier)], ["Two-factor authentication", u.two_factor_enabled ? "Enabled" : "Not enabled"],
          ["Sign-in provider", humanizeIdentifier(u.provider)], ["Subscription", humanizeIdentifier(u.subscription_plan)],
          ["Privacy", u.private_account ? "Private account" : "Public account"], ["Messages", u.allow_dms ? "Direct messages allowed" : "Direct messages disabled"],
          ["Last seen", u.last_seen ? new Date(u.last_seen).toLocaleString() : "Never"], ["Joined", new Date(u.created_at).toLocaleString()],
        ].map(([label, value]) => <div key={label}><div style={muted}>{label}</div><div style={{ marginTop: 3, fontWeight: 700 }}>{value}</div></div>)}
      </div>
      {u.bio && <div style={{ ...row, marginTop: 12 }}><span style={muted}>Bio</span><span style={{ flex: 1 }}>{u.bio}</span></div>}
    </section>

    <section style={section}>
      <div style={title}>Roles and permissions</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>{access.roles.map(role => <span key={role.name} title={role.name} style={pill}>{humanizeIdentifier(role.name)}</span>)}</div>
      <div style={muted}>Effective permissions</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>{access.permissions.map(permission => <span key={permission} title={permission} style={permissionPill}>{humanizeIdentifier(permission)}</span>)}</div>
    </section>

    <section id="vibes" style={section}><div style={title}>Vibes — {totals.vibes} total</div>{content.vibes.map(vibe => <div key={vibe.id} style={row}><a href={`/admin/content?vibe=${vibe.id}`} style={{ color: "var(--text)", textDecoration: "none", flex: 1 }}>{vibe.content || "Media-only vibe"}</a><span style={muted}>{vibe.likesCount} likes · {vibe.repostsCount} reshares · {vibe.repliesCount} replies · {vibe.viewsCount} views</span></div>)}{!content.vibes.length && <Empty text="No vibes published" />}</section>
    <section id="followers" style={section}><div style={title}>Followers — {totals.followers} total</div>{connections.followers.map(item => <div key={item.user.id} style={row}><Person user={item.user} /><span style={muted}>Following since {new Date(item.created_at).toLocaleDateString()}</span></div>)}{!connections.followers.length && <Empty text="No followers" />}</section>
    <section id="following" style={section}><div style={title}>Following — {totals.following} total</div>{connections.following.map(item => <div key={item.user.id} style={row}><Person user={item.user} /><span style={muted}>Connected since {new Date(item.created_at).toLocaleDateString()}</span></div>)}{!connections.following.length && <Empty text="Not following anyone" />}</section>
    <section id="spaces" style={section}><div style={title}>Hosted Spaces — {totals.spaces} total</div>{content.spaces.map(space => <div key={space.id} style={row}><span>{space.title}</span><span style={muted}>{humanizeIdentifier(space.status)} · {space.listenersCount} listeners · peak {space.peakListeners}</span></div>)}{!content.spaces.length && <Empty text="No hosted Spaces" />}</section>
    <section id="activity" style={section}><div style={title}>Account activity — {totals.activity} events</div>{activity.map(event => <div key={event.id} style={row}><span><b>{humanizeIdentifier(event.action)}</b>{event.entity_type && ` · ${humanizeIdentifier(event.entity_type)}`}{event.entity_id && <a href={event.entity_type === "vibe" ? `/admin/content?vibe=${event.entity_id}` : "#"} style={{ color: "var(--sky)", marginLeft: 7 }}>Open record</a>}</span><span style={muted}>{new Date(event.created_at).toLocaleString()}</span></div>)}{!activity.length && <Empty text="No recorded account activity" />}</section>
    <section id="notifications" style={section}><div style={title}>Recent notifications</div>{notifications.map(note => <div key={note.id} style={row}><span><Person user={note.actor} /> · {humanizeIdentifier(note.type)} · {note.body}</span><span style={muted}>{new Date(note.created_at).toLocaleString()}</span></div>)}{!notifications.length && <Empty text="No notifications recorded" />}</section>
    <section id="moderation" style={section}><div style={title}>Moderation context</div><div style={muted}>This user is involved in {moderation.reports_involved} report(s), as reporter or reported account. Use the Moderation queue to review case-level evidence and actions.</div></section>
  </div>;
}

function Empty({ text }) { return <div style={muted}>{text}</div>; }
const pill = { border: "1px solid var(--violet-border)", background: "var(--violet-dim)", color: "var(--violet-lt)", padding: "4px 9px", borderRadius: 999, fontSize: 12, fontWeight: 750 };
const permissionPill = { border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 8px", borderRadius: 999, fontSize: 11.5 };
