import { useState, useMemo } from "react";
import { fmt } from "../../lib/format";

const STATUS_TABS = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Draft" },
  { key: "active", label: "Aktif" },
  { key: "paused", label: "Dijeda" },
  { key: "completed", label: "Selesai" },
  { key: "archived", label: "Arsip" },
];

const STATUS_LABEL = {
  draft: "Draft",
  active: "Aktif",
  paused: "Dijeda",
  completed: "Selesai",
  archived: "Arsip",
};

const EMPTY_MESSAGES = {
  all: "Belum ada campaign. Buat yang pertama.",
  draft: "Tidak ada campaign dengan status Draft.",
  active: "Tidak ada campaign yang sedang Aktif.",
  paused: "Tidak ada campaign yang Dijeda.",
  completed: "Tidak ada campaign yang Selesai.",
  archived: "Tidak ada campaign yang Diarsipkan.",
};

export default function CampaignList({
  campaigns,
  loading,
  selectedId,
  onSelect,
  onNew,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = campaigns;
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [campaigns, statusFilter, search]);

  return (
    <div className="cgm-list-panel">
      <div className="cgm-list-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="cgm-list-title">Campaign</h2>
          <button
            type="button"
            className="cta-button"
            style={{ height: 34, padding: "0 14px", fontSize: 13 }}
            onClick={onNew}
          >
            + Buat Campaign
          </button>
        </div>
        <input
          type="search"
          className="cgm-search"
          placeholder="Cari campaign..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari campaign"
        />
        <div className="cgm-status-tabs" role="tablist" aria-label="Filter status campaign">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.key}
              className={`cgm-status-tab${statusFilter === tab.key ? " cgm-active" : ""}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cgm-list-body">
        {loading ? (
          <div className="cgm-list-loading">
            <div className="cgm-skeleton" />
            <div className="cgm-skeleton" />
            <div className="cgm-skeleton" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="cgm-list-empty">
            {search.trim()
              ? `Tidak ada hasil untuk "${search}".`
              : EMPTY_MESSAGES[statusFilter]}
          </p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cgm-campaign-row${selectedId === c.id ? " cgm-selected" : ""}`}
              onClick={() => onSelect(c)}
              aria-pressed={selectedId === c.id}
            >
              <div className="cgm-row-top">
                <span
                  className={`cgm-status-dot cgm-${c.status}`}
                  aria-hidden="true"
                  title={STATUS_LABEL[c.status] ?? c.status}
                />
                <span className="cgm-row-name">{c.name}</span>
              </div>

              <div className="cgm-row-meta">
                {c.objective && <span>{c.objective}</span>}
                <span>
                  {c.start_date || c.end_date
                    ? `${fmt.date(c.start_date)} → ${fmt.date(c.end_date)}`
                    : "Belum ditentukan"}
                </span>
                <span>{c.budget ? fmt.rupiah(c.budget) : "-"}</span>
              </div>

              {c.updated_at && (
                <span className="cgm-row-time">{fmt.relativeTime(c.updated_at)}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
