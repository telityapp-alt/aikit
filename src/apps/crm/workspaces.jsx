import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useToast } from "../../lib/ToastContext.jsx";
import EntityActivityTimeline from "../../components/EntityActivityTimeline.jsx";
import {
  archiveCrmRecord,
  deleteCrmRecord,
  filterArchivedRecords,
  isRecordArchived,
  restoreCrmRecord,
  useCrmGovernance,
} from "./governance.js";

const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
  open: "Open",
  completed: "Completed",
  qualified: "Qualified",
  disqualified: "Disqualified",
  converted: "Converted",
  won: "Won",
  lost: "Lost",
};

const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const LEAD_STAGE_LABELS = {
  new: "New",
  attempted: "Attempted",
  connected: "Connected",
  qualified: "Qualified",
  proposal: "Proposal",
  converted: "Converted",
  lost: "Lost",
};

const LEAD_STATUS_LABELS = {
  open: "Open",
  qualified: "Qualified",
  disqualified: "Disqualified",
  converted: "Converted",
  archived: "Archived",
};

const DEAL_STATUS_LABELS = {
  open: "Open",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

const ENTITY_LABELS = {
  person: "Person",
  organization: "Organization",
  lead: "Lead",
  deal: "Deal",
  task: "Task",
  campaign: "Campaign",
  content_post: "Content",
  contact: "Contact",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function formatMoney(amount, currency = "IDR") {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
}

function StatusPill({ value }) {
  if (!value) return null;
  return <span className={`crm-pill crm-pill--${String(value).toLowerCase()}`}>{STATUS_LABELS[value] ?? value}</span>;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user?.id) throw new Error("User belum login.");
  return user.id;
}

function toggleSelectionValue(values, id) {
  return values.includes(id) ? values.filter((item) => item !== id) : [...values, id];
}

function buildBulkTaskPayload(userId, entityType, entityId, title, dueAt, body = "") {
  return {
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    title: title.trim(),
    body: body.trim() || null,
    due_at: dueAt || null,
    status: "open",
    priority: "medium",
  };
}

function confirmBulkAction(title, lines) {
  if (typeof window === "undefined") return true;
  return window.confirm([title, "", ...lines].join("\n"));
}

function buildTaskForm(task, fallback = {}) {
  return {
    title: task?.title || "",
    body: task?.body || "",
    status: task?.status || "open",
    priority: task?.priority || "medium",
    due_at: task?.due_at ? formatDateTimeInput(task.due_at) : "",
    entity_type: task?.entity_type || fallback.entity_type || "person",
    entity_id: task?.entity_id || fallback.entity_id || "",
  };
}

function buildOrganizationForm(org) {
  return {
    name: org?.name || "",
    website: org?.website || "",
    industry: org?.industry || "",
    city: org?.city || "",
    country: org?.country || "",
    status: org?.status || "active",
  };
}

function buildLeadForm(lead) {
  return {
    person_id: lead?.person_id || "",
    organization_id: lead?.organization_id || "",
    source_type: lead?.source_type || "manual",
    source_ref: lead?.source_ref || "",
    stage: lead?.stage || "new",
    status: lead?.status || "open",
    score: String(lead?.score ?? 0),
    temperature: lead?.temperature || "warm",
    qualification_notes: lead?.qualification_notes || "",
    disqualification_reason: lead?.disqualification_reason || "",
  };
}

function buildDealForm(deal, defaultPipelineId, defaultStageId) {
  return {
    name: deal?.name || "",
    pipeline_id: deal?.pipeline_id || defaultPipelineId || "",
    stage_id: deal?.stage_id || defaultStageId || "",
    organization_id: deal?.organization_id || "",
    primary_person_id: deal?.primary_person_id || "",
    amount: deal?.amount ? String(deal.amount) : "",
    currency: deal?.currency || "IDR",
    expected_close_at: formatDateTimeInput(deal?.expected_close_at),
    status: deal?.status || "open",
    source_type: deal?.source_type || "manual",
    source_ref: deal?.source_ref || "",
  };
}

function EmptySelectOption({ label = "Pilih..." }) {
  return <option value="">{label}</option>;
}

function RecordStats({ items }) {
  return (
    <div className="crm-metric-grid">
      {items.map((item) => (
        <article key={item.label} className="crm-metric-card">
          <span className="crm-metric-value">{item.value}</span>
          <span className="crm-metric-label">{item.label}</span>
        </article>
      ))}
    </div>
  );
}

function RelatedRecordLinks({ title = "Related Records", items, onNavigateRecord }) {
  const visibleItems = (items || []).filter(Boolean);
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="crm-related-list">
      <strong>{title}</strong>
      {visibleItems.map((item) => (
        <button
          key={`${item.section}-${item.id}`}
          type="button"
          className="crm-related-link"
          onClick={() => onNavigateRecord?.(item.section, item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function QuickTaskComposer({ entityType, entityId, onCreate, disabled }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !entityId) {
      toast.error("Task title dan linked record wajib ada.");
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        due_at: dueAt || null,
        entity_type: entityType,
        entity_id: entityId,
        status: "open",
        priority: "medium",
      });
      setTitle("");
      setDueAt("");
      toast.success("Task berhasil dibuat.");
    } catch (error) {
      toast.error(error?.message || "Gagal membuat task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="crm-inline-form" onSubmit={handleSubmit}>
      <input
        className="text-input"
        placeholder="Quick task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={disabled || saving}
      />
      <input
        type="datetime-local"
        className="text-input"
        value={dueAt}
        onChange={(e) => setDueAt(e.target.value)}
        disabled={disabled || saving}
      />
      <button type="submit" className="ghost-button" disabled={disabled || saving}>
        {saving ? "Saving..." : "Add Task"}
      </button>
    </form>
  );
}

export function OrganizationsWorkspaceSection({
  organizations,
  people,
  leads,
  deals,
  tasks,
  focusedRecordId,
  onNavigateRecord,
  loading,
  createOrganization,
  updateOrganization,
  createTask,
  refreshOrganizations,
}) {
  const toast = useToast();
  const { can } = useCrmGovernance();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [archiveState, setArchiveState] = useState("active");
  const [selectedId, setSelectedId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedId) || null,
    [organizations, selectedId],
  );
  const [form, setForm] = useState(() => buildOrganizationForm(null));

  useEffect(() => {
    setForm(buildOrganizationForm(selectedOrganization));
  }, [selectedOrganization, isCreating]);

  useEffect(() => {
    if (!focusedRecordId || !organizations.some((org) => org.id === focusedRecordId)) return;
    setSelectedId(focusedRecordId);
    setIsCreating(false);
  }, [focusedRecordId, organizations]);

  const filteredOrganizations = useMemo(() => {
    return filterArchivedRecords(organizations, archiveState).filter((org) => {
      const matchesSearch = [org.name, org.website, org.industry, org.city, org.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || org.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organizations, search, statusFilter, archiveState]);

  async function handleArchiveAction(action) {
    if (!selectedOrganization) return;
    try {
      if (action === "archive") {
        await archiveCrmRecord(
          "organization",
          selectedOrganization.id,
          "Archived from CRM organizations workspace",
        );
        toast.success("Organization berhasil diarsipkan.");
      } else {
        await restoreCrmRecord("organization", selectedOrganization.id);
        toast.success("Organization berhasil direstore.");
      }
      await refreshOrganizations();
    } catch (error) {
      toast.error(error?.message || "Gagal menjalankan lifecycle action.");
    }
  }

  const relatedSummary = useMemo(() => {
    if (!selectedOrganization) {
      return { people: [], leads: [], deals: [], tasks: [] };
    }

    const relatedPeople = people.filter(
      (person) => person.primary_organization_id === selectedOrganization.id,
    );
    const relatedLeads = leads.filter(
      (lead) => lead.organization_id === selectedOrganization.id,
    );
    const relatedDeals = deals.filter(
      (deal) => deal.organization_id === selectedOrganization.id,
    );
    const relatedTasks = tasks.filter(
      (task) => task.entity_type === "organization" && task.entity_id === selectedOrganization.id,
    );
    return { people: relatedPeople, leads: relatedLeads, deals: relatedDeals, tasks: relatedTasks };
  }, [selectedOrganization, people, leads, deals, tasks]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Organization name wajib diisi.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      name_normalized: normalizeText(form.name).replace(/[^a-z0-9]+/g, "-"),
      website: form.website.trim() || null,
      industry: form.industry.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      status: form.status,
    };

    setSaving(true);
    try {
      if (isCreating) {
        const created = await createOrganization(payload);
        setSelectedId(created.id);
        setIsCreating(false);
        toast.success("Organization berhasil dibuat.");
      } else if (selectedOrganization) {
        await updateOrganization(selectedOrganization.id, payload);
        toast.success("Organization berhasil diperbarui.");
      }
    } catch (error) {
      toast.error(error?.message || "Gagal menyimpan organization.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="crm-section-grid" data-testid="crm-section-organizations">
      <div className="crm-section-main">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h2 className="crm-panel-title">Organizations Workspace</h2>
              <p className="crm-panel-sub">
                Compact account table dengan record workspace, related records, dan quick operational actions.
              </p>
            </div>
            <button
              type="button"
              className="cta-button"
              data-testid="crm-create-organization"
              onClick={() => {
                setSelectedId(null);
                setIsCreating(true);
                setForm(buildOrganizationForm(null));
              }}
            >
              Tambah Organization
            </button>
          </div>

          <RecordStats
            items={[
              { label: "Organizations", value: organizations.length },
              { label: "Active", value: organizations.filter((org) => org.status === "active").length },
              { label: "With Deals", value: organizations.filter((org) => deals.some((deal) => deal.organization_id === org.id)).length },
              { label: "With People", value: organizations.filter((org) => people.some((person) => person.primary_organization_id === org.id)).length },
            ]}
          />

          <div className="crm-toolbar">
            <input
              className="text-input"
              placeholder="Cari organization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="text-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
            <select
              className="text-input"
              value={archiveState}
              onChange={(e) => setArchiveState(e.target.value)}
            >
              <option value="active">Active only</option>
              <option value="archived">Archived only</option>
              <option value="all">All records</option>
            </select>
          </div>

          {loading ? (
            <div className="crm-empty">Memuat organizations...</div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="crm-empty">Belum ada organization yang match filter.</div>
          ) : (
            <div className="crm-table-wrap crm-table-wrap--compact">
              <table className="crm-table crm-table--compact">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Industry</th>
                    <th>Website</th>
                    <th>People</th>
                    <th>Deals</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganizations.map((org) => (
                    <tr
                      key={org.id}
                      className={selectedId === org.id ? "crm-table-row--active" : ""}
                      onClick={() => {
                        setSelectedId(org.id);
                        setIsCreating(false);
                      }}
                    >
                      <td>
                        <div className="crm-cell-strong">{org.name}</div>
                        <div className="crm-cell-sub">{org.city || org.country || "No location"}</div>
                      </td>
                      <td>{org.industry || "-"}</td>
                      <td>{org.website || "-"}</td>
                      <td>{people.filter((person) => person.primary_organization_id === org.id).length}</td>
                      <td>{deals.filter((deal) => deal.organization_id === org.id).length}</td>
                      <td><StatusPill value={org.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <aside className="crm-section-side">
        <section className="crm-panel" data-testid="crm-organization-detail">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">
                {isCreating ? "New Organization" : selectedOrganization ? "Organization Detail" : "Pilih Organization"}
              </h3>
              <p className="crm-panel-sub">
                Klik row untuk buka record workspace dan jalankan action tanpa pindah halaman.
              </p>
            </div>
          </div>

          {!isCreating && !selectedOrganization ? (
            <div className="crm-empty">Pilih organization dari table untuk buka detail.</div>
          ) : (
            <>
              <form className="crm-form" onSubmit={handleSubmit}>
                <label className="crm-field">
                  <span>Name</span>
                  <input
                    className="text-input"
                    data-testid="crm-organization-name-input"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={saving}
                  />
                </label>
                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Website</span>
                    <input
                      className="text-input"
                      value={form.website}
                      onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                      disabled={saving}
                    />
                  </label>
                  <label className="crm-field">
                    <span>Industry</span>
                    <input
                      className="text-input"
                      value={form.industry}
                      onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
                      disabled={saving}
                    />
                  </label>
                </div>
                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>City</span>
                    <input
                      className="text-input"
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                      disabled={saving}
                    />
                  </label>
                  <label className="crm-field">
                    <span>Country</span>
                    <input
                      className="text-input"
                      value={form.country}
                      onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                      disabled={saving}
                    />
                  </label>
                </div>
                <label className="crm-field">
                  <span>Status</span>
                  <select
                    className="text-input"
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    disabled={saving}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <div className="crm-form-actions">
                  <button type="submit" data-testid="crm-organization-save" className="cta-button" disabled={saving}>
                    {saving ? "Menyimpan..." : isCreating ? "Create Organization" : "Update Organization"}
                  </button>
                </div>
              </form>

              {selectedOrganization ? (
                <>
                  <div className="crm-detail-grid">
                    <div className="crm-detail-card">
                      <strong>People</strong>
                      <span>{relatedSummary.people.length}</span>
                    </div>
                    <div className="crm-detail-card">
                      <strong>Leads</strong>
                      <span>{relatedSummary.leads.length}</span>
                    </div>
                    <div className="crm-detail-card">
                      <strong>Deals</strong>
                      <span>{relatedSummary.deals.length}</span>
                    </div>
                    <div className="crm-detail-card">
                      <strong>Tasks</strong>
                      <span>{relatedSummary.tasks.length}</span>
                    </div>
                  </div>

                  <QuickTaskComposer
                    entityType="organization"
                    entityId={selectedOrganization.id}
                    onCreate={createTask}
                  />

                  <div className="crm-form-actions">
                    {!isRecordArchived(selectedOrganization) ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleArchiveAction("archive")}
                        disabled={!can("archive", selectedOrganization)}
                      >
                        Archive Organization
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleArchiveAction("restore")}
                        disabled={!can("restore", selectedOrganization)}
                      >
                        Restore Organization
                      </button>
                    )}
                  </div>

                  <RelatedRecordLinks
                    onNavigateRecord={onNavigateRecord}
                    items={[
                      ...relatedSummary.people.slice(0, 4).map((person) => ({
                        section: "people",
                        id: person.id,
                        label: `Person: ${person.display_name}`,
                      })),
                      ...relatedSummary.deals.slice(0, 4).map((deal) => ({
                        section: "deals",
                        id: deal.id,
                        label: `Deal: ${deal.name}`,
                      })),
                      ...relatedSummary.leads.slice(0, 4).map((lead) => ({
                        section: "leads",
                        id: lead.id,
                        label: `Lead: ${lead.person?.display_name || lead.organization?.name || "Open lead"}`,
                      })),
                      ...relatedSummary.tasks.slice(0, 4).map((task) => ({
                        section: "tasks",
                        id: task.id,
                        label: `Task: ${task.title}`,
                      })),
                    ]}
                  />

                  <EntityActivityTimeline
                    entityType="organization"
                    entityId={selectedOrganization.id}
                    entityLabel={selectedOrganization.name}
                    emptyTitle="Belum ada aktivitas untuk organization ini."
                    allowFollowUp
                  />
                </>
              ) : null}
            </>
          )}
        </section>
      </aside>
    </section>
  );
}

export function TasksWorkspaceSection({
  tasks,
  focusedRecordId,
  onNavigateRecord,
  loading,
  createTask,
  updateTask,
  refreshTasks,
}) {
  const toast = useToast();
  const { can } = useCrmGovernance();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [archiveState, setArchiveState] = useState("active");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkArchiveMode, setBulkArchiveMode] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedId) || null,
    [tasks, selectedId],
  );
  const [form, setForm] = useState(() => buildTaskForm(null));

  useEffect(() => {
    setForm(buildTaskForm(selectedTask));
  }, [selectedTask, isCreating]);

  useEffect(() => {
    if (!focusedRecordId || !tasks.some((task) => task.id === focusedRecordId)) return;
    setSelectedId(focusedRecordId);
    setIsCreating(false);
  }, [focusedRecordId, tasks]);

  const filteredTasks = useMemo(() => {
    return filterArchivedRecords(tasks, archiveState).filter((task) => {
      const matchesSearch = [task.title, task.body, task.entity_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter, archiveState]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => tasks.some((task) => task.id === id)));
  }, [tasks]);

  function toggleRow(id) {
    setSelectedIds((prev) => toggleSelectionValue(prev, id));
  }

  function toggleAllVisible() {
    if (filteredTasks.length === 0) return;
    const visibleIds = filteredTasks.map((task) => task.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])],
    );
  }

  async function handleArchiveAction(action) {
    if (!selectedTask) return;
    try {
      if (action === "archive") {
        await archiveCrmRecord("task", selectedTask.id, "Archived from CRM tasks workspace");
        toast.success("Task berhasil diarsipkan.");
      } else if (action === "restore") {
        await restoreCrmRecord("task", selectedTask.id);
        toast.success("Task berhasil direstore.");
      } else if (action === "delete") {
        await deleteCrmRecord("task", selectedTask.id, "Deleted from CRM tasks workspace");
        setSelectedId(null);
        toast.success("Task berhasil dihapus.");
      }
      await refreshTasks();
    } catch (error) {
      toast.error(error?.message || "Gagal menjalankan lifecycle action.");
    }
  }

  async function handleBulkApply() {
    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu task dulu.");
      return;
    }

    const changes = {};
    if (bulkStatus) changes.status = bulkStatus;
    if (bulkPriority) changes.priority = bulkPriority;

    if (!bulkStatus && !bulkPriority && !bulkArchiveMode) {
      toast.error("Pilih bulk action yang mau dijalankan.");
      return;
    }

    const summaryLines = [
      `${selectedIds.length} task dipilih`,
      bulkStatus ? `Status -> ${bulkStatus}` : "Status -> no change",
      bulkPriority ? `Priority -> ${bulkPriority}` : "Priority -> no change",
      bulkArchiveMode ? `Lifecycle -> ${bulkArchiveMode}` : "Lifecycle -> no change",
    ];

    if (!confirmBulkAction("Jalankan bulk action untuk tasks?", summaryLines)) {
      return;
    }

    setBulkSaving(true);
    try {
      if (Object.keys(changes).length > 0) {
        const { error } = await supabase.from("crm_tasks").update(changes).in("id", selectedIds);
        if (error) throw error;
      }

      if (bulkArchiveMode === "archive") {
        for (const id of selectedIds) {
          await archiveCrmRecord("task", id, "Bulk archived from CRM tasks workspace");
        }
      } else if (bulkArchiveMode === "restore") {
        for (const id of selectedIds) {
          await restoreCrmRecord("task", id);
        }
      }

      await refreshTasks();
      setSelectedIds([]);
      setBulkStatus("");
      setBulkPriority("");
      setBulkArchiveMode("");
      toast.success("Bulk task action berhasil dijalankan.");
    } catch (error) {
      toast.error(error?.message || "Bulk task action gagal.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Task title wajib diisi.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      body: form.body.trim() || null,
      status: form.status,
      priority: form.priority,
      due_at: form.due_at || null,
      entity_type: form.entity_type || null,
      entity_id: form.entity_id || null,
    };

    setSaving(true);
    try {
      if (isCreating) {
        const created = await createTask(payload);
        setSelectedId(created.id);
        setIsCreating(false);
        toast.success("Task berhasil dibuat.");
      } else if (selectedTask) {
        await updateTask(selectedTask.id, payload);
        toast.success("Task berhasil diperbarui.");
      }
    } catch (error) {
      toast.error(error?.message || "Gagal menyimpan task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="crm-section-grid" data-testid="crm-section-tasks">
      <div className="crm-section-main">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h2 className="crm-panel-title">Tasks Workspace</h2>
              <p className="crm-panel-sub">
                Shared operational queue dalam bentuk compact table, bukan card-only view.
              </p>
            </div>
            <button
              type="button"
              className="cta-button"
              data-testid="crm-create-task"
              onClick={() => {
                setSelectedId(null);
                setIsCreating(true);
                setForm(buildTaskForm(null));
              }}
            >
              Tambah Task
            </button>
          </div>

          <RecordStats
            items={[
              { label: "All Tasks", value: tasks.length },
              { label: "Open", value: tasks.filter((task) => task.status === "open").length },
              { label: "Completed", value: tasks.filter((task) => task.status === "completed").length },
              { label: "Urgent", value: tasks.filter((task) => task.priority === "urgent").length },
            ]}
          />

          <div className="crm-toolbar">
            <input
              className="text-input"
              placeholder="Cari task..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="text-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Semua Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select className="text-input" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">Semua Priority</option>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select className="text-input" value={archiveState} onChange={(e) => setArchiveState(e.target.value)}>
              <option value="active">Active only</option>
              <option value="archived">Archived only</option>
              <option value="all">All records</option>
            </select>
          </div>

          {selectedIds.length > 0 ? (
            <div className="crm-bulk-bar">
              <strong>{selectedIds.length} task dipilih</strong>
              <div className="crm-bulk-controls">
                <select className="text-input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  <option value="">No status change</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select className="text-input" value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value)}>
                  <option value="">No priority change</option>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select className="text-input" value={bulkArchiveMode} onChange={(e) => setBulkArchiveMode(e.target.value)}>
                  <option value="">No lifecycle action</option>
                  <option value="archive">Archive selected</option>
                  <option value="restore">Restore selected</option>
                </select>
                <button type="button" className="cta-button" onClick={handleBulkApply} disabled={bulkSaving}>
                  {bulkSaving ? "Processing..." : "Run Bulk Action"}
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="crm-empty">Memuat tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="crm-empty">Belum ada task yang match filter.</div>
          ) : (
            <div className="crm-table-wrap crm-table-wrap--compact">
              <table className="crm-table crm-table--compact">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          filteredTasks.length > 0 &&
                          filteredTasks.every((task) => selectedIds.includes(task.id))
                        }
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th>Task</th>
                    <th>Entity</th>
                    <th>Due</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={selectedId === task.id ? "crm-table-row--active" : ""}
                      onClick={() => {
                        setSelectedId(task.id);
                        setIsCreating(false);
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(task.id)}
                          onChange={() => toggleRow(task.id)}
                        />
                      </td>
                      <td>
                        <div className="crm-cell-strong">{task.title}</div>
                        <div className="crm-cell-sub">{task.body || "No detail"}</div>
                      </td>
                      <td>{ENTITY_LABELS[task.entity_type] || task.entity_type || "-"}</td>
                      <td>{formatDate(task.due_at)}</td>
                      <td>{PRIORITY_LABELS[task.priority] ?? task.priority}</td>
                      <td><StatusPill value={task.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <aside className="crm-section-side">
        <section className="crm-panel" data-testid="crm-task-detail">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">
                {isCreating ? "New Task" : selectedTask ? "Task Detail" : "Pilih Task"}
              </h3>
              <p className="crm-panel-sub">Task row bisa dibuka jadi detail editor penuh.</p>
            </div>
          </div>
          {!isCreating && !selectedTask ? (
            <div className="crm-empty">Pilih task dari table untuk buka detail.</div>
          ) : (
            <form className="crm-form" onSubmit={handleSubmit}>
              <label className="crm-field">
                <span>Title</span>
                <input data-testid="crm-task-title-input" className="text-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} disabled={saving} />
              </label>
              <label className="crm-field">
                <span>Body</span>
                <textarea className="text-input crm-textarea" value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} disabled={saving} />
              </label>
              <div className="crm-form-grid">
                <label className="crm-field">
                  <span>Status</span>
                  <select className="text-input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} disabled={saving}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="crm-field">
                  <span>Priority</span>
                  <select className="text-input" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} disabled={saving}>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="crm-form-grid">
                <label className="crm-field">
                  <span>Due At</span>
                  <input type="datetime-local" className="text-input" value={form.due_at} onChange={(e) => setForm((prev) => ({ ...prev, due_at: e.target.value }))} disabled={saving} />
                </label>
                <label className="crm-field">
                  <span>Entity Type</span>
                  <input className="text-input" value={form.entity_type} onChange={(e) => setForm((prev) => ({ ...prev, entity_type: e.target.value }))} disabled={saving} />
                </label>
              </div>
              <label className="crm-field">
                <span>Linked Record ID</span>
                <input className="text-input" value={form.entity_id} onChange={(e) => setForm((prev) => ({ ...prev, entity_id: e.target.value }))} disabled={saving} placeholder="Linked record ID" />
              </label>
              <div className="crm-form-actions">
                <button type="submit" data-testid="crm-task-save" className="cta-button" disabled={saving}>
                  {saving ? "Menyimpan..." : isCreating ? "Create Task" : "Update Task"}
                </button>
                {selectedTask?.entity_id ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      const sectionMap = {
                        person: "people",
                        organization: "organizations",
                        lead: "leads",
                        deal: "deals",
                        task: "tasks",
                      };
                      const section = sectionMap[selectedTask.entity_type];
                      if (section) {
                        onNavigateRecord?.(section, selectedTask.entity_id);
                      }
                    }}
                  >
                    Open Linked Record
                  </button>
                ) : null}
                {selectedTask && selectedTask.status !== "completed" ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={async () => {
                      try {
                        await updateTask(selectedTask.id, { status: "completed" });
                        toast.success("Task ditandai completed.");
                      } catch (error) {
                        toast.error(error?.message || "Gagal mark task completed.");
                      }
                    }}
                  >
                    Mark Completed
                  </button>
                ) : null}
                {selectedTask && !isRecordArchived(selectedTask) ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleArchiveAction("archive")}
                    disabled={!can("archive", selectedTask)}
                  >
                    Archive Task
                  </button>
                ) : null}
                {selectedTask && isRecordArchived(selectedTask) ? (
                  <>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleArchiveAction("restore")}
                      disabled={!can("restore", selectedTask)}
                    >
                      Restore Task
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleArchiveAction("delete")}
                      disabled={!can("delete", selectedTask)}
                    >
                      Delete Task
                    </button>
                  </>
                ) : null}
              </div>
            </form>
          )}
        </section>
      </aside>
    </section>
  );
}

