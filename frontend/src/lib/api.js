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
//  - Attaches the CSRF double-submit token on every mutating request. Kept
//    in memory rather than read from document.cookie: in production the
//    vyl_csrf cookie belongs to the backend's origin (cross-origin from the
//    frontend's page), and document.cookie can never read a cookie that
//    belongs to a different origin, full stop — no flag changes that. The
//    backend hands the token back in the JSON body instead (login/register/
//    me responses), which works regardless of origin.
//  - On 401, tries to refresh once, retries the request, then logs out
//  - Always returns { ok, data } or { ok: false, error } to callers
// ════════════════════════════════════════════════════════════════════════════

const BASE = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_BACKEND_URL || "/api");

let _csrfToken = null;
export function setCsrfToken(token) { _csrfToken = token || null; }

let _onLogout = null;
export function registerLogoutHandler(fn) { _onLogout = fn; }

async function rawFetch(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const res = await fetch(BASE + path, {
    ...opts,
    credentials: "include",
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" && _csrfToken ? { "X-CSRF-Token": _csrfToken } : {}),
      ...opts.headers,
    },
  });
  const json = await res.json().catch(() => null);
  if (json?.data?.csrfToken) setCsrfToken(json.data.csrfToken);
  return { status: res.status, json };
}

async function refreshOnce() {
  const { status } = await rawFetch("/auth/refresh", { method: "POST" });
  return status === 200;
}

async function recoverCsrfToken() {
  let result = await rawFetch("/auth/me");
  if (result.status === 401 && await refreshOnce()) result = await rawFetch("/auth/me");
  return result.status === 200 && !!_csrfToken;
}

function isCsrfFailure(status, json) {
  return status === 403 && json?.error?.message === "CSRF token missing or invalid";
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

  // The CSRF value is intentionally memory-only. A restored cookie session,
  // stale tab, or frontend hot reload can therefore have valid httpOnly auth
  // cookies before JavaScript has recovered their matching token. Refresh it
  // from the safe self endpoint and retry once instead of surfacing a raw 403.
  if (method !== "GET" && isCsrfFailure(status, json) && await recoverCsrfToken()) {
    ({ status, json } = await rawFetch(path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    }));
  }

  if (!json?.ok && json?.error) {
    const error = new Error(json.error.message || "Request failed");
    error.status = status;
    error.code = json.error.code;
    throw error;
  }
  return json?.data ?? json;
}

export async function upload(path, formData) {
  let { status, json } = await rawFetch(path, { method: "POST", body: formData });
  if (status === 401) {
    const refreshed = await refreshOnce();
    if (refreshed) ({ status, json } = await rawFetch(path, { method: "POST", body: formData }));
    else _onLogout?.();
  }
  if (isCsrfFailure(status, json) && await recoverCsrfToken()) {
    ({ status, json } = await rawFetch(path, { method: "POST", body: formData }));
  }
  if (!json?.ok && json?.error) {
    const error = new Error(json.error.message || "Upload failed");
    error.status = status;
    error.code = json.error.code;
    throw error;
  }
  return json?.data ?? json;
}

export const api = {
  get:    (path)        => request("GET",    path),
  post:   (path, body)  => request("POST",   path, body),
  patch:  (path, body)  => request("PATCH",  path, body),
  put:    (path, body)  => request("PUT",    path, body),
  delete: (path)        => request("DELETE", path),
  upload,
};
