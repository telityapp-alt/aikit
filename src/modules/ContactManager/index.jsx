import { useState, useMemo } from "react";
import { useEntity } from "../../lib/useEntity.js";
import { useToast } from "../../lib/ToastContext.jsx";
import ContactList from "./ContactList.jsx";
import ContactDetail from "./ContactDetail.jsx";
import ContactForm from "./ContactForm.jsx";
import "./index.css";

// Stable filter object — defined outside component so useEntity dep is stable.
const CONTACTS_OPTIONS = { orderBy: "created_at", ascending: false };

export default function ContactManager() {
  const toast = useToast();
  const { data: contacts, loading, create, update, remove } = useEntity(
    "contacts",
    CONTACTS_OPTIONS,
  );

  // null  → nothing selected
  // "new" → create mode (show form in right panel)
  // {…}  → contact object selected (show detail/edit)
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Stats derived from all contacts (unfiltered)
  const stats = useMemo(() => {
    const total = contacts.length;
    const active = contacts.filter((c) => c.status === "active").length;
    const followUps = contacts.filter((c) => c.next_follow_up_at).length;
    const creators = contacts.filter((c) => c.type === "creator").length;
    return { total, active, followUps, creators };
  }, [contacts]);

  function handleSelect(contact) {
    setSelected(contact);
  }

  function handleNew() {
    setSelected("new");
  }

  function handleClose() {
    setSelected(null);
  }

  async function handleCreate(payload) {
    const created = await create(payload);
    setSelected(created);
    return created;
  }

  async function handleUpdate(id, changes) {
    const updated = await update(id, changes);
    // Sync the selected contact with the updated record
    setSelected(updated);
    return updated;
  }

  async function handleDelete(id) {
    try {
      await remove(id);
      toast.success("Kontak berhasil dihapus.");
      setSelected(null);
    } catch {
      toast.error("Gagal menghapus kontak. Coba lagi.");
    }
  }

  const isNewMode = selected === "new";
  const selectedContact = selected && selected !== "new" ? selected : null;
  // Keep selected contact in sync with latest data after updates
  const liveContact = selectedContact
    ? (contacts.find((c) => c.id === selectedContact.id) ?? selectedContact)
    : null;

  return (
    <div className="cm-wrap">
      {/* Page header */}
      <div className="db-view-header cm-page-header">
        <div>
          <h1 className="db-view-title">Manajer Kontak</h1>
          <p className="db-view-sub">
            Kelola lead, pelanggan, vendor, kreator, dan kompetitor kamu.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="db-stats-row cm-stats-row">
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{stats.total}</span>
            <span className="db-stat-label">Total Kontak</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{stats.active}</span>
            <span className="db-stat-label">Kontak Aktif</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{stats.followUps}</span>
            <span className="db-stat-label">Perlu Follow-up</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{stats.creators}</span>
            <span className="db-stat-label">Kreator</span>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className={`cm-panels${selected ? " cm-panels--detail-open" : ""}`}>
        {/* Left: list */}
        <ContactList
          contacts={contacts}
          loading={loading}
          selectedId={liveContact?.id ?? null}
          onSelect={handleSelect}
          onNew={handleNew}
        />

        {/* Right: detail or create form */}
        <div className="cm-right-panel">
          {isNewMode ? (
            <div className="cm-detail-panel" aria-label="Form tambah kontak baru">
              <div className="cm-detail-edit-header">
                <h2 className="cm-detail-edit-title">Tambah Kontak Baru</h2>
                <button
                  type="button"
                  className="cm-detail-close"
                  onClick={handleClose}
                  aria-label="Tutup form tambah kontak"
                  disabled={submitting}
                >
                  ×
                </button>
              </div>
              <ContactForm
                contact={null}
                onCreate={handleCreate}
                onCancel={handleClose}
                submitting={submitting}
                setSubmitting={setSubmitting}
              />
            </div>
          ) : (
            <ContactDetail
              contact={liveContact}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
