// ════════════════════════════════════════════════════════════════════════════
//  API CLIENT
//  Thin fetch wrapper that:
//  - Dev: talks to the Vite dev-server proxy at /api (see vite.config.js),
//    which forwards to the local/BACKEND_BASE_URL backend same-origin.
//  - Production build: talks to the backend directly at VITE_BACKEND_URL —
//    no proxy involved at all (the built bundle never runs behind Vite).
//    This only works because the backend's auth cookies are already
//    SameSite=None + Secure in production for exactly this cross-origin
//    case (see backend/src/utils/authCookies.ts) and CORS is configured
//    with credentials for the real frontend origin (CLIENT_ORIGIN).
//  - Sends the httpOnly vyl_at/vyl_rt session cookies automatically
//    (credentials: "include") — tokens are never touched by JS
//  - Attaches the CSRF double-submit token (read from the non-httpOnly
//    vyl_csrf cookie) on every mutating request
//  - On 401, tries to refresh once, retries the request, then logs out
//  - Always returns { ok, data } or { ok: false, error } to callers
// ════════════════════════════════════════════════════════════════════════════

const BASE = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_BACKEND_URL || "/api");

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)vyl_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

let _onLogout = null;
export function registerLogoutHandler(fn) { _onLogout = fn; }

async function rawFetch(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const csrfToken = method !== "GET" ? getCsrfToken() : null;
  const res = await fetch(BASE + path, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...opts.headers,
    },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function refreshOnce() {
  const { status } = await rawFetch("/auth/refresh", { method: "POST" });
  return status === 200;
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
};
