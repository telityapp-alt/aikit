import { useState } from "react";
import { useEntity } from "../../lib/useEntity";
import { useToast } from "../../lib/ToastContext";
import { fmt } from "../../lib/format";

const ROLE_OPTIONS = [
  { value: "target", label: "Target" },
  { value: "influencer", label: "Influencer" },
  { value: "competitor", label: "Kompetitor" },
  { value: "partner", label: "Partner" },
];

export default function ContactCampaigns({ contact }) {
  const toast = useToast();
  const [showPicker, setShowPicker] = useState(false);

  const {
    data: contactCampaigns,
    loading,
    remove,
    create,
    refresh,
  } = useEntity("campaign_contacts", {
    select: "*, campaign:campaigns(*)",
    filter: { contact_id: contact.id },
    orderBy: "added_at",
    ascending: false,
    injectUserId: false,
  });

  const { data: allCampaigns } = useEntity("campaigns", {
    orderBy: "updated_at",
    ascending: false,
  });

  const assignedCampaignIds = new Set(contactCampaigns.map((item) => item.campaign_id));
  const availableCampaigns = allCampaigns.filter((item) => !assignedCampaignIds.has(item.id));

  async function handleRemove(rowId) {
    try {
      await remove(rowId);
      toast.success("Campaign dilepas dari kontak.");
    } catch (err) {
      toast.error(err?.message || "Gagal melepas campaign.");
    }
  }

  async function handleAdd(campaignId, role) {
    try {
      await create({
        campaign_id: campaignId,
        contact_id: contact.id,
        role,
      });
      await refresh();
      setShowPicker(false);
      toast.success("Campaign berhasil dikaitkan.");
    } catch (err) {
      toast.error(err?.message || "Gagal mengaitkan campaign.");
    }
  }

  return (
    <div className="cm-detail-section">
      <div className="cm-assoc-header">
        <span className="cm-detail-section-title">Campaign Terkait</span>
        <button
          type="button"
          className="ghost-button cm-assoc-action"
          onClick={() => setShowPicker(true)}
        >
          + Kaitkan Campaign
        </button>
      </div>

      {loading ? (
        <p className="cm-assoc-empty">Memuat campaign...</p>
      ) : contactCampaigns.length === 0 ? (
        <p className="cm-assoc-empty">
          Kontak ini belum terhubung ke campaign mana pun.
        </p>
      ) : (
        <div className="cm-assoc-list">
          {contactCampaigns.map((item) => (
            <div key={item.id} className="cm-assoc-item">
              <div className="cm-assoc-main">
                <strong>{item.campaign?.name || "Campaign"}</strong>
                <span>
                  {ROLE_OPTIONS.find((role) => role.value === item.role)?.label || item.role}
                </span>
                <span>
                  {item.campaign?.start_date || item.campaign?.end_date
                    ? `${fmt.date(item.campaign?.start_date)} -> ${fmt.date(item.campaign?.end_date)}`
                    : "Periode belum diatur"}
                </span>
              </div>
              <button
                type="button"
                className="cm-assoc-remove"
                onClick={() => handleRemove(item.id)}
              >
                Lepas
              </button>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <CampaignPickerModal
          campaigns={availableCampaigns}
          onClose={() => setShowPicker(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}

function CampaignPickerModal({ campaigns, onClose, onAdd }) {
  const [role, setRole] = useState("target");
  const [search, setSearch] = useState("");
  const filtered = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="cm-assoc-modal-overlay" onClick={onClose}>
      <div className="cm-assoc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-assoc-modal-head">
          <h3>Kaitkan Campaign</h3>
          <button type="button" className="cm-detail-close" onClick={onClose}>
            x
          </button>
        </div>
        <label className="cm-form-field">
          <span className="cm-form-label">Role</span>
          <select
            className="cm-form-input cm-form-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <input
          type="search"
          className="cm-search-input"
          placeholder="Cari campaign..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="cm-assoc-picker-list">
          {filtered.length === 0 ? (
            <p className="cm-assoc-empty">Tidak ada campaign tersedia.</p>
          ) : (
            filtered.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                className="cm-assoc-picker-item"
                onClick={() => onAdd(campaign.id, role)}
              >
                <strong>{campaign.name}</strong>
                <span>{campaign.objective || "Tanpa objective"}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
