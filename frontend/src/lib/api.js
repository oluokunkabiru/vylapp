// ════════════════════════════════════════════════════════════════════════════
//  API CLIENT
//  Thin fetch wrapper that:
//  - Prefixes every request with /api (proxied to localhost:4000 in dev)
//  - Sends the httpOnly vyl_at/vyl_rt session cookies automatically
//    (credentials: "include") — tokens are never touched by JS
//  - Attaches the CSRF double-submit token (read from the non-httpOnly
//    vyl_csrf cookie) on every mutating request
//  - On 401, tries to refresh once, retries the request, then logs out
//  - Always returns { ok, data } or { ok: false, error } to callers
// ════════════════════════════════════════════════════════════════════════════

const BASE = "/api";

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
