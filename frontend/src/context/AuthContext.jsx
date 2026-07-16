import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, registerLogoutHandler } from "../lib/api.js";
import { connectSocket, disconnectSocket } from "../lib/socket.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    const rt = localStorage.getItem("vyl_refresh");
    if (rt) api.post("/auth/logout", { refreshToken: rt }).catch(() => {});
    api.clearTokens();
    disconnectSocket();
    setUser(null);
  }, []);

  useEffect(() => { registerLogoutHandler(logout); }, [logout]);

  useEffect(() => {
    if (!api.getToken()) { setLoading(false); return; }
    api.get("/auth/me")
      .then(({ user: u }) => { setUser(u); connectSocket(); })
      .catch(() => { api.clearTokens(); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (emailOrHandle, password) => {
    const { user: u, accessToken, refreshToken } = await api.post("/auth/login", { emailOrHandle, password });
    api.setTokens(accessToken, refreshToken);
    setUser(u);
    connectSocket();
    return u;
  }, []);

  const register = useCallback(async ({ email, handle, password, displayName }) => {
    const { user: u, accessToken, refreshToken } = await api.post("/auth/register", { email, handle, password, displayName });
    api.setTokens(accessToken, refreshToken);
    setUser(u);
    connectSocket();
    return u;
  }, []);

  const updateUser = useCallback((patch) => setUser(u => ({ ...u, ...patch })), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
