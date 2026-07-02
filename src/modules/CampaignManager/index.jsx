import { useState, useMemo } from "react";
import { useEntity } from "../../lib/useEntity";
import CampaignList from "./CampaignList";
import CampaignDetail from "./CampaignDetail";
import CampaignForm from "./CampaignForm";
import "./index.css";

export default function CampaignManager() {
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [mode, setMode] = useState("detail");

  const filter = useMemo(() => ({}), []);
  const { data: campaigns, loading, create, update, remove } = useEntity("campaigns", {
    orderBy: "updated_at",
    ascending: false,
    filter,
  });

  function handleSelectCampaign(campaign) {
    setSelectedCampaign(campaign);
    setMode("detail");
  }

  function handleNewCampaign() {
    setSelectedCampaign(null);
    setMode("form");
  }

  function handleEdit(campaign) {
    setSelectedCampaign(campaign);
    setMode("form");
  }

  async function handleCreate(payload) {
    const created = await create(payload);
    setSelectedCampaign(created);
    setMode("detail");
  }

  async function handleUpdate(id, payload) {
    const updated = await update(id, payload);
    setSelectedCampaign(updated);
    setMode("detail");
  }

  async function handleDelete(id) {
    await remove(id);
    setSelectedCampaign(null);
    setMode("detail");
  }

  function handleCancel() {
    if (selectedCampaign) {
      setMode("detail");
    } else {
      setSelectedCampaign(null);
      setMode("detail");
    }
  }

  return (
    <div className="cgm-shell">
      <CampaignList
        campaigns={campaigns}
        loading={loading}
        selectedId={selectedCampaign?.id}
        onSelect={handleSelectCampaign}
        onNew={handleNewCampaign}
      />

      <div className="cgm-detail-panel">
        {mode === "form" ? (
          <CampaignForm
            campaign={selectedCampaign}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onCancel={handleCancel}
          />
        ) : selectedCampaign ? (
          <CampaignDetail
            campaign={selectedCampaign}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <div className="cgm-placeholder">
            <div className="cgm-placeholder-icon">📋</div>
            <p className="cgm-placeholder-text">
              Pilih campaign dari daftar atau buat yang baru.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
