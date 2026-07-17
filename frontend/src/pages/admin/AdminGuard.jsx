import { createContext, useContext, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/ui/index.jsx";

// Holds the current admin's effective permission list so admin pages can
// conditionally render actions without re-fetching /admin/me everywhere.
const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export default function AdminGuard({ children }) {
  const [state, setState] = useState({ loading: true, allowed: false, permissions: [], roles: [] });

  useEffect(() => {
    api.get("/admin/me")
      .then(({ permissions, roles }) => setState({ loading: false, allowed: true, permissions: permissions || [], roles: roles || [] }))
      .catch(() => setState({ loading: false, allowed: false, permissions: [], roles: [] }));
  }, []);

  if (state.loading) {
    return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}><Spinner size={36} /></div>;
  }
  if (!state.allowed) return <Navigate to="/" replace />;

  const can = (perm) => state.permissions.includes("*") || state.permissions.includes(perm);

  return (
    <AdminContext.Provider value={{ permissions: state.permissions, roles: state.roles, can }}>
      {children}
    </AdminContext.Provider>
  );
}
