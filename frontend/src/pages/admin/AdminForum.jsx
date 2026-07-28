import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner } from "../../components/ui/index.jsx";

const PAGE_SIZE = 20;

function btnStyle(color) {
  return {
    background: "none", border: `1px solid ${color}`, color, fontWeight: 700, fontSize: 12.5,
    padding: "6px 12px", borderRadius: 8, cursor: "pointer",
  };
}

const inputStyle = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border2)",
  background: "var(--bg3)", color: "var(--text)", fontSize: 14,
};

function Pager({ page, setPage, total, pageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, alignItems: "center" }}>
      <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={btnStyle("var(--text2)")}>Prev</button>
      <span style={{ color: "var(--text3)", fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
      <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={btnStyle("var(--text2)")}>Next</button>
    </div>
  );
}

// ── Category create/edit form ──────────────────────────────────────────────
function CategoryForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [color, setColor] = useState(initial?.color || "#7C3AED");
  const [icon, setIcon] = useState(initial?.icon || "");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  return (
    <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
        {!initial && <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug-url-safe" style={{ ...inputStyle, width: 180 }} />}
        <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="Icon (emoji)" style={{ ...inputStyle, width: 100 }} />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 44, height: 40, border: "1px solid var(--border2)", borderRadius: 8, background: "none" }} />
        <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="Sort" style={{ ...inputStyle, width: 80 }} />
      </div>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
        style={{ width: "100%", minHeight: 60, padding: 10, borderRadius: 10, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, resize: "vertical", marginBottom: 10 }} />
      {initial && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, color: "var(--text2)" }}>
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /> Active
        </label>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={btnStyle("var(--text3)")}>Cancel</button>
        <button onClick={() => onSave({ name, slug, description, color, icon, sort_order: parseInt(sortOrder, 10) || 0, is_active: isActive })} style={btnStyle("var(--violet-lt)")}>
          {initial ? "Save changes" : "Create category"}
        </button>
      </div>
    </div>
  );
}

// ── Moderators modal ───────────────────────────────────────────────────────
function ModeratorsModal({ category, onClose }) {
  const toast = useToast();
  const [moderators, setModerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState("moderator");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/forum/categories/${category.id}/moderators`)
      .then(({ moderators }) => setModerators(moderators))
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [category.id]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!handle.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/forum/categories/${category.id}/moderators`, { handle: handle.trim(), role });
      toast("Moderator added");
      setHandle("");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await api.delete(`/admin/forum/moderators/${id}`);
      toast("Moderator removed");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: 420, maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Moderators — {category.name}</div>

        {loading ? <Spinner size={24} /> : (
          <>
            {moderators.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border2)" }}>
                <span style={{ fontSize: 13 }}>@{m.user.handle} <span style={{ color: "var(--text3)" }}>({m.role})</span></span>
                <button disabled={busy} onClick={() => remove(m.id)} style={btnStyle("var(--coral)")}>Remove</button>
              </div>
            ))}
            {!moderators.length && <div style={{ color: "var(--text3)", fontSize: 13, padding: "12px 0" }}>No moderators assigned yet (max 5)</div>}
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="user handle" style={{ ...inputStyle, flex: 1 }} />
          <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
            <option value="moderator">moderator</option>
            <option value="senior_moderator">senior_moderator</option>
            <option value="community_admin">community_admin</option>
          </select>
          <button disabled={busy} onClick={add} style={btnStyle("var(--violet-lt)")}>Add</button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={btnStyle("var(--text2)")}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Categories section ─────────────────────────────────────────────────────
