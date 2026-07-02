import { useState } from "react";
import { fmt } from "../../lib/format";
import { useToast } from "../../lib/ToastContext";
import CampaignContacts from "./CampaignContacts";

const STATUS_LABEL = {
  draft: "Draft",
  active: "Aktif",
  paused: "Dijeda",
  completed: "Selesai",
  archived: "Arsip",
};

export default function CampaignDetail({ campaign, onEdit, onDelete }) {
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(campaign.id);
      toast.success("Campaign berhasil dihapus.");
    } catch (err) {
      toast.error(err?.message ?? "Gagal menghapus campaign.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function formatBudget() {
    if (!campaign.budget) return "-";
    if (campaign.currency === "USD") {
      return `$${Number(campaign.budget).toLocaleString("en-US")}`;
    }
    return fmt.rupiah(campaign.budget);
  }

  function formatDateRange() {
    if (!campaign.start_date && !campaign.end_date) {
      return "Belum ditentukan";
    }
    return `${fmt.date(campaign.start_date)} → ${fmt.date(campaign.end_date)}`;
  }

  return (
    <div className="cgm-detail-inner">
      <div className="cgm-detail-header">
        <div className="cgm-detail-title-group">
          <h1 className="cgm-detail-title">{campaign.name}</h1>
          <span className={`cgm-status-badge cgm-${campaign.status}`}>
            {STATUS_LABEL[campaign.status] ?? campaign.status}
          </span>
        </div>
        <div className="cgm-detail-actions">
          <button type="button" className="cgm-button" onClick={() => onEdit(campaign)}>
            Edit
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              className="cgm-button cgm-button-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Hapus
            </button>
          ) : (
            <div className="cgm-confirm-inline">
              <span>Yakin?</span>
              <button
                type="button"
                className="cgm-confirm-yes"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "..." : "Ya"}
              </button>
              <button
                type="button"
                className="cgm-confirm-no"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="cgm-section">
        <h2 className="cgm-section-title">Detail Campaign</h2>
        <div className="cgm-stats-grid">
          <div className="cgm-stat-item">
            <span className="cgm-stat-label">Status</span>
            <span className="cgm-stat-value">
              {STATUS_LABEL[campaign.status] ?? campaign.status}
            </span>
          </div>
          {campaign.objective && (
            <div className="cgm-stat-item">
              <span className="cgm-stat-label">Tujuan</span>
              <span className="cgm-stat-value">{campaign.objective}</span>
            </div>
          )}
          <div className="cgm-stat-item">
            <span className="cgm-stat-label">Periode</span>
            <span className="cgm-stat-value" style={{ fontSize: 16 }}>
              {formatDateRange()}
            </span>
          </div>
          <div className="cgm-stat-item">
            <span className="cgm-stat-label">Budget</span>
            <span className="cgm-stat-value">{formatBudget()}</span>
          </div>
        </div>
      </div>

      {campaign.notes && (
        <div className="cgm-section">
          <h3 className="cgm-section-title">Catatan</h3>
          <p className="cgm-notes-text">{campaign.notes}</p>
        </div>
      )}

      <CampaignContacts campaignId={campaign.id} />
    </div>
  );
}
