import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner } from "../../components/ui/index.jsx";

export default function AdminRoles() {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePerms, setRolePerms] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busyPerm, setBusyPerm] = useState(null);

  const loadRoles = useCallback(() => {
    return Promise.all([api.get("/rbac/roles"), api.get("/rbac/permissions")])
      .then(([{ roles }, { permissions }]) => { setRoles(roles); setAllPermissions(permissions); });
  }, []);

  useEffect(() => { loadRoles().catch(e => toast(e.message, "error")).finally(() => setLoading(false)); }, []); // eslint-disable-line

  useEffect(() => {
    if (!selectedRole) return;
    api.get(`/rbac/roles/${selectedRole}/permissions`)
      .then(({ permissions }) => setRolePerms(new Set(permissions.map(p => p.name))))
      .catch(e => toast(e.message, "error"));
  }, [selectedRole]); // eslint-disable-line

  const grouped = useMemo(() => {
    const g = {};
    for (const p of allPermissions) (g[p.group_name] ||= []).push(p);
    return g;
  }, [allPermissions]);

  const togglePerm = async (permName, hasIt) => {
    setBusyPerm(permName);
    try {
      if (hasIt) {
        await api.delete(`/rbac/roles/${selectedRole}/permissions/${permName}`);
        setRolePerms(s => { const n = new Set(s); n.delete(permName); return n; });
      } else {
        await api.post(`/rbac/roles/${selectedRole}/permissions`, { permission: permName });
        setRolePerms(s => new Set([...s, permName]));
      }
      loadRoles();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusyPerm(null);
    }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size={32} /></div>;

  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", gap: 24 }}>
      <div style={{ width: 260, flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 16px" }}>Roles</h1>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          {roles.map(r => (
            <button key={r.name} onClick={() => setSelectedRole(r.name)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "12px 16px",
              background: selectedRole === r.name ? "var(--violet-dim)" : "none", border: "none",
              borderBottom: "1px solid var(--border2)", cursor: "pointer",
              color: selectedRole === r.name ? "var(--text)" : "var(--text2)",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.name}{r.is_system && <span style={{ color: "var(--text3)", fontWeight: 500 }}> (system)</span>}</div>
              <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 2 }}>{r.permissions?.length || 0} permission(s)</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {!selectedRole ? (
          <div style={{ color: "var(--text3)", padding: "60px 0", textAlign: "center" }}>Select a role to manage its permissions</div>
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "26px 0 16px" }}>{selectedRole}</h2>
            {Object.entries(grouped).map(([group, perms]) => (
              <div key={group} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text3)", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>{group}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {perms.map(p => {
                    const hasIt = rolePerms.has(p.name);
                    return (
                      <label key={p.name} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                        background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 10,
                        fontSize: 12.5, cursor: busyPerm === p.name ? "wait" : "pointer",
                      }}>
                        <input type="checkbox" checked={hasIt} disabled={busyPerm === p.name} onChange={() => togglePerm(p.name, hasIt)} />
                        <span title={p.description} style={{ color: hasIt ? "var(--text)" : "var(--text2)" }}>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
