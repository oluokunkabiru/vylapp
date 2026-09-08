import { Link } from "react-router-dom";

// Keep investigation navigation inside Admin.  The public route is deliberately
// secondary, so an administrator can still open it when they need to share it.
export default function AdminUserLink({ handle, publicProfile = true }) {
  if (!handle) return <span style={{ color: "var(--text3)" }}>Unknown user</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Link to={`/admin/users/${encodeURIComponent(handle)}`} style={{ color: "var(--sky)", textDecoration: "none" }}>@{handle}</Link>
      {publicProfile && <Link to={`/profile/${handle}`} title="Open public profile" style={{ color: "var(--text3)", fontSize: 11, textDecoration: "none" }}>Public ↗</Link>}
    </span>
  );
}
