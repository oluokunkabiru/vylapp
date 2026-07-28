import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner } from "../../components/ui/index.jsx";

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

// ── Feature flags ────────────────────────────────────────────────────────────
function FlagsSection() {
  const toast = useToast();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/settings/flags").then(({ flags }) => setFlags(flags)).catch(e => toast(e.message, "error")).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newKey.trim()) return;
    setBusy("new");
    try {
      await api.post("/admin/settings/flags", { key: newKey.trim(), description: newDesc.trim() || null });
      toast("Flag created");
      setNewKey(""); setNewDesc("");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusy(null); }
  };

  const toggle = async (f) => {
    setBusy(f.id);
    try {
      await api.patch(`/admin/settings/flags/${f.id}`, { enabled: !f.enabled });
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusy(null); }
  };

  const setRollout = async (f, pct) => {
    setBusy(f.id);
    try {
      await api.patch(`/admin/settings/flags/${f.id}`, { rollout_pct: pct });
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusy(null); }
  };

  const remove = async (f) => {
    setBusy(f.id);
    try {
      await api.delete(`/admin/settings/flags/${f.id}`);
      toast("Flag deleted");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusy(null); }
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 14px" }}>Feature flags</h2>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><Spinner size={28} /></div>
      ) : (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
          {flags.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--mono)" }}>{f.key}</div>
                {f.description && <div style={{ color: "var(--text3)", fontSize: 12 }}>{f.description}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11.5, color: "var(--text3)" }}>rollout</span>
                <input type="number" min={0} max={100} defaultValue={f.rollout_pct} disabled={busy === f.id}
                  onBlur={e => setRollout(f, Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  style={{ ...inputStyle, width: 64, padding: "6px 8px" }} />
                <span style={{ fontSize: 11.5, color: "var(--text3)" }}>%</span>
              </div>
              <button disabled={busy === f.id} onClick={() => toggle(f)} style={btnStyle(f.enabled ? "var(--green)" : "var(--text3)")}>
                {f.enabled ? "Enabled" : "Disabled"}
              </button>
              <button disabled={busy === f.id} onClick={() => remove(f)} style={btnStyle("var(--coral)")}>Delete</button>
            </div>
          ))}
          {!flags.length && <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text3)" }}>No feature flags yet</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="flag_key" style={{ ...inputStyle, width: 200 }} />
        <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" style={{ ...inputStyle, flex: 1 }} />
        <button disabled={busy === "new"} onClick={create} style={btnStyle("var(--violet-lt)")}>+ New flag</button>
      </div>
    </div>
  );
}

// ── App config ───────────────────────────────────────────────────────────────
function ConfigRow({ row, onSave, onDelete, busy }) {
  const [value, setValue] = useState(JSON.stringify(row.value, null, 2));
  const [description, setDescription] = useState(row.description || "");
  const [error, setError] = useState(null);

  const save = () => {
    try {
      const parsed = JSON.parse(value);
      setError(null);
      onSave(row.key, parsed, description);
    } catch {
      setError("Value must be valid JSON");
    }
  };

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 13.5, fontFamily: "var(--mono)" }}>{row.key}</span>
        <button disabled={busy} onClick={() => onDelete(row.key)} style={btnStyle("var(--coral)")}>Delete</button>
      </div>
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
        style={{ ...inputStyle, width: "100%", marginBottom: 8 }} />
      <textarea value={value} onChange={e => setValue(e.target.value)} rows={4}
        style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: 12.5, fontFamily: "var(--mono)", resize: "vertical" }} />
      {error && <div style={{ color: "var(--coral)", fontSize: 12, marginTop: 6 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button disabled={busy} onClick={save} style={btnStyle("var(--violet-lt)")}>Save</button>
      </div>
    </div>
  );
}

function ConfigSection() {
  const toast = useToast();
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/settings/config").then(({ config }) => setConfig(config)).catch(e => toast(e.message, "error")).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const save = async (key, value, description) => {
    setBusy(true);
    try {
      await api.put(`/admin/settings/config/${encodeURIComponent(key)}`, { value, description });
      toast("Config saved");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const remove = async (key) => {
    setBusy(true);
    try {
      await api.delete(`/admin/settings/config/${encodeURIComponent(key)}`);
      toast("Config deleted");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const createNew = () => {
    if (!newKey.trim()) return;
    if (config.some(c => c.key === newKey.trim())) { toast("Key already exists", "error"); return; }
    setConfig(c => [...c, { key: newKey.trim(), value: {}, description: "" }]);
    setNewKey("");
  };

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 14px" }}>App config</h2>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><Spinner size={28} /></div>
      ) : (
        <>
          {config.map(row => (
            <ConfigRow key={row.key} row={row} onSave={save} onDelete={remove} busy={busy} />
          ))}
          {!config.length && <div style={{ color: "var(--text3)", padding: "20px 0" }}>No config keys yet</div>}
        </>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="new_config_key" style={{ ...inputStyle, width: 220 }} />
        <button onClick={createNew} style={btnStyle("var(--violet-lt)")}>+ Add key</button>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 20px" }}>Platform Settings</h1>
      <FlagsSection />
      <ConfigSection />
    </div>
  );
}
