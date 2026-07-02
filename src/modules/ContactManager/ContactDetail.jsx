import { useState } from "react";
import { fmt } from "../../lib/format.js";
import ContactForm from "./ContactForm.jsx";

const TYPE_LABELS = {
  lead: "Lead",
  customer: "Pelanggan",
  vendor: "Vendor",
  creator: "Kreator",
  competitor: "Kompetitor",
};

const STATUS_LABELS = {
  active: "Aktif",
  inactive: "Tidak Aktif",
  archived: "Diarsipkan",
};

function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="cm-detail-row">
      <span className="cm-detail-label">{label}</span>
      <span className="cm-detail-value">{value}</span>
    </div>
  );
}

export default function ContactDetail({ contact, onUpdate, onDelete, onClose }) {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!contact) {
    return (
      <div className="cm-detail-panel cm-detail-panel--empty" aria-label="Panel detail kontak">
        <span className="cm-detail-empty-icon" aria-hidden="true">👤</span>
        <p className="cm-detail-empty-text">Pilih kontak untuk melihat detail, atau tambah kontak baru.</p>
      </div>
    );
  }

  const socialEntries = contact.social_handles
    ? Object.entries(contact.social_handles).filter(([, v]) => v)
    : [];

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(contact.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleUpdate(id, changes) {
    const updated = await onUpdate(id, changes);
    setEditing(false);
    return updated;
  }

  if (editing) {
    return (
      <div className="cm-detail-panel" aria-label="Form edit kontak">
        <div className="cm-detail-edit-header">
          <h2 className="cm-detail-edit-title">Edit Kontak</h2>
          <button
            type="button"
            className="cm-detail-close"
            onClick={() => setEditing(false)}
            aria-label="Tutup form edit"
            disabled={submitting}
          >
            ×
          </button>
        </div>
        <ContactForm
          contact={contact}
          onUpdate={handleUpdate}
          onCancel={() => setEditing(false)}
          submitting={submitting}
          setSubmitting={setSubmitting}
        />
      </div>
    );
  }

  return (
    <div className="cm-detail-panel" aria-label={`Detail kontak ${contact.name}`}>
      {/* Header */}
      <div className="cm-detail-header">
        <div className="cm-detail-header-left">
          <div className={`cm-avatar cm-avatar--lg cm-avatar--${contact.type}`} aria-hidden="true">
            {getInitials(contact.name)}
          </div>
          <div>
            <h2 className="cm-detail-name">{contact.name}</h2>
            <div className="cm-detail-badges">
              <span className={`cm-type-badge cm-type-badge--${contact.type}`}>
                {TYPE_LABELS[contact.type] ?? contact.type}
              </span>
              <span className={`cm-status-badge cm-status-badge--${contact.status}`}>
                {STATUS_LABELS[contact.status] ?? contact.status}
              </span>
            </div>
          </div>
        </div>
        <div className="cm-detail-header-actions">
          <button
            type="button"
            className="ghost-button cm-detail-edit-btn"
            onClick={() => setEditing(true)}
            aria-label="Edit kontak ini"
          >
            Edit
          </button>
          <button
            type="button"
            className="cm-detail-close"
            onClick={onClose}
            aria-label="Tutup panel detail"
          >
            ×
          </button>
        </div>
      </div>

      {/* Info fields */}
      <div className="cm-detail-body">
        <div className="cm-detail-section">
          <DetailRow label="Email" value={contact.email} />
          <DetailRow label="Telepon" value={contact.phone} />
          <DetailRow label="Perusahaan" value={contact.company} />
          <DetailRow label="Ditambahkan" value={fmt.date(contact.created_at)} />
          <DetailRow label="Diperbarui" value={fmt.date(contact.updated_at)} />
        </div>

        {/* Social handles */}
        {socialEntries.length > 0 && (
          <div className="cm-detail-section">
            <span className="cm-detail-section-title">Media Sosial</span>
            <div className="cm-social-chips">
              {socialEntries.map(([platform, handle]) => (
                <span key={platform} className="cm-social-chip">
                  <span className="cm-social-chip-platform">{platform}</span>
                  <span className="cm-social-chip-handle">{handle}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {Array.isArray(contact.tags) && contact.tags.length > 0 && (
          <div className="cm-detail-section">
            <span className="cm-detail-section-title">Tag</span>
            <div className="cm-detail-tags">
              {contact.tags.map((tag) => (
                <span key={tag} className="cm-tag-chip">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="cm-detail-section">
            <span className="cm-detail-section-title">Catatan</span>
            <p className="cm-detail-notes">{contact.notes}</p>
          </div>
        )}

        {/* Delete */}
        <div className="cm-detail-section cm-detail-danger-zone">
          {confirmDelete ? (
            <div className="cm-delete-confirm" role="alert">
              <p className="cm-delete-confirm-text">
                Hapus <strong>{contact.name}</strong>? Tindakan ini tidak bisa dibatalkan.
              </p>
              <div className="cm-delete-confirm-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="cm-btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  aria-busy={deleting}
                >
                  {deleting ? "Menghapus…" : "Ya, Hapus"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="cm-btn-danger-outline"
              onClick={() => setConfirmDelete(true)}
              aria-label="Hapus kontak ini"
            >
              Hapus Kontak
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
