import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import "./KeuanganPribadi.css";

const SLUG = "keuangan-pribadi";
const EMPTY = { entries: [] };

const rupiah = (n) =>
  "Rp" + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

/**
 * Sample full mini-app (Module). Demonstrates the per-user persistence pattern
 * via the `module_instances` table — other modules follow the same shape.
 */
export default function KeuanganPribadi() {
  const { user } = useAuth();
  const [state, setState] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const saveTimer = useRef(null);

  // Load persisted state.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("module_instances")
      .select("state")
      .eq("module_slug", SLUG)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.state?.entries) setState(data.state);
        setLoaded(true);
      });
  }, [user]);

  // Debounced upsert whenever state changes (after initial load).
  const persist = useCallback(
    (next) => {
      if (!user) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        supabase
          .from("module_instances")
          .upsert(
            { user_id: user.id, module_slug: SLUG, state: next, updated_at: new Date().toISOString() },
            { onConflict: "user_id,module_slug" },
          )
          .then(() => {});
      }, 500);
    },
    [user],
  );

  function update(next) {
    setState(next);
    persist(next);
  }

  function addEntry(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!label.trim() || !value) return;
    const entry = { id: Date.now(), label: label.trim(), amount: value, type };
    update({ entries: [entry, ...state.entries] });
    setLabel("");
    setAmount("");
  }

  function removeEntry(id) {
    update({ entries: state.entries.filter((x) => x.id !== id) });
  }

  const income = state.entries
    .filter((x) => x.type === "income")
    .reduce((s, x) => s + x.amount, 0);
  const expense = state.entries
    .filter((x) => x.type === "expense")
    .reduce((s, x) => s + x.amount, 0);
  const balance = income - expense;

  return (
    <div className="kp-wrap">
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">Manajer Keuangan Pribadi</h1>
          <p className="db-view-sub">
            Catat pemasukan & pengeluaran kamu — tersimpan otomatis.
          </p>
        </div>
      </div>

      <div className="db-stats-row">
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{rupiah(income)}</span>
            <span className="db-stat-label">Pemasukan</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{rupiah(expense)}</span>
            <span className="db-stat-label">Pengeluaran</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{rupiah(balance)}</span>
            <span className="db-stat-label">Saldo</span>
          </div>
        </div>
      </div>

      <form className="kp-form" onSubmit={addEntry}>
        <input
          className="kp-input"
          placeholder="Keterangan (mis. Gaji, Makan siang)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="kp-input kp-input-amount"
          type="number"
          placeholder="Jumlah"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select
          className="kp-input kp-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
        <button type="submit" className="cta-button kp-add">
          Tambah
        </button>
      </form>

      <div className="kp-list">
        {!loaded ? (
          <p className="kp-empty">Memuat...</p>
        ) : state.entries.length === 0 ? (
          <p className="kp-empty">Belum ada catatan. Tambahkan yang pertama.</p>
        ) : (
          state.entries.map((x) => (
            <div key={x.id} className="kp-row">
              <span className="kp-row-label">{x.label}</span>
              <span
                className={`kp-row-amount ${x.type === "income" ? "kp-in" : "kp-out"}`}
              >
                {x.type === "income" ? "+" : "−"}
                {rupiah(x.amount)}
              </span>
              <button
                type="button"
                className="kp-del"
                aria-label="Hapus"
                onClick={() => removeEntry(x.id)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
