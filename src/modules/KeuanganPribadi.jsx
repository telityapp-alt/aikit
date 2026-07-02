import { useState } from "react";
import { useModuleState } from "../lib/useModuleState";
import { fmt } from "../lib/format";
import "./KeuanganPribadi.css";

const SLUG = "keuangan-pribadi";
const EMPTY = { entries: [] };

/**
 * Manajer Keuangan Pribadi — stateful module.
 * Persistence is handled entirely by useModuleState (debounced upsert to
 * module_instances). This component owns only UI + business logic.
 */
export default function KeuanganPribadi() {
  const [state, setState, loaded] = useModuleState(SLUG, EMPTY);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");

  // Ensure entries is always an array even if persisted state is malformed.
  const entries = Array.isArray(state?.entries) ? state.entries : [];

  function addEntry(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!label.trim() || !value) return;
    const entry = { id: Date.now(), label: label.trim(), amount: value, type };
    setState({ ...state, entries: [entry, ...entries] });
    setLabel("");
    setAmount("");
  }

  function removeEntry(id) {
    setState({ ...state, entries: entries.filter((x) => x.id !== id) });
  }

  const income = entries
    .filter((x) => x.type === "income")
    .reduce((s, x) => s + x.amount, 0);
  const expense = entries
    .filter((x) => x.type === "expense")
    .reduce((s, x) => s + x.amount, 0);
  const balance = income - expense;

  return (
    <div className="kp-wrap">
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">Manajer Keuangan Pribadi</h1>
          <p className="db-view-sub">
            Catat pemasukan &amp; pengeluaran kamu — tersimpan otomatis.
          </p>
        </div>
      </div>

      <div className="db-stats-row">
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{fmt.rupiah(income)}</span>
            <span className="db-stat-label">Pemasukan</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{fmt.rupiah(expense)}</span>
            <span className="db-stat-label">Pengeluaran</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{fmt.rupiah(balance)}</span>
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
        ) : entries.length === 0 ? (
          <p className="kp-empty">Belum ada catatan. Tambahkan yang pertama.</p>
        ) : (
          entries.map((x) => (
            <div key={x.id} className="kp-row">
              <span className="kp-row-label">{x.label}</span>
              <span
                className={`kp-row-amount ${x.type === "income" ? "kp-in" : "kp-out"}`}
              >
                {x.type === "income" ? "+" : "−"}
                {fmt.rupiah(x.amount)}
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
