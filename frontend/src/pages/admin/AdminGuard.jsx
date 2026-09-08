import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/ui/index.jsx";
import Forbidden from "../Forbidden.jsx";

// Holds the current admin's effective permission list so admin pages can
// conditionally render actions without re-fetching /admin/me everywhere.
const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export default function AdminGuard({ children }) {
  const [state, setState] = useState({ loading: true, allowed: false, permissions: [], roles: [], error: null });

  useEffect(() => {
    api.get("/admin/me")
      .then(({ permissions, roles }) => setState({ loading: false, allowed: true, permissions: permissions || [], roles: roles || [], error: null }))
      .catch(error => setState({ loading: false, allowed: false, permissions: [], roles: [], error }));
  }, []);

  if (state.loading) {
    return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}><Spinner size={36} /></div>;
  }
  if (!state.allowed) {
    return <Forbidden message={state.error?.status === 403 ? "Your account is signed in, but none of its roles can access the admin console." : "We could not confirm that your current role can access the admin console."} />;
  }

  const can = (perm) => state.permissions.includes("*") || state.permissions.includes(perm);

  return (
    <AdminContext.Provider value={{ permissions: state.permissions, roles: state.roles, can }}>
      {children}
    </AdminContext.Provider>
  );
}

export function AdminPermission({ permission, children }) {
  const admin = useAdmin();
  if (!admin?.can(permission)) {
    return <Forbidden message={`Your current admin role does not include the “${permission}” permission required for this page.`} />;
  }
  return children;
}