export function LeadsWorkspaceSection({
  leads,
  loading,
  peopleOptions,
  organizationOptions,
  tasks,
  focusedRecordId,
  onNavigateRecord,
  createLead,
  updateLead,
  refreshLeads,
  pipelines,
  pipelineStages,
  createDeal,
  createTask,
}) {
  const toast = useToast();
  const { can } = useCrmGovernance();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [archiveState, setArchiveState] = useState("active");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkStage, setBulkStage] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkTemperature, setBulkTemperature] = useState("");
  const [bulkArchiveMode, setBulkArchiveMode] = useState("");
  const [bulkTaskTitle, setBulkTaskTitle] = useState("");
  const [bulkTaskDueAt, setBulkTaskDueAt] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const selectedLead = useMemo(
    () => leads.find((item) => item.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );
  const [form, setForm] = useState(() => buildLeadForm(null));

  useEffect(() => {
    setForm(buildLeadForm(selectedLead));
  }, [selectedLead, isCreating]);

  useEffect(() => {
    if (!focusedRecordId || !leads.some((lead) => lead.id === focusedRecordId)) return;
    setSelectedLeadId(focusedRecordId);
    setIsCreating(false);
  }, [focusedRecordId, leads]);

  const filteredLeads = useMemo(() => {
    return filterArchivedRecords(leads, archiveState).filter((lead) => {
      const label = [
        lead.person?.display_name,
        lead.organization?.name,
        lead.source_ref,
        lead.qualification_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = label.includes(search.toLowerCase());
      const matchesStage = stageFilter === "all" || lead.stage === stageFilter;
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [leads, search, stageFilter, statusFilter, archiveState]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => leads.some((lead) => lead.id === id)));
  }, [leads]);

  function toggleRow(id) {
    setSelectedIds((prev) => toggleSelectionValue(prev, id));
  }

  function toggleAllVisible() {
    if (filteredLeads.length === 0) return;
    const visibleIds = filteredLeads.map((lead) => lead.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])],
    );
  }

  async function handleArchiveAction(action) {
    if (!selectedLead) return;
    try {
      if (action === "archive") {
        await archiveCrmRecord("lead", selectedLead.id, "Archived from CRM leads workspace");
        toast.success("Lead berhasil diarsipkan.");
      } else {
        await restoreCrmRecord("lead", selectedLead.id);
        toast.success("Lead berhasil direstore.");
      }
      await refreshLeads();
    } catch (error) {
      toast.error(error?.message || "Gagal menjalankan lifecycle action.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.person_id && !form.organization_id) {
      toast.error("Lead minimal harus punya person atau organization.");
      return;
    }

    const payload = {
      person_id: form.person_id || null,
      organization_id: form.organization_id || null,
      source_type: form.source_type.trim() || "manual",
      source_ref: form.source_ref.trim() || null,
      stage: form.stage,
      status: form.status,
      score: Number(form.score || 0),
      temperature: form.temperature,
      qualification_notes: form.qualification_notes.trim() || null,
      disqualification_reason: form.disqualification_reason.trim() || null,
    };

    setSaving(true);
    try {
      if (isCreating) {
        const created = await createLead(payload);
        setSelectedLeadId(created.id);
        setIsCreating(false);
        toast.success("Lead berhasil dibuat.");
      } else if (selectedLead) {
        await updateLead(selectedLead.id, payload);
        toast.success("Lead berhasil diperbarui.");
      }
    } catch (error) {
      toast.error(error?.message || "Gagal menyimpan lead.");
    } finally {
      setSaving(false);
    }
  }

  async function convertLead() {
    if (!selectedLead) return;

    const defaultPipeline = pipelines.find((item) => item.is_default) ?? pipelines[0];
    const stages = pipelineStages[defaultPipeline?.id] ?? [];
    const openStage = stages.find((item) => !item.is_closed) ?? stages[0] ?? null;

    if (!defaultPipeline || !openStage) {
      toast.error("Pipeline default belum tersedia.");
      return;
    }

    setSaving(true);
    try {
      const createdDeal = await createDeal({
        name: `${selectedLead.organization?.name || selectedLead.person?.display_name || "New"} Opportunity`,
        pipeline_id: defaultPipeline.id,
        stage_id: openStage.id,
        organization_id: selectedLead.organization_id || null,
        primary_person_id: selectedLead.person_id || null,
        status: "open",
        source_type: "lead_conversion",
        source_ref: selectedLead.id,
      });

      await updateLead(selectedLead.id, {
        status: "converted",
        stage: "converted",
        converted_person_id: selectedLead.person_id || null,
        converted_organization_id: selectedLead.organization_id || null,
        converted_deal_id: createdDeal.id,
      });
      toast.success("Lead berhasil dikonversi jadi deal.");
    } catch (error) {
      toast.error(error?.message || "Gagal mengonversi lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkApply() {
    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu lead dulu.");
      return;
    }

    const changes = {};
    if (bulkStage) changes.stage = bulkStage;
    if (bulkStatus) changes.status = bulkStatus;
    if (bulkTemperature) changes.temperature = bulkTemperature;

    if (!bulkStage && !bulkStatus && !bulkTemperature && !bulkArchiveMode && !bulkTaskTitle.trim()) {
      toast.error("Pilih bulk action yang mau dijalankan.");
      return;
    }

    const summaryLines = [
      `${selectedIds.length} lead dipilih`,
      bulkStage ? `Stage -> ${bulkStage}` : "Stage -> no change",
      bulkStatus ? `Status -> ${bulkStatus}` : "Status -> no change",
      bulkTemperature ? `Temperature -> ${bulkTemperature}` : "Temperature -> no change",
      bulkArchiveMode ? `Lifecycle -> ${bulkArchiveMode}` : "Lifecycle -> no change",
      bulkTaskTitle.trim() ? `Create task -> ${bulkTaskTitle.trim()}` : "Create task -> none",
    ];

    if (!confirmBulkAction("Jalankan bulk action untuk leads?", summaryLines)) {
      return;
    }

    setBulkSaving(true);
    try {
      if (Object.keys(changes).length > 0) {
        const { error } = await supabase.from("crm_leads").update(changes).in("id", selectedIds);
        if (error) throw error;
      }

      if (bulkArchiveMode === "archive") {
        for (const id of selectedIds) {
          await archiveCrmRecord("lead", id, "Bulk archived from CRM leads workspace");
        }
      } else if (bulkArchiveMode === "restore") {
        for (const id of selectedIds) {
          await restoreCrmRecord("lead", id);
        }
      }

      if (bulkTaskTitle.trim()) {
        const userId = await getCurrentUserId();
        const payload = selectedIds.map((leadId) =>
          buildBulkTaskPayload(
            userId,
            "lead",
            leadId,
            bulkTaskTitle,
            bulkTaskDueAt,
            "Generated from CRM leads bulk action",
          ),
        );
        const { error } = await supabase.from("crm_tasks").insert(payload);
        if (error) throw error;
      }

      await refreshLeads();
      setSelectedIds([]);
      setBulkStage("");
      setBulkStatus("");
      setBulkTemperature("");
      setBulkArchiveMode("");
      setBulkTaskTitle("");
      setBulkTaskDueAt("");
      toast.success("Bulk lead action berhasil dijalankan.");
    } catch (error) {
      toast.error(error?.message || "Bulk lead action gagal.");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <section className="crm-section-grid" data-testid="crm-section-leads">
      <div className="crm-section-main">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h2 className="crm-panel-title">Leads Workspace</h2>
              <p className="crm-panel-sub">Qualification table yang compact dengan detail pane saat row diklik.</p>
            </div>
            <button type="button" className="cta-button" onClick={() => {
              setSelectedLeadId(null);
              setIsCreating(true);
              setForm(buildLeadForm(null));
            }}>
              Tambah Lead
            </button>
          </div>

          <RecordStats
            items={[
              { label: "Total Leads", value: leads.length },
              { label: "Qualified", value: leads.filter((item) => item.stage === "qualified").length },
              { label: "Hot", value: leads.filter((item) => item.temperature === "hot").length },
              { label: "Converted", value: leads.filter((item) => item.status === "converted").length },
            ]}
          />

          <div className="crm-toolbar">
            <input className="text-input" placeholder="Cari lead..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="text-input" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
              <option value="all">Semua Stage</option>
              {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select className="text-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Semua Status</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select className="text-input" value={archiveState} onChange={(e) => setArchiveState(e.target.value)}>
              <option value="active">Active only</option>
              <option value="archived">Archived only</option>
              <option value="all">All records</option>
            </select>
          </div>

          {selectedIds.length > 0 ? (
            <div className="crm-bulk-bar">
              <strong>{selectedIds.length} lead dipilih</strong>
              <div className="crm-bulk-controls">
                <select className="text-input" value={bulkStage} onChange={(e) => setBulkStage(e.target.value)}>
                  <option value="">No stage change</option>
                  {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select className="text-input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  <option value="">No status change</option>
                  {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select className="text-input" value={bulkTemperature} onChange={(e) => setBulkTemperature(e.target.value)}>
                  <option value="">No temperature change</option>
                  <option value="cold">Cold</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                </select>
                <select className="text-input" value={bulkArchiveMode} onChange={(e) => setBulkArchiveMode(e.target.value)}>
                  <option value="">No lifecycle action</option>
                  <option value="archive">Archive selected</option>
                  <option value="restore">Restore selected</option>
                </select>
                <input
                  className="text-input"
                  value={bulkTaskTitle}
                  onChange={(e) => setBulkTaskTitle(e.target.value)}
                  placeholder="Bulk create task title"
                />
                <input
                  type="datetime-local"
                  className="text-input"
                  value={bulkTaskDueAt}
                  onChange={(e) => setBulkTaskDueAt(e.target.value)}
                />
                <button type="button" className="cta-button" onClick={handleBulkApply} disabled={bulkSaving}>
                  {bulkSaving ? "Processing..." : "Run Bulk Action"}
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="crm-empty">Memuat leads...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="crm-empty">Belum ada lead yang match filter.</div>
          ) : (
            <div className="crm-table-wrap crm-table-wrap--compact">
              <table className="crm-table crm-table--compact">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          filteredLeads.length > 0 &&
                          filteredLeads.every((lead) => selectedIds.includes(lead.id))
                        }
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th>Lead</th>
                    <th>Organization</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className={selectedLeadId === lead.id ? "crm-table-row--active" : ""} onClick={() => {
                      setSelectedLeadId(lead.id);
                      setIsCreating(false);
                    }}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleRow(lead.id)}
                        />
                      </td>
                      <td>
                        <div className="crm-cell-strong">{lead.person?.display_name || "Unlinked person"}</div>
                        <div className="crm-cell-sub">{lead.source_type || "Manual"}</div>
                      </td>
                      <td>{lead.organization?.name || "-"}</td>
                      <td>{LEAD_STAGE_LABELS[lead.stage] ?? lead.stage}</td>
                      <td><StatusPill value={lead.status} /></td>
                      <td>{lead.score ?? 0}</td>
                      <td>{lead.temperature || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <aside className="crm-section-side">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">
                {isCreating ? "New Lead" : selectedLead ? "Lead Detail" : "Pilih Lead"}
              </h3>
              <p className="crm-panel-sub">Update lead, jalankan follow-up, dan pindahkan ke deal dari satu panel yang ringkas.</p>
            </div>
          </div>
          {!isCreating && !selectedLead ? (
            <div className="crm-empty">Pilih lead dari table untuk buka detail.</div>
          ) : (
            <>
              <form className="crm-form" onSubmit={handleSubmit}>
                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Person</span>
                    <select className="text-input" value={form.person_id} onChange={(e) => setForm((prev) => ({ ...prev, person_id: e.target.value }))} disabled={saving}>
                      <EmptySelectOption label="Pilih person" />
                      {peopleOptions.map((person) => (
                        <option key={person.id} value={person.id}>{person.display_name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="crm-field">
                    <span>Organization</span>
                    <select className="text-input" value={form.organization_id} onChange={(e) => setForm((prev) => ({ ...prev, organization_id: e.target.value }))} disabled={saving}>
                      <EmptySelectOption label="Pilih organization" />
                      {organizationOptions.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Stage</span>
                    <select className="text-input" value={form.stage} onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))} disabled={saving}>
                      {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="crm-field">
                    <span>Status</span>
                    <select className="text-input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} disabled={saving}>
                      {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Score</span>
                    <input type="number" className="text-input" value={form.score} onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))} disabled={saving} />
                  </label>
                  <label className="crm-field">
                    <span>Temperature</span>
                    <select className="text-input" value={form.temperature} onChange={(e) => setForm((prev) => ({ ...prev, temperature: e.target.value }))} disabled={saving}>
                      <option value="cold">Cold</option>
                      <option value="warm">Warm</option>
                      <option value="hot">Hot</option>
                    </select>
                  </label>
                </div>
                <label className="crm-field">
                  <span>Qualification Notes</span>
                  <textarea className="text-input crm-textarea" value={form.qualification_notes} onChange={(e) => setForm((prev) => ({ ...prev, qualification_notes: e.target.value }))} disabled={saving} />
                </label>
                <div className="crm-form-actions">
                  <button type="submit" className="cta-button" disabled={saving}>
                    {saving ? "Menyimpan..." : isCreating ? "Create Lead" : "Update Lead"}
                  </button>
                  {selectedLead && selectedLead.status !== "converted" ? (
                    <button type="button" className="ghost-button" onClick={convertLead} disabled={saving}>
                      Convert to Deal
                    </button>
                  ) : null}
                  {selectedLead && !isRecordArchived(selectedLead) ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleArchiveAction("archive")}
                      disabled={!can("archive", selectedLead)}
                    >
                      Archive Lead
                    </button>
                  ) : null}
                  {selectedLead && isRecordArchived(selectedLead) ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleArchiveAction("restore")}
                      disabled={!can("restore", selectedLead)}
                    >
                      Restore Lead
                    </button>
                  ) : null}
                </div>
              </form>

              {selectedLead ? (
                <>
                  <QuickTaskComposer entityType="lead" entityId={selectedLead.id} onCreate={createTask} />
                  <RelatedRecordLinks
                    title="Related Navigation"
                    onNavigateRecord={onNavigateRecord}
                    items={[
                      selectedLead.person_id
                        ? {
                            section: "people",
                            id: selectedLead.person_id,
                            label: `Person: ${selectedLead.person?.display_name || "Open person"}`,
                          }
                        : null,
                      selectedLead.organization_id
                        ? {
                            section: "organizations",
                            id: selectedLead.organization_id,
                            label: `Organization: ${selectedLead.organization?.name || "Open organization"}`,
                          }
                        : null,
                      selectedLead.converted_deal_id
                        ? {
                            section: "deals",
                            id: selectedLead.converted_deal_id,
                            label: "Converted deal",
                          }
                        : null,
                      ...tasks
                        .filter((task) => task.entity_type === "lead" && task.entity_id === selectedLead.id)
                        .slice(0, 4)
                        .map((task) => ({
                          section: "tasks",
                          id: task.id,
                          label: `Task: ${task.title}`,
                        })),
                    ]}
                  />
                  <EntityActivityTimeline
                    entityType="lead"
                    entityId={selectedLead.id}
                    entityLabel={selectedLead.person?.display_name || selectedLead.organization?.name || "Lead"}
                    emptyTitle="Belum ada aktivitas untuk lead ini."
                    allowFollowUp
                  />
                </>
              ) : null}
            </>
          )}
        </section>
      </aside>
    </section>
  );
}

export function DealsWorkspaceSection({
  deals,
  loading,
  refreshDeals,
  pipelines,
  pipelineStages,
  peopleOptions,
  organizationOptions,
  tasks,
  focusedRecordId,
  onNavigateRecord,
  createDeal,
  updateDeal,
  createTask,
}) {
  const toast = useToast();
  const { can } = useCrmGovernance();
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [viewMode, setViewMode] = useState("board");
  const [archiveState, setArchiveState] = useState("active");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkStageId, setBulkStageId] = useState("");
  const [bulkArchiveMode, setBulkArchiveMode] = useState("");
  const [bulkTaskTitle, setBulkTaskTitle] = useState("");
  const [bulkTaskDueAt, setBulkTaskDueAt] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const selectedDeal = useMemo(
    () => deals.find((item) => item.id === selectedDealId) ?? null,
    [deals, selectedDealId],
  );

  const activePipeline =
    pipelines.find((item) => item.id === pipelineFilter) ||
    pipelines.find((item) => item.is_default) ||
    pipelines[0] ||
    null;

  const activeStages = activePipeline ? pipelineStages[activePipeline.id] ?? [] : [];
  const defaultStageId = activeStages.find((item) => !item.is_closed)?.id || activeStages[0]?.id || "";
  const [form, setForm] = useState(() =>
    buildDealForm(null, activePipeline?.id || "", defaultStageId),
  );

  useEffect(() => {
    setForm(buildDealForm(selectedDeal, activePipeline?.id || "", defaultStageId));
  }, [selectedDeal, isCreating, activePipeline?.id, defaultStageId]);

  useEffect(() => {
    if (!focusedRecordId || !deals.some((deal) => deal.id === focusedRecordId)) return;
    setSelectedDealId(focusedRecordId);
    setIsCreating(false);
  }, [focusedRecordId, deals]);

  const filteredDeals = useMemo(() => {
    return filterArchivedRecords(deals, archiveState).filter(
      (deal) => pipelineFilter === "all" || deal.pipeline_id === pipelineFilter,
    );
  }, [deals, pipelineFilter, archiveState]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => deals.some((deal) => deal.id === id)));
  }, [deals]);

  function toggleRow(id) {
    setSelectedIds((prev) => toggleSelectionValue(prev, id));
  }

  function toggleAllVisible() {
    if (filteredDeals.length === 0) return;
    const visibleIds = filteredDeals.map((deal) => deal.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])],
    );
  }

  async function handleArchiveAction(action) {
    if (!selectedDeal) return;
    try {
      if (action === "archive") {
        await archiveCrmRecord("deal", selectedDeal.id, "Archived from CRM deals workspace");
        toast.success("Deal berhasil diarsipkan.");
      } else {
        await restoreCrmRecord("deal", selectedDeal.id);
        toast.success("Deal berhasil direstore.");
      }
      await refreshDeals();
    } catch (error) {
      toast.error(error?.message || "Gagal menjalankan lifecycle action.");
    }
  }

  const groupedDeals = useMemo(() => {
    const map = Object.fromEntries(activeStages.map((stage) => [stage.id, []]));
    for (const deal of filteredDeals) {
      if (!map[deal.stage_id]) map[deal.stage_id] = [];
      map[deal.stage_id].push(deal);
    }
    return map;
  }, [activeStages, filteredDeals]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.pipeline_id || !form.stage_id) {
      toast.error("Deal name, pipeline, dan stage wajib diisi.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      pipeline_id: form.pipeline_id,
      stage_id: form.stage_id,
      organization_id: form.organization_id || null,
      primary_person_id: form.primary_person_id || null,
      amount: form.amount ? Number(form.amount) : null,
      currency: form.currency || "IDR",
      expected_close_at: form.expected_close_at || null,
      status: form.status,
      source_type: form.source_type.trim() || "manual",
      source_ref: form.source_ref.trim() || null,
    };

    setSaving(true);
    try {
      if (isCreating) {
        const created = await createDeal(payload);
        setSelectedDealId(created.id);
        setIsCreating(false);
        toast.success("Deal berhasil dibuat.");
      } else if (selectedDeal) {
        await updateDeal(selectedDeal.id, payload);
        toast.success("Deal berhasil diperbarui.");
      }
    } catch (error) {
      toast.error(error?.message || "Gagal menyimpan deal.");
    } finally {
      setSaving(false);
    }
  }

  async function moveDeal(deal, nextStageId) {
    try {
      await updateDeal(deal.id, { stage_id: nextStageId });
      toast.success("Stage deal diperbarui.");
    } catch (error) {
      toast.error(error?.message || "Gagal memindahkan deal.");
    }
  }

  async function handleBulkApply() {
    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu deal dulu.");
      return;
    }

    const selectedDeals = deals.filter((deal) => selectedIds.includes(deal.id));
    const changes = {};
    if (bulkStatus) changes.status = bulkStatus;

    if (bulkStageId) {
      const stageMatchesAll = selectedDeals.every(
        (deal) => deal.pipeline_id === activePipeline?.id,
      );
      if (!stageMatchesAll) {
        toast.error("Bulk stage hanya bisa dipakai untuk deal dalam pipeline aktif yang sama.");
        return;
      }
      changes.stage_id = bulkStageId;
    }

    if (!bulkStatus && !bulkStageId && !bulkArchiveMode && !bulkTaskTitle.trim()) {
      toast.error("Pilih bulk action yang mau dijalankan.");
      return;
    }

    const summaryLines = [
      `${selectedIds.length} deal dipilih`,
      bulkStatus ? `Status -> ${bulkStatus}` : "Status -> no change",
      bulkStageId ? `Stage -> ${activeStages.find((item) => item.id === bulkStageId)?.name || bulkStageId}` : "Stage -> no change",
      bulkArchiveMode ? `Lifecycle -> ${bulkArchiveMode}` : "Lifecycle -> no change",
      bulkTaskTitle.trim() ? `Create task -> ${bulkTaskTitle.trim()}` : "Create task -> none",
    ];

    if (!confirmBulkAction("Jalankan bulk action untuk deals?", summaryLines)) {
      return;
    }

    setBulkSaving(true);
    try {
      if (Object.keys(changes).length > 0) {
        const { error } = await supabase.from("crm_deals").update(changes).in("id", selectedIds);
        if (error) throw error;
      }

      if (bulkArchiveMode === "archive") {
        for (const id of selectedIds) {
          await archiveCrmRecord("deal", id, "Bulk archived from CRM deals workspace");
        }
      } else if (bulkArchiveMode === "restore") {
        for (const id of selectedIds) {
          await restoreCrmRecord("deal", id);
        }
      }

      if (bulkTaskTitle.trim()) {
        const userId = await getCurrentUserId();
        const payload = selectedIds.map((dealId) =>
          buildBulkTaskPayload(
            userId,
            "deal",
            dealId,
            bulkTaskTitle,
            bulkTaskDueAt,
            "Generated from CRM deals bulk action",
          ),
        );
        const { error } = await supabase.from("crm_tasks").insert(payload);
        if (error) throw error;
      }

      await refreshDeals();
      setSelectedIds([]);
      setBulkStatus("");
      setBulkStageId("");
      setBulkArchiveMode("");
      setBulkTaskTitle("");
      setBulkTaskDueAt("");
      toast.success("Bulk deal action berhasil dijalankan.");
    } catch (error) {
      toast.error(error?.message || "Bulk deal action gagal.");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <section className="crm-section-grid crm-section-grid--wide" data-testid="crm-section-deals">
      <div className="crm-section-main">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h2 className="crm-panel-title">Deals Workspace</h2>
              <p className="crm-panel-sub">Pipeline tetap ada, tapi sekarang ada compact table view untuk scan dan klik detail cepat.</p>
            </div>
            <div className="crm-banner-actions">
              <select className="text-input" value={pipelineFilter} onChange={(e) => setPipelineFilter(e.target.value)}>
                <option value="all">Semua Pipeline</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                ))}
              </select>
              <select className="text-input" value={archiveState} onChange={(e) => setArchiveState(e.target.value)}>
                <option value="active">Active only</option>
                <option value="archived">Archived only</option>
                <option value="all">All records</option>
              </select>
              <div className="crm-toggle-group">
                <button type="button" data-testid="crm-deals-view-board" className={`crm-chip${viewMode === "board" ? " crm-chip--active" : ""}`} onClick={() => setViewMode("board")}>Board</button>
                <button type="button" data-testid="crm-deals-view-table" className={`crm-chip${viewMode === "table" ? " crm-chip--active" : ""}`} onClick={() => setViewMode("table")}>Table</button>
              </div>
              <button type="button" className="cta-button" onClick={() => {
                setSelectedDealId(null);
                setIsCreating(true);
                setForm(buildDealForm(null, activePipeline?.id || "", defaultStageId));
              }}>
                Tambah Deal
              </button>
            </div>
          </div>

          <RecordStats
            items={[
              { label: "Total Deals", value: deals.length },
              { label: "Open Deals", value: deals.filter((item) => item.status === "open").length },
              { label: "Open Value", value: formatMoney(deals.filter((item) => item.status === "open").reduce((sum, item) => sum + Number(item.amount || 0), 0)) },
              { label: "Won Value", value: formatMoney(deals.filter((item) => item.status === "won").reduce((sum, item) => sum + Number(item.amount || 0), 0)) },
            ]}
          />

          {selectedIds.length > 0 ? (
            <div className="crm-bulk-bar">
              <strong>{selectedIds.length} deal dipilih</strong>
              <div className="crm-bulk-controls">
                <select className="text-input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  <option value="">No status change</option>
                  {Object.entries(DEAL_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select className="text-input" value={bulkStageId} onChange={(e) => setBulkStageId(e.target.value)}>
                  <option value="">No stage change</option>
                  {activeStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
                <select className="text-input" value={bulkArchiveMode} onChange={(e) => setBulkArchiveMode(e.target.value)}>
                  <option value="">No lifecycle action</option>
                  <option value="archive">Archive selected</option>
                  <option value="restore">Restore selected</option>
                </select>
                <input
                  className="text-input"
                  value={bulkTaskTitle}
                  onChange={(e) => setBulkTaskTitle(e.target.value)}
                  placeholder="Bulk create task title"
                />
                <input
                  type="datetime-local"
                  className="text-input"
                  value={bulkTaskDueAt}
                  onChange={(e) => setBulkTaskDueAt(e.target.value)}
                />
                <button type="button" className="cta-button" onClick={handleBulkApply} disabled={bulkSaving}>
                  {bulkSaving ? "Processing..." : "Run Bulk Action"}
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="crm-empty">Memuat deals...</div>
          ) : activeStages.length === 0 ? (
            <div className="crm-empty">Belum ada stage pipeline tersedia.</div>
          ) : viewMode === "table" ? (
            <div className="crm-table-wrap crm-table-wrap--compact" data-testid="crm-deals-table">
              <table className="crm-table crm-table--compact">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          filteredDeals.length > 0 &&
                          filteredDeals.every((deal) => selectedIds.includes(deal.id))
                        }
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th>Deal</th>
                    <th>Pipeline</th>
                    <th>Stage</th>
                    <th>Organization</th>
                    <th>Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((deal) => (
                    <tr key={deal.id} className={selectedDealId === deal.id ? "crm-table-row--active" : ""} onClick={() => {
                      setSelectedDealId(deal.id);
                      setIsCreating(false);
                    }}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(deal.id)}
                          onChange={() => toggleRow(deal.id)}
                        />
                      </td>
                      <td>
                        <div className="crm-cell-strong">{deal.name}</div>
                        <div className="crm-cell-sub">{deal.person?.display_name || "No primary person"}</div>
                      </td>
                      <td>{pipelines.find((item) => item.id === deal.pipeline_id)?.name || "-"}</td>
                      <td>{(pipelineStages[deal.pipeline_id] ?? []).find((item) => item.id === deal.stage_id)?.name || "-"}</td>
                      <td>{deal.organization?.name || "-"}</td>
                      <td>{formatMoney(deal.amount, deal.currency)}</td>
                      <td><StatusPill value={deal.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="crm-board" data-testid="crm-deals-board">
              {activeStages.map((stage) => (
                <section key={stage.id} className="crm-board-column">
                  <div className="crm-board-head">
                    <div>
                      <strong>{stage.name}</strong>
                      <span>{groupedDeals[stage.id]?.length ?? 0} deal</span>
                    </div>
                    <span className="crm-pill crm-pill--priority">{stage.win_probability}%</span>
                  </div>
                  <div className="crm-board-list">
                    {(groupedDeals[stage.id] ?? []).map((deal) => (
                      <article key={deal.id} className={`crm-board-card${selectedDealId === deal.id ? " crm-board-card--active" : ""}`} onClick={() => {
                        setSelectedDealId(deal.id);
                        setIsCreating(false);
                      }}>
                        <div className="crm-board-card-top">
                          <div className="crm-board-select">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(deal.id)}
                              onChange={() => toggleRow(deal.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <strong>{deal.name}</strong>
                          </div>
                          <StatusPill value={deal.status} />
                        </div>
                        <p>{deal.organization?.name || deal.person?.display_name || "Unlinked deal"}</p>
                        <div className="crm-board-card-foot">
                          <span>{formatMoney(deal.amount, deal.currency)}</span>
                          <select className="crm-mini-select" value={deal.stage_id || ""} onChange={(e) => moveDeal(deal, e.target.value)} onClick={(e) => e.stopPropagation()}>
                            {activeStages.map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="crm-section-side">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">
                {isCreating ? "New Deal" : selectedDeal ? "Deal Detail" : "Pilih Deal"}
              </h3>
              <p className="crm-panel-sub">Edit detail deal dan jalankan next step tanpa pindah-pindah view.</p>
            </div>
          </div>
          {!isCreating && !selectedDeal ? (
            <div className="crm-empty">Pilih deal dari board atau table untuk buka detail.</div>
          ) : (
            <>
              <form className="crm-form" onSubmit={handleSubmit}>
                <label className="crm-field">
                  <span>Deal Name</span>
                  <input className="text-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} disabled={saving} />
                </label>
                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Pipeline</span>
                    <select className="text-input" value={form.pipeline_id} onChange={(e) => setForm((prev) => ({ ...prev, pipeline_id: e.target.value, stage_id: (pipelineStages[e.target.value] ?? [])[0]?.id || "" }))} disabled={saving}>
                      <EmptySelectOption label="Pilih pipeline" />
                      {pipelines.map((pipeline) => (
                        <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="crm-field">
                    <span>Stage</span>
                    <select className="text-input" value={form.stage_id} onChange={(e) => setForm((prev) => ({ ...prev, stage_id: e.target.value }))} disabled={saving}>
                      <EmptySelectOption label="Pilih stage" />
                      {(pipelineStages[form.pipeline_id] ?? []).map((stage) => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Organization</span>
                    <select className="text-input" value={form.organization_id} onChange={(e) => setForm((prev) => ({ ...prev, organization_id: e.target.value }))} disabled={saving}>
                      <EmptySelectOption label="Pilih organization" />
                      {organizationOptions.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="crm-field">
                    <span>Primary Person</span>
                    <select className="text-input" value={form.primary_person_id} onChange={(e) => setForm((prev) => ({ ...prev, primary_person_id: e.target.value }))} disabled={saving}>
                      <EmptySelectOption label="Pilih person" />
                      {peopleOptions.map((person) => (
                        <option key={person.id} value={person.id}>{person.display_name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Amount</span>
                    <input type="number" className="text-input" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} disabled={saving} />
                  </label>
                  <label className="crm-field">
                    <span>Expected Close</span>
                    <input type="datetime-local" className="text-input" value={form.expected_close_at} onChange={(e) => setForm((prev) => ({ ...prev, expected_close_at: e.target.value }))} disabled={saving} />
                  </label>
                </div>
                <label className="crm-field">
                  <span>Status</span>
                  <select className="text-input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} disabled={saving}>
                    {Object.entries(DEAL_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <div className="crm-form-actions">
                  <button type="submit" className="cta-button" disabled={saving}>
                    {saving ? "Menyimpan..." : isCreating ? "Create Deal" : "Update Deal"}
                  </button>
                  {selectedDeal && !isRecordArchived(selectedDeal) ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleArchiveAction("archive")}
                      disabled={!can("archive", selectedDeal)}
                    >
                      Archive Deal
                    </button>
                  ) : null}
                  {selectedDeal && isRecordArchived(selectedDeal) ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleArchiveAction("restore")}
                      disabled={!can("restore", selectedDeal)}
                    >
                      Restore Deal
                    </button>
                  ) : null}
                </div>
              </form>

              {selectedDeal ? (
                <>
                  <QuickTaskComposer entityType="deal" entityId={selectedDeal.id} onCreate={createTask} />
                  <RelatedRecordLinks
                    title="Related Navigation"
                    onNavigateRecord={onNavigateRecord}
                    items={[
                      selectedDeal.organization_id
                        ? {
                            section: "organizations",
                            id: selectedDeal.organization_id,
                            label: `Organization: ${selectedDeal.organization?.name || "Open organization"}`,
                          }
                        : null,
                      selectedDeal.primary_person_id
                        ? {
                            section: "people",
                            id: selectedDeal.primary_person_id,
                            label: `Primary person: ${selectedDeal.person?.display_name || "Open person"}`,
                          }
                        : null,
                      ...tasks
                        .filter((task) => task.entity_type === "deal" && task.entity_id === selectedDeal.id)
                        .slice(0, 4)
                        .map((task) => ({
                          section: "tasks",
                          id: task.id,
                          label: `Task: ${task.title}`,
                        })),
                    ]}
                  />
                  <EntityActivityTimeline
                    entityType="deal"
                    entityId={selectedDeal.id}
                    entityLabel={selectedDeal.name}
                    emptyTitle="Belum ada aktivitas untuk deal ini."
                    allowFollowUp
                  />
                </>
              ) : null}
            </>
          )}
        </section>
      </aside>
    </section>
  );
}
