import { useMemo, useState } from "react";
import { useEntity } from "../../lib/useEntity";
import { useToast } from "../../lib/ToastContext";

const ROLE_OPTIONS = [
  { value: "target", label: "Target" },
  { value: "influencer", label: "Influencer" },
  { value: "competitor", label: "Kompetitor" },
  { value: "partner", label: "Partner" },
];

const TYPE_LABEL = {
  lead: "Lead",
  customer: "Customer",
  vendor: "Vendor",
  creator: "Creator",
  competitor: "Kompetitor",
};

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function CampaignContacts({ campaignId }) {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);

  const { data: allContacts, loading: loadingAll } = useEntity("contacts", {
    orderBy: "name",
    ascending: true,
  });

  const {
    data: campaignContacts,
    loading: loadingContacts,
    error: campaignContactsError,
    create,
    remove,
    refresh,
  } = useEntity("campaign_contacts", {
    select: "*, contact:contacts(*)",
    filter: { campaign_id: campaignId },
    injectUserId: false,
    autoLoad: Boolean(campaignId),
  });

  async function handleRemove(rowId) {
    try {
      await remove(rowId);
      toast.success("Kontak dihapus dari campaign.");
    } catch (err) {
      toast.error("Gagal menghapus kontak.");
      console.error(err);
    }
  }

  async function handleAdd(contactId, role) {
    try {
      await create({
        campaign_id: campaignId,
        contact_id: contactId,
        role,
      });
      await refresh();
      toast.success("Kontak ditambahkan ke campaign.");
    } catch (err) {
      if (err.code === "23505") {
        toast.error("Kontak sudah ada dalam campaign ini.");
      } else {
        toast.error("Gagal menambah kontak.");
      }
      console.error(err);
      throw err;
    }
  }

  const assignedIds = new Set(campaignContacts.map((cc) => cc.contact_id));
  const availableContacts = allContacts.filter((c) => !assignedIds.has(c.id));

  return (
    <div className="cgm-section">
      <div className="cgm-contacts-header">
        <h3 className="cgm-section-title">Kontak Campaign</h3>
        <button
          type="button"
          className="cgm-button"
          onClick={() => setShowModal(true)}
          style={{ height: 32, padding: "0 12px", fontSize: 13 }}
        >
          + Tambah Kontak
        </button>
      </div>

      {campaignContactsError ? (
        <p className="cgm-contacts-empty">Gagal memuat kontak campaign.</p>
      ) : loadingContacts ? (
        <p className="cgm-contacts-empty">Memuat kontak...</p>
      ) : campaignContacts.length === 0 ? (
        <p className="cgm-contacts-empty">
          Belum ada kontak yang ditambahkan. Klik tombol di atas untuk menambah.
        </p>
      ) : (
        <div className="cgm-contact-list">
          {campaignContacts.map((cc) => {
            const contact = cc.contact;
            if (!contact) return null;
            return (
              <div key={cc.id} className="cgm-contact-row">
                <div className="cgm-contact-avatar">{getInitials(contact.name)}</div>
                <div className="cgm-contact-info">
                  <div className="cgm-contact-name">{contact.name}</div>
                  <div className="cgm-contact-badges">
                    {contact.type && (
                      <span className={`cgm-contact-badge cgm-type-${contact.type}`}>
                        {TYPE_LABEL[contact.type] ?? contact.type}
                      </span>
                    )}
                    <span className={`cgm-contact-badge cgm-role-${cc.role}`}>
                      {ROLE_OPTIONS.find((r) => r.value === cc.role)?.label ?? cc.role}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="cgm-remove-contact"
                  aria-label={`Hapus ${contact.name}`}
                  onClick={() => handleRemove(cc.id)}
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ContactSearchModal
          contacts={availableContacts}
          loading={loadingAll}
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function ContactSearchModal({ contacts, loading, onAdd, onClose }) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(null);
  const [selectedRole, setSelectedRole] = useState("target");

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.trim().toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  async function handleAddClick(contactId) {
    setAdding(contactId);
    try {
      await onAdd(contactId, selectedRole);
      onClose();
    } catch {
      setAdding(null);
    }
  }

  return (
    <div className="cgm-modal-overlay" onClick={onClose}>
      <div className="cgm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cgm-modal-header">
          <h3 className="cgm-modal-title">Tambah Kontak ke Campaign</h3>
          <button
            type="button"
            className="cgm-modal-close"
            aria-label="Tutup"
            onClick={onClose}
          >
            x
          </button>
        </div>

        <div className="cgm-modal-body">
          <input
            type="search"
            className="cgm-search"
            placeholder="Cari kontak..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className="cgm-form-row">
            <label className="cgm-form-label" htmlFor="cgm-role-select">
              Role kontak dalam campaign
            </label>
            <select
              id="cgm-role-select"
              className="cgm-role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ width: "100%" }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="cgm-modal-empty">Memuat kontak...</p>
          ) : filtered.length === 0 ? (
            <p className="cgm-modal-empty">
              {search.trim()
                ? `Tidak ada kontak yang cocok dengan "${search}".`
                : "Tidak ada kontak tersedia. Buat kontak terlebih dahulu."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((c) => (
                <div key={c.id} className="cgm-search-result">
                  <div className="cgm-contact-avatar">{getInitials(c.name)}</div>
                  <div className="cgm-search-result-info">
                    <div className="cgm-search-result-name">{c.name}</div>
                    {(c.email || c.company) && (
                      <div className="cgm-search-result-meta">
                        {c.email || ""}
                        {c.email && c.company ? " - " : ""}
                        {c.company || ""}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="cgm-button cgm-add-contact-btn"
                    onClick={() => handleAddClick(c.id)}
                    disabled={adding === c.id}
                  >
                    {adding === c.id ? "..." : "Tambah"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
