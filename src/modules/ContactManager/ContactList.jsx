import { useState, useMemo } from "react";
import { fmt } from "../../lib/format.js";

const TYPE_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Pelanggan" },
  { value: "vendor", label: "Vendor" },
  { value: "creator", label: "Kreator" },
  { value: "competitor", label: "Kompetitor" },
];

const STATUS_FILTERS = [
  { value: "all", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak Aktif" },
  { value: "archived", label: "Diarsipkan" },
];

const TYPE_LABELS = {
  lead: "Lead",
  customer: "Pelanggan",
  vendor: "Vendor",
  creator: "Kreator",
  competitor: "Kompetitor",
};

function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  const letters = words.slice(0, 2).map((w) => w[0].toUpperCase());
  return letters.join("");
}

function SkeletonRow() {
  return (
    <div className="cm-contact-row cm-contact-row--skeleton" aria-hidden="true">
      <div className="cm-avatar cm-avatar--skeleton" />
      <div className="cm-contact-row-body">
        <div className="cm-skel-line cm-skel-line--name" />
        <div className="cm-skel-line cm-skel-line--sub" />
      </div>
    </div>
  );
}

export default function ContactList({ contacts, loading, selectedId, onSelect, onNew }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = contacts.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q) {
        const hay = [c.name, c.email, c.company].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "follow_up") {
        const aTime = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }
      const aTime = new Date(a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });
    return list;
  }, [contacts, search, typeFilter, statusFilter, sortBy]);

  function emptyMessage() {
    if (contacts.length === 0) return "Belum ada kontak. Klik \"Tambah Kontak\" untuk memulai.";
    if (search) return `Tidak ada kontak yang cocok dengan pencarian "${search}".`;
    if (typeFilter !== "all") return `Tidak ada kontak bertipe ${TYPE_LABELS[typeFilter] ?? typeFilter}.`;
    if (statusFilter !== "all") return "Tidak ada kontak dengan status tersebut.";
    return "Tidak ada kontak ditemukan.";
  }

  return (
    <div className="cm-list-panel">
      {/* Header */}
      <div className="cm-list-header">
        <span className="cm-list-title">Kontak</span>
        <button
          type="button"
          className="cta-button cm-list-add-btn"
          onClick={onNew}
          aria-label="Tambah kontak baru"
        >
          + Tambah Kontak
        </button>
      </div>

      {/* Search */}
      <div className="cm-search-wrap">
        <span className="cm-search-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          className="cm-search-input"
          placeholder="Cari nama, email, perusahaan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari kontak"
        />
      </div>

      {/* Type filter pills */}
      <div className="cm-type-pills" role="group" aria-label="Filter tipe kontak">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`cm-type-pill${typeFilter === f.value ? " cm-type-pill--active" : ""}`}
            onClick={() => setTypeFilter(f.value)}
            aria-pressed={typeFilter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="cm-status-filter-wrap">
        <select
          className="cm-status-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Urutkan kontak"
        >
          <option value="recent">Terbaru</option>
          <option value="name">Nama A-Z</option>
          <option value="follow_up">Follow-up Terdekat</option>
        </select>
        <select
          className="cm-status-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter status kontak"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="cm-contact-list" role="list" aria-label="Daftar kontak">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : filtered.length === 0 ? (
          <div className="cm-empty-state" role="status">
            <span className="cm-empty-icon" aria-hidden="true">👥</span>
            <p className="cm-empty-text">{emptyMessage()}</p>
          </div>
        ) : (
          filtered.map((contact) => (
            <button
              key={contact.id}
              type="button"
              role="listitem"
              className={`cm-contact-row${selectedId === contact.id ? " cm-contact-row--active" : ""}`}
              onClick={() => onSelect(contact)}
              aria-current={selectedId === contact.id ? "true" : undefined}
              aria-label={`Pilih kontak ${contact.name}`}
            >
              <div className={`cm-avatar cm-avatar--${contact.type}`} aria-hidden="true">
                {getInitials(contact.name)}
              </div>
              <div className="cm-contact-row-body">
                <div className="cm-contact-row-top">
                  <span className="cm-contact-name">{contact.name}</span>
                  <span className={`cm-type-badge cm-type-badge--${contact.type}`}>
                    {TYPE_LABELS[contact.type] ?? contact.type}
                  </span>
                </div>
                <div className="cm-contact-row-meta">
                  {contact.company && (
                    <span className="cm-contact-company">{contact.company}</span>
                  )}
                  {contact.email && (
                    <span className="cm-contact-email">{contact.email}</span>
                  )}
                </div>
                {Array.isArray(contact.tags) && contact.tags.length > 0 && (
                  <div className="cm-contact-row-tags" aria-label="Tag kontak">
                    {contact.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="cm-tag-chip cm-tag-chip--sm">{tag}</span>
                    ))}
                    {contact.tags.length > 3 && (
                      <span className="cm-tag-more">+{contact.tags.length - 3}</span>
                    )}
                  </div>
                )}
                <span className="cm-contact-time">{fmt.relativeTime(contact.created_at)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
