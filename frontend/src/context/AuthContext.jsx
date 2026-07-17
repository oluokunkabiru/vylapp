import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, registerLogoutHandler } from "../lib/api.js";
import { connectSocket, disconnectSocket } from "../lib/socket.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Silent, best-effort check so the Sidebar can show an Admin link for
  // users who actually have admin.access — 403 for everyone else is the
  // expected/common case, not an error worth surfacing.
  const checkAdmin = useCallback(() => {
    api.get("/admin/me").then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
  }, []);

  const logout = useCallback(() => {
    const rt = localStorage.getItem("vyl_refresh");
    if (rt) api.post("/auth/logout", { refreshToken: rt }).catch(() => {});
    api.clearTokens();
    disconnectSocket();
    setUser(null);
    setIsAdmin(false);
  }, []);

  useEffect(() => { registerLogoutHandler(logout); }, [logout]);

  useEffect(() => {
    if (!api.getToken()) { setLoading(false); return; }
    api.get("/auth/me")
      .then(({ user: u }) => { setUser(u); connectSocket(); checkAdmin(); })
      .catch(() => { api.clearTokens(); })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const login = useCallback(async (emailOrHandle, password) => {
    const { user: u, accessToken, refreshToken } = await api.post("/auth/login", { emailOrHandle, password });
    api.setTokens(accessToken, refreshToken);
    setUser(u);
    connectSocket();
    checkAdmin();
    return u;
  }, [checkAdmin]);

  const register = useCallback(async ({ email, handle, password, displayName }) => {
    const { user: u, accessToken, refreshToken } = await api.post("/auth/register", { email, handle, password, displayName });
    api.setTokens(accessToken, refreshToken);
    setUser(u);
    connectSocket();
    checkAdmin();
    return u;
  }, [checkAdmin]);

  const updateUser = useCallback((patch) => setUser(u => ({ ...u, ...patch })), []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
