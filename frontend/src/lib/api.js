// ════════════════════════════════════════════════════════════════════════════
//  API CLIENT
//  Thin fetch wrapper that:
//  - Prefixes every request with /api (proxied to localhost:4000 in dev)
//  - Injects the stored JWT access token as Bearer on every call
//  - On 401, tries to refresh once, retries the request, then logs out
//  - Always returns { ok, data } or { ok: false, error } to callers
// ════════════════════════════════════════════════════════════════════════════

const BASE = "/api";

function getToken() { return localStorage.getItem("vyl_access"); }
function getRefresh() { return localStorage.getItem("vyl_refresh"); }
function setTokens(access, refresh) {
  if (access)  localStorage.setItem("vyl_access",  access);
  if (refresh) localStorage.setItem("vyl_refresh", refresh);
}
function clearTokens() {
  localStorage.removeItem("vyl_access");
  localStorage.removeItem("vyl_refresh");
}

let _onLogout = null;
export function registerLogoutHandler(fn) { _onLogout = fn; }

async function rawFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function refreshOnce() {
  const rt = getRefresh();
  if (!rt) return false;
  const { status, json } = await rawFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (status === 200 && json?.data?.accessToken) {
    setTokens(json.data.accessToken, null);
    return true;
  }
  return false;
}

export async function request(method, path, body) {
  let { status, json } = await rawFetch(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (status === 401 && path !== "/auth/login" && path !== "/auth/register") {
    const refreshed = await refreshOnce();
    if (refreshed) {
      ({ status, json } = await rawFetch(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      }));
    } else {
      clearTokens();
      _onLogout?.();
    }
  }

  if (!json?.ok && json?.error) throw new Error(json.error.message || "Request failed");
  return json?.data ?? json;
}

export const api = {
  get:    (path)        => request("GET",    path),
  post:   (path, body)  => request("POST",   path, body),
  patch:  (path, body)  => request("PATCH",  path, body),
  put:    (path, body)  => request("PUT",    path, body),
  delete: (path)        => request("DELETE", path),
  setTokens,
  clearTokens,
  getToken,
};