function CategoriesSection({ categories, onReload }) {
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modFor, setModFor] = useState(null);

  const create = async (data) => {
    try {
      await api.post("/admin/forum/categories", data);
      toast("Category created");
      setCreating(false);
      onReload();
    } catch (e) { toast(e.message, "error"); }
  };

  const update = async (data) => {
    try {
      await api.patch(`/admin/forum/categories/${editing.id}`, data);
      toast("Category updated");
      setEditing(null);
      onReload();
    } catch (e) { toast(e.message, "error"); }
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Categories</h2>
        {!creating && <button onClick={() => setCreating(true)} style={btnStyle("var(--violet-lt)")}>+ New category</button>}
      </div>

      {creating && <CategoryForm onSave={create} onCancel={() => setCreating(false)} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {categories.map(c => editing?.id === c.id ? (
          <div key={c.id} style={{ gridColumn: "1 / -1" }}>
            <CategoryForm initial={c} onSave={update} onCancel={() => setEditing(null)} />
          </div>
        ) : (
          <div key={c.id} style={{
            background: "var(--bg2)", border: `1px solid ${c.is_active ? "var(--border)" : "var(--coral)"}`,
            borderRadius: 14, padding: 16, opacity: c.is_active ? 1 : 0.6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span>{c.icon}</span>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{c.name}</span>
              {!c.is_active && <span style={{ color: "var(--coral)", fontSize: 11, fontWeight: 700 }}>inactive</span>}
            </div>
            <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 10 }}>{c.description || "No description"}</div>
            <div style={{ color: "var(--text3)", fontSize: 11.5, marginBottom: 10 }}>{c.thread_count} threads · /{c.slug}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditing(c)} style={btnStyle("var(--sky)")}>Edit</button>
              <button onClick={() => setModFor(c)} style={btnStyle("var(--violet-lt)")}>Moderators</button>
            </div>
          </div>
        ))}
      </div>

      {modFor && <ModeratorsModal category={modFor} onClose={() => setModFor(null)} />}
    </div>
  );
}

// ── Threads section ────────────────────────────────────────────────────────
const THREAD_STATUS_COLORS = { pending: "var(--sky)", active: "var(--green)", locked: "var(--text2)", archived: "var(--text3)", removed: "var(--coral)" };

function ThreadsSection({ categories }) {
  const toast = useToast();
  const [threads, setThreads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), status });
    if (q.trim()) params.set("q", q.trim());
    if (categoryId !== "all") params.set("category_id", categoryId);
    api.get(`/admin/forum/threads?${params.toString()}`)
      .then(({ threads, total }) => { setThreads(threads); setTotal(total); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, status, categoryId, q]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const patch = async (id, body, label) => {
    setBusyId(id);
    try {
      await api.patch(`/forum/threads/${id}`, body);
      toast(label);
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusyId(null); }
  };

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 14px" }}>Threads</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={q} onChange={e => { setPage(0); setQ(e.target.value); }} placeholder="Search title…" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <select value={categoryId} onChange={e => { setPage(0); setCategoryId(e.target.value); }} style={inputStyle}>
          <option value="all">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={status} onChange={e => { setPage(0); setStatus(e.target.value); }} style={inputStyle}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
          <option value="archived">Archived</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {threads.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title} {t.is_pinned && <span style={{ color: "var(--violet-lt)", fontSize: 11 }}>PINNED</span>}</div>
                  <div style={{ color: "var(--text3)", fontSize: 12.5 }}>
                    @{t.author.handle} · {t.category?.name} · {t.reply_count} replies · {t.vote_score} votes · {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{ color: THREAD_STATUS_COLORS[t.status] || "var(--text3)", fontWeight: 700, fontSize: 12, textTransform: "capitalize" }}>{t.status}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={busyId === t.id} onClick={() => patch(t.id, { is_pinned: !t.is_pinned }, t.is_pinned ? "Unpinned" : "Pinned")} style={btnStyle("var(--violet-lt)")}>
                    {t.is_pinned ? "Unpin" : "Pin"}
                  </button>
                  {t.status !== "locked" ? (
                    <button disabled={busyId === t.id} onClick={() => patch(t.id, { status: "locked" }, "Locked")} style={btnStyle("var(--text2)")}>Lock</button>
                  ) : (
                    <button disabled={busyId === t.id} onClick={() => patch(t.id, { status: "active" }, "Unlocked")} style={btnStyle("var(--sky)")}>Unlock</button>
                  )}
                  {t.status !== "removed" && (
                    <button disabled={busyId === t.id} onClick={() => patch(t.id, { status: "removed" }, "Removed")} style={btnStyle("var(--coral)")}>Remove</button>
                  )}
                </div>
              </div>
            ))}
            {!threads.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No threads found</div>}
          </div>
          <Pager page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
        </>
      )}
    </div>
  );
}

export default function AdminForum() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(() => {
    api.get("/admin/forum/categories").then(({ categories }) => setCategories(categories)).catch(e => toast(e.message, "error")).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => { loadCategories(); }, [loadCategories]);

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 20px" }}>Forum</h1>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <CategoriesSection categories={categories} onReload={loadCategories} />
          <ThreadsSection categories={categories} />
        </>
      )}
    </div>
  );
}
