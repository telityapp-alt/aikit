import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase.js";
import { useToast } from "../../lib/ToastContext.jsx";
import EntityActivityTimeline from "../../components/EntityActivityTimeline.jsx";
import {
  archiveCrmRecord,
  filterArchivedRecords,
  isRecordArchived,
  restoreCrmRecord,
  useCrmGovernance,
} from "./governance.js";

const PERSON_FILTER_DEFAULTS = {
  search: "",
  status: "all",
  lifecycle: "all",
  tag: "all",
};

const PERSON_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const PERSON_LIFECYCLE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "partner", label: "Partner" },
  { value: "vendor", label: "Vendor" },
  { value: "creator", label: "Creator" },
  { value: "competitor", label: "Competitor" },
  { value: "advocate", label: "Advocate" },
  { value: "other", label: "Other" },
];

const JOB_STATUS_LABELS = {
  draft: "Draft",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
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

function StatusPill({ value }) {
  if (!value) return null;
  return <span className={`crm-pill crm-pill--${String(value).toLowerCase()}`}>{value}</span>;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTagList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }
  return String(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeTags(tags) {
  return [...new Set(parseTagList(tags))];
}

function applyPeopleFilters(people, filters) {
  return people.filter((person) => {
    const haystack = [
      person.display_name,
      person.primary_email,
      person.primary_phone,
      person.primary_organization?.name,
      ...(Array.isArray(person.tags) ? person.tags : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !filters.search || haystack.includes(filters.search.toLowerCase());
    const matchesStatus =
      !filters.status || filters.status === "all" || person.status === filters.status;
    const matchesLifecycle =
      !filters.lifecycle ||
      filters.lifecycle === "all" ||
      person.lifecycle_stage === filters.lifecycle;
    const matchesTag =
      !filters.tag ||
      filters.tag === "all" ||
      (Array.isArray(person.tags) && person.tags.includes(filters.tag));

    return matchesSearch && matchesStatus && matchesLifecycle && matchesTag;
  });
}

function buildPeopleDuplicateCandidates(people) {
  const groups = new Map();

  for (const person of people) {
    const emailKey = normalizeText(person.primary_email);
    const nameOrgKey = `${normalizeText(person.display_name)}::${normalizeText(
      person.primary_organization?.name,
    )}`;

    const keys = [];
    if (emailKey) keys.push(`email:${emailKey}`);
    if (normalizeText(person.display_name) && normalizeText(person.primary_organization?.name)) {
      keys.push(`nameorg:${nameOrgKey}`);
    }

    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(person);
    }
  }

  return [...groups.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([key, records]) => ({
      key,
      reason: key.startsWith("email:") ? "Same email" : "Same name + organization",
      records: [...records].sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      }),
    }));
}

function autoMapImportColumns(headers) {
  const lowerMap = headers.reduce((acc, header) => {
    acc[header] = normalizeText(header);
    return acc;
  }, {});

  function pick(candidates) {
    return (
      headers.find((header) =>
        candidates.some((candidate) => lowerMap[header] === candidate),
      ) || ""
    );
  }

  return {
    display_name: pick(["name", "full name", "display name", "contact name"]),
    primary_email: pick(["email", "email address", "work email"]),
    primary_phone: pick(["phone", "phone number", "mobile", "whatsapp"]),
    organization_name: pick(["company", "organization", "account", "business"]),
    lifecycle_stage: pick(["lifecycle", "lifecycle stage", "stage", "type"]),
    tags: pick(["tags", "labels", "segments"]),
  };
}

async function readImportFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return {
    fileName: file.name,
    rows,
    headers: rows.length > 0 ? Object.keys(rows[0]) : [],
  };
}

function buildImportRow(row, mapping) {
  const lifecycle = normalizeText(row[mapping.lifecycle_stage]);
  return {
    display_name: String(row[mapping.display_name] || "").trim(),
    primary_email: String(row[mapping.primary_email] || "").trim(),
    primary_phone: String(row[mapping.primary_phone] || "").trim(),
    organization_name: String(row[mapping.organization_name] || "").trim(),
    lifecycle_stage:
      PERSON_LIFECYCLE_OPTIONS.some((item) => item.value === lifecycle) ? lifecycle : "lead",
    tags: dedupeTags(row[mapping.tags]),
  };
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

function SegmentSummary({ filterDefinition }) {
  const items = [
    filterDefinition.search ? `Search: ${filterDefinition.search}` : null,
    filterDefinition.status && filterDefinition.status !== "all"
      ? `Status: ${filterDefinition.status}`
      : null,
    filterDefinition.lifecycle && filterDefinition.lifecycle !== "all"
      ? `Lifecycle: ${filterDefinition.lifecycle}`
      : null,
    filterDefinition.tag && filterDefinition.tag !== "all"
      ? `Tag: ${filterDefinition.tag}`
      : null,
  ].filter(Boolean);

  if (items.length === 0) return <span>No filter</span>;
  return <span>{items.join(" | ")}</span>;
}

export function PeopleOperationsSection({
  rows,
  loading,
  onOpenLegacy,
  focusedRecordId,
  onNavigateRecord,
  savedViews,
  savedViewsLoading,
  refreshSavedViews,
  refreshPeople,
  updatePerson,
  createTask,
  leads,
  deals,
  tasks,
}) {
  const toast = useToast();
  const { can } = useCrmGovernance();
  const [filters, setFilters] = useState(PERSON_FILTER_DEFAULTS);
  const [archiveState, setArchiveState] = useState("active");
  const [activeViewId, setActiveViewId] = useState("");
  const [viewName, setViewName] = useState("");
  const [viewDefault, setViewDefault] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLifecycle, setBulkLifecycle] = useState("");
  const [bulkTags, setBulkTags] = useState("");
  const [savingView, setSavingView] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [mergingGroupKey, setMergingGroupKey] = useState("");
  const [personSaving, setPersonSaving] = useState(false);
  const [personForm, setPersonForm] = useState({
    display_name: "",
    primary_email: "",
    primary_phone: "",
    lifecycle_stage: "lead",
    status: "active",
  });

  useEffect(() => {
    const defaultView = savedViews.find((view) => view.is_default);
    if (!defaultView || activeViewId) return;
    setActiveViewId(defaultView.id);
    setFilters({ ...PERSON_FILTER_DEFAULTS, ...(defaultView.filter_definition || {}) });
  }, [savedViews, activeViewId]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => rows.some((row) => row.id === id)));
    if (selectedPersonId && !rows.some((row) => row.id === selectedPersonId)) {
      setSelectedPersonId(null);
    }
  }, [rows, selectedPersonId]);

  const filteredRows = useMemo(
    () => filterArchivedRecords(applyPeopleFilters(rows, filters), archiveState),
    [rows, filters, archiveState],
  );
  const allTags = useMemo(() => {
    return [...new Set(rows.flatMap((row) => (Array.isArray(row.tags) ? row.tags : [])))].sort();
  }, [rows]);
  const duplicateGroups = useMemo(() => buildPeopleDuplicateCandidates(rows), [rows]);
  const selectedPerson = useMemo(
    () => rows.find((row) => row.id === selectedPersonId) || null,
    [rows, selectedPersonId],
  );
  const selectedPersonSummary = useMemo(() => {
    if (!selectedPerson) {
      return { leads: [], deals: [], tasks: [] };
    }
    return {
      leads: leads.filter((lead) => lead.person_id === selectedPerson.id),
      deals: deals.filter((deal) => deal.primary_person_id === selectedPerson.id),
      tasks: tasks.filter((task) => task.entity_type === "person" && task.entity_id === selectedPerson.id),
    };
  }, [selectedPerson, leads, deals, tasks]);

  useEffect(() => {
    if (!selectedPerson) return;
    setPersonForm({
      display_name: selectedPerson.display_name || "",
      primary_email: selectedPerson.primary_email || "",
      primary_phone: selectedPerson.primary_phone || "",
      lifecycle_stage: selectedPerson.lifecycle_stage || "lead",
      status: selectedPerson.status || "active",
    });
  }, [selectedPerson]);

  useEffect(() => {
    if (!focusedRecordId || !rows.some((row) => row.id === focusedRecordId)) return;
    setSelectedPersonId(focusedRecordId);
  }, [focusedRecordId, rows]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setActiveViewId("");
  }

  function toggleRow(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleAllVisible() {
    if (filteredRows.length === 0) return;
    const visibleIds = filteredRows.map((row) => row.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])],
    );
  }

  async function handleSaveView() {
    if (!viewName.trim()) {
      toast.error("Nama saved view wajib diisi.");
      return;
    }

    setSavingView(true);
    try {
      const userId = await getCurrentUserId();

      if (viewDefault) {
        await supabase
          .from("crm_saved_views")
          .update({ is_default: false })
          .eq("entity_type", "person")
          .eq("is_default", true);
      }

      const payload = {
        user_id: userId,
        entity_type: "person",
        name: viewName.trim(),
        filter_definition: filters,
        is_default: viewDefault,
      };

      const query = activeViewId
        ? supabase.from("crm_saved_views").update(payload).eq("id", activeViewId)
        : supabase.from("crm_saved_views").insert(payload);

      const { error } = await query;
      if (error) throw error;

      await refreshSavedViews();
      toast.success(activeViewId ? "Saved view diperbarui." : "Saved view dibuat.");
    } catch (error) {
      toast.error(error?.message || "Gagal menyimpan saved view.");
    } finally {
      setSavingView(false);
    }
  }

  async function handleBulkApply() {
    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu person dulu.");
      return;
    }

    const changes = {};
    if (bulkStatus) changes.status = bulkStatus;
    if (bulkLifecycle) changes.lifecycle_stage = bulkLifecycle;
    if (!bulkStatus && !bulkLifecycle && !bulkTags.trim()) {
      toast.error("Pilih perubahan bulk yang mau dijalankan.");
      return;
    }

    setBulkSaving(true);
    try {
      if (Object.keys(changes).length > 0) {
        const { error } = await supabase
          .from("crm_people")
          .update(changes)
          .in("id", selectedIds);
        if (error) throw error;
      }

      const tagsToAdd = dedupeTags(bulkTags);
      if (tagsToAdd.length > 0) {
        const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
        for (const person of selectedRows) {
          const nextTags = [...new Set([...(person.tags || []), ...tagsToAdd])];
          const { error } = await supabase
            .from("crm_people")
            .update({ tags: nextTags })
            .eq("id", person.id);
          if (error) throw error;
        }
      }

      await refreshPeople();
      setBulkTags("");
      toast.success("Bulk update people berhasil dijalankan.");
    } catch (error) {
      toast.error(error?.message || "Bulk update people gagal.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleMergeGroup(group) {
    if (!group.records?.length || group.records.length < 2) return;
    const [target, ...sources] = group.records;

    setMergingGroupKey(group.key);
    try {
      for (const source of sources) {
        const { error } = await supabase.rpc("crm_merge_people", {
          p_source_id: source.id,
          p_target_id: target.id,
        });
        if (error) throw error;
      }

      await refreshPeople();
      toast.success(`Duplikasi ${group.reason.toLowerCase()} berhasil digabung.`);
    } catch (error) {
      toast.error(error?.message || "Merge duplikasi gagal.");
    } finally {
      setMergingGroupKey("");
    }
  }

  async function handleArchiveAction(action) {
    if (!selectedPerson) return;

    try {
      if (action === "archive") {
        await archiveCrmRecord("person", selectedPerson.id, "Archived from CRM people workspace");
        toast.success("Person berhasil diarsipkan.");
      } else {
        await restoreCrmRecord("person", selectedPerson.id);
        toast.success("Person berhasil direstore.");
      }
      await refreshPeople();
    } catch (error) {
      toast.error(error?.message || "Gagal menjalankan lifecycle action.");
    }
  }

  async function handlePersonSave(e) {
    e.preventDefault();
    if (!selectedPerson) return;
    if (!personForm.display_name.trim()) {
      toast.error("Nama person wajib diisi.");
      return;
    }

    setPersonSaving(true);
    try {
      await updatePerson(selectedPerson.id, {
        display_name: personForm.display_name.trim(),
        primary_email: personForm.primary_email.trim() || null,
        primary_phone: personForm.primary_phone.trim() || null,
        lifecycle_stage: personForm.lifecycle_stage,
        status: personForm.status,
      });
      toast.success("Detail person berhasil diperbarui.");
    } catch (error) {
      toast.error(error?.message || "Gagal update person.");
    } finally {
      setPersonSaving(false);
    }
  }

  async function handlePersonActivityCreated(_created, payload) {
    if (!selectedPerson) return;
    try {
      await updatePerson(selectedPerson.id, {
        last_activity_at: payload.happened_at || new Date().toISOString(),
        next_follow_up_at: payload.metadata?.follow_up_at || selectedPerson.next_follow_up_at || null,
      });
      await refreshPeople();
    } catch (error) {
      toast.error(error?.message || "Gagal sinkronkan follow-up person.");
    }
  }

  return (
    <section className="crm-section-grid" data-testid="crm-section-people">
      <div className="crm-section-main">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h2 className="crm-panel-title">People Ops</h2>
              <p className="crm-panel-sub">
                Workspace people untuk filter cepat, bulk update, rapihin duplikasi,
                dan follow-up harian tim.
              </p>
            </div>
            <button type="button" className="ghost-button" onClick={onOpenLegacy}>
              Buka Legacy Contact Manager
            </button>
          </div>

          <div className="crm-metric-grid">
            <article className="crm-metric-card">
              <span className="crm-metric-value">{rows.length}</span>
              <span className="crm-metric-label">Total People</span>
            </article>
            <article className="crm-metric-card">
              <span className="crm-metric-value">{filteredRows.length}</span>
              <span className="crm-metric-label">Visible by Filter</span>
            </article>
            <article className="crm-metric-card">
              <span className="crm-metric-value">{selectedIds.length}</span>
              <span className="crm-metric-label">Selected for Bulk Ops</span>
            </article>
            <article className="crm-metric-card">
              <span className="crm-metric-value">{duplicateGroups.length}</span>
              <span className="crm-metric-label">Duplicate Groups</span>
            </article>
          </div>

          <div className="crm-filter-grid" data-testid="crm-people-filters">
            <label className="crm-field">
              <span>Search</span>
              <input
                className="text-input"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Nama, email, phone, org, tag"
              />
            </label>
            <label className="crm-field">
              <span>Status</span>
              <select
                className="text-input"
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
              >
                <option value="all">All status</option>
                {PERSON_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="crm-field">
              <span>Lifecycle</span>
              <select
                className="text-input"
                value={filters.lifecycle}
                onChange={(e) => updateFilter("lifecycle", e.target.value)}
              >
                <option value="all">All lifecycle</option>
                {PERSON_LIFECYCLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="crm-field">
              <span>Tag</span>
              <select
                className="text-input"
                value={filters.tag}
                onChange={(e) => updateFilter("tag", e.target.value)}
              >
                <option value="all">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
            <label className="crm-field">
              <span>Record State</span>
              <select
                className="text-input"
                value={archiveState}
                onChange={(e) => setArchiveState(e.target.value)}
              >
                <option value="active">Active only</option>
                <option value="archived">Archived only</option>
                <option value="all">All records</option>
              </select>
            </label>
          </div>

          <div className="crm-saved-view-bar">
            <div className="crm-saved-view-list">
              <button
                type="button"
                className={`crm-chip${activeViewId === "" ? " crm-chip--active" : ""}`}
                onClick={() => {
                  setActiveViewId("");
                  setFilters(PERSON_FILTER_DEFAULTS);
                }}
              >
                Live view
              </button>
              {savedViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={`crm-chip${activeViewId === view.id ? " crm-chip--active" : ""}`}
                  onClick={() => {
                    setActiveViewId(view.id);
                    setViewName(view.name || "");
                    setViewDefault(Boolean(view.is_default));
                    setFilters({
                      ...PERSON_FILTER_DEFAULTS,
                      ...(view.filter_definition || {}),
                    });
                  }}
                >
                  {view.name}
                </button>
              ))}
            </div>

            <div className="crm-inline-actions">
              <input
                className="text-input crm-inline-input"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="Nama saved view"
              />
              <label className="crm-checkbox-inline">
                <input
                  type="checkbox"
                  checked={viewDefault}
                  onChange={(e) => setViewDefault(e.target.checked)}
                />
                Default
              </label>
              <button
                type="button"
                className="ghost-button"
                onClick={handleSaveView}
                disabled={savingView || savedViewsLoading}
              >
                {savingView ? "Menyimpan..." : activeViewId ? "Update View" : "Save View"}
              </button>
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="crm-bulk-bar" data-testid="crm-people-bulk-bar">
              <strong>{selectedIds.length} person dipilih</strong>
              <div className="crm-bulk-controls">
                <select
                  className="text-input"
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                >
                  <option value="">No status change</option>
                  {PERSON_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="text-input"
                  value={bulkLifecycle}
                  onChange={(e) => setBulkLifecycle(e.target.value)}
                >
                  <option value="">No lifecycle change</option>
                  {PERSON_LIFECYCLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className="text-input"
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                  placeholder="Tambah tag: vip, growth"
                />
                <button
                  type="button"
                  className="cta-button"
                  onClick={handleBulkApply}
                  disabled={bulkSaving}
                >
                  {bulkSaving ? "Processing..." : "Run Bulk Action"}
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="crm-empty">Memuat people...</div>
          ) : filteredRows.length === 0 ? (
            <div className="crm-empty">
              Belum ada person yang match dengan filter aktif.
            </div>
          ) : (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          filteredRows.length > 0 &&
                          filteredRows.every((row) => selectedIds.includes(row.id))
                        }
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th>Nama</th>
                    <th>Organization</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Lifecycle</th>
                    <th>Status</th>
                    <th>Tags</th>
                    <th>Next Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((person) => (
                    <tr
                      key={person.id}
                      className={selectedPersonId === person.id ? "crm-table-row--active" : ""}
                      onClick={() => setSelectedPersonId(person.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(person.id)}
                          onChange={() => toggleRow(person.id)}
                        />
                      </td>
                      <td>
                        <div className="crm-cell-strong">{person.display_name || "-"}</div>
                        <div className="crm-cell-sub">{person.job_title || "No title"}</div>
                      </td>
                      <td>{person.primary_organization?.name || "-"}</td>
                      <td>{person.primary_email || "-"}</td>
                      <td>{person.primary_phone || "-"}</td>
                      <td>{person.lifecycle_stage || "-"}</td>
                      <td>
                        <StatusPill value={person.status} />
                      </td>
                      <td>
                        <div className="crm-tag-list">
                          {(person.tags || []).slice(0, 3).map((tag) => (
                            <span key={tag} className="crm-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{formatDate(person.next_follow_up_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <aside className="crm-section-side">
        {selectedPerson ? (
          <section className="crm-panel" data-testid="crm-person-detail">
            <div className="crm-panel-head">
              <div>
                <h3 className="crm-panel-title">Person Detail</h3>
                <p className="crm-panel-sub">
                  Record workspace untuk klik row, edit field inti, dan lihat relasi lintas module.
                </p>
              </div>
            </div>

            <form className="crm-form" onSubmit={handlePersonSave}>
              <label className="crm-field">
                <span>Name</span>
                <input
                  className="text-input"
                  value={personForm.display_name}
                  onChange={(e) =>
                    setPersonForm((prev) => ({ ...prev, display_name: e.target.value }))
                  }
                  disabled={personSaving}
                />
              </label>
              <div className="crm-form-grid">
                <label className="crm-field">
                  <span>Email</span>
                  <input
                    className="text-input"
                    value={personForm.primary_email}
                    onChange={(e) =>
                      setPersonForm((prev) => ({ ...prev, primary_email: e.target.value }))
                    }
                    disabled={personSaving}
                  />
                </label>
                <label className="crm-field">
                  <span>Phone</span>
                  <input
                    className="text-input"
                    value={personForm.primary_phone}
                    onChange={(e) =>
                      setPersonForm((prev) => ({ ...prev, primary_phone: e.target.value }))
                    }
                    disabled={personSaving}
                  />
                </label>
              </div>
              <div className="crm-form-grid">
                <label className="crm-field">
                  <span>Lifecycle</span>
                  <select
                    className="text-input"
                    value={personForm.lifecycle_stage}
                    onChange={(e) =>
                      setPersonForm((prev) => ({ ...prev, lifecycle_stage: e.target.value }))
                    }
                    disabled={personSaving}
                  >
                    {PERSON_LIFECYCLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="crm-field">
                  <span>Status</span>
                  <select
                    className="text-input"
                    value={personForm.status}
                    onChange={(e) =>
                      setPersonForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                    disabled={personSaving}
                  >
                    {PERSON_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="crm-form-actions">
                <button type="submit" className="cta-button" disabled={personSaving}>
                  {personSaving ? "Menyimpan..." : "Update Person"}
                </button>
              </div>
            </form>

            <div className="crm-detail-grid">
              <div className="crm-detail-card">
                <strong>Organization</strong>
                {selectedPerson.primary_organization?.id ? (
                  <button
                    type="button"
                    className="crm-related-link"
                    onClick={() => onNavigateRecord?.("organizations", selectedPerson.primary_organization.id)}
                  >
                    {selectedPerson.primary_organization?.name || "-"}
                  </button>
                ) : (
                  <span>{selectedPerson.primary_organization?.name || "-"}</span>
                )}
              </div>
              <div className="crm-detail-card">
                <strong>Leads</strong>
                <span>{selectedPersonSummary.leads.length}</span>
              </div>
              <div className="crm-detail-card">
                <strong>Deals</strong>
                <span>{selectedPersonSummary.deals.length}</span>
              </div>
              <div className="crm-detail-card">
                <strong>Tasks</strong>
                <span>{selectedPersonSummary.tasks.length}</span>
              </div>
            </div>

            <QuickTaskInline
              entityType="person"
              entityId={selectedPerson.id}
              onCreate={createTask}
            />

            <div className="crm-related-list">
              <strong>Related Navigation</strong>
              {selectedPerson.primary_organization?.id ? (
                <button
                  type="button"
                  className="crm-related-link"
                  onClick={() => onNavigateRecord?.("organizations", selectedPerson.primary_organization.id)}
                >
                  Organization: {selectedPerson.primary_organization?.name}
                </button>
              ) : null}
              {selectedPersonSummary.leads.slice(0, 4).map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className="crm-related-link"
                  onClick={() => onNavigateRecord?.("leads", lead.id)}
                >
                  Lead: {lead.organization?.name || lead.person?.display_name || "Open lead"}
                </button>
              ))}
              {selectedPersonSummary.deals.slice(0, 4).map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  className="crm-related-link"
                  onClick={() => onNavigateRecord?.("deals", deal.id)}
                >
                  Deal: {deal.name}
                </button>
              ))}
              {selectedPersonSummary.tasks.slice(0, 4).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="crm-related-link"
                  onClick={() => onNavigateRecord?.("tasks", task.id)}
                >
                  Task: {task.title}
                </button>
              ))}
            </div>

            <div className="crm-form-actions">
              {!isRecordArchived(selectedPerson) ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => handleArchiveAction("archive")}
                  disabled={!can("archive", selectedPerson)}
                >
                  Archive Person
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => handleArchiveAction("restore")}
                  disabled={!can("restore", selectedPerson)}
                >
                  Restore Person
                </button>
              )}
            </div>
          </section>
        ) : null}

        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Duplicate Watch</h3>
              <p className="crm-panel-sub">
                Kandidat data ganda yang sebaiknya dirapikan biar tim kerja lebih bersih.
              </p>
            </div>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="crm-empty">
              Belum ada duplicate candidate berdasarkan email atau name + organization.
            </div>
          ) : (
            <div className="crm-duplicate-list">
              {duplicateGroups.map((group) => (
                <article key={group.key} className="crm-duplicate-card">
                  <div className="crm-duplicate-head">
                    <div>
                      <strong>{group.reason}</strong>
                      <span>{group.records.length} records</span>
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleMergeGroup(group)}
                      disabled={mergingGroupKey === group.key}
                    >
                      {mergingGroupKey === group.key ? "Merging..." : "Auto Merge"}
                    </button>
                  </div>
                  <div className="crm-duplicate-items">
                    {group.records.map((record, index) => (
                      <div key={record.id} className="crm-duplicate-item">
                        <strong>
                          {index === 0 ? "Target" : "Source"}: {record.display_name || "-"}
                        </strong>
                        <span>
                          {record.primary_email || "-"} |{" "}
                          {record.primary_organization?.name || "No organization"}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedPerson ? (
          <EntityActivityTimeline
            entityType="person"
            entityId={selectedPerson.id}
            entityLabel={selectedPerson.display_name}
            emptyTitle="Belum ada aktivitas untuk person ini."
            allowFollowUp
            onActivityCreated={handlePersonActivityCreated}
          />
        ) : (
          <section className="crm-panel">
            <div className="crm-empty">
              Pilih satu person untuk lihat activity timeline dan follow-up trail.
            </div>
          </section>
        )}
      </aside>
    </section>
  );
}

function QuickTaskInline({ entityType, entityId, onCreate }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task title wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        entity_type: entityType,
        entity_id: entityId,
        status: "open",
        priority: "medium",
      });
      setTitle("");
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
        placeholder="Quick task untuk person ini"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={saving}
      />
      <button type="submit" className="ghost-button" disabled={saving}>
        {saving ? "Saving..." : "Add Task"}
      </button>
    </form>
  );
}

export function SegmentsSection({ rows, loading, people, refreshSegments }) {
  const toast = useToast();
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    entity_type: "person",
    search: "",
    status: "all",
    lifecycle: "all",
    tag: "all",
    is_shared: false,
  });
  const [saving, setSaving] = useState(false);

  const livePreviewCount = useMemo(() => {
    if (form.entity_type !== "person") return 0;
    return applyPeopleFilters(people, form).length;
  }, [people, form]);

  function editSegment(segment) {
    const filters = segment.filter_definition || {};
    setEditingId(segment.id);
    setForm({
      name: segment.name || "",
      description: segment.description || "",
      entity_type: segment.entity_type || "person",
      search: filters.search || "",
      status: filters.status || "all",
      lifecycle: filters.lifecycle || "all",
      tag: filters.tag || "all",
      is_shared: Boolean(segment.is_shared),
    });
  }

  function resetForm() {
    setEditingId("");
    setForm({
      name: "",
      description: "",
      entity_type: "person",
      search: "",
      status: "all",
      lifecycle: "all",
      tag: "all",
      is_shared: false,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nama segment wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const userId = await getCurrentUserId();
      const payload = {
        user_id: userId,
        name: form.name.trim(),
        description: form.description.trim(),
        entity_type: form.entity_type,
        filter_definition: {
          search: form.search,
          status: form.status,
          lifecycle: form.lifecycle,
          tag: form.tag,
        },
        is_dynamic: true,
        is_shared: form.is_shared,
        last_preview_count: form.entity_type === "person" ? livePreviewCount : 0,
        last_refreshed_at: new Date().toISOString(),
      };

      const query = editingId
        ? supabase.from("crm_segments").update(payload).eq("id", editingId)
        : supabase.from("crm_segments").insert(payload);

      const { error } = await query;
      if (error) throw error;

      await refreshSegments();
      resetForm();
      toast.success(editingId ? "Segment diperbarui." : "Segment dibuat.");
    } catch (error) {
      toast.error(error?.message || "Gagal menyimpan segment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="crm-section-grid">
      <div className="crm-section-main">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h2 className="crm-panel-title">Segments</h2>
              <p className="crm-panel-sub">
                Dynamic segment sekarang disimpan sebagai reusable CRM object yang bisa
                dipakai lintas marketing growth, automation, dan AI workflows.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="crm-empty">Memuat segment...</div>
          ) : rows.length === 0 ? (
            <div className="crm-empty">
              Belum ada segment. Mulai dari segment people untuk list kerja, campaign,
              dan follow-up yang lebih cepat.
            </div>
          ) : (
            <div className="crm-segment-list">
              {rows.map((segment) => (
                <article key={segment.id} className="crm-segment-card">
                  <div className="crm-segment-head">
                    <div>
                      <strong>{segment.name}</strong>
                      <span>{segment.entity_type}</span>
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => editSegment(segment)}
                    >
                      Edit
                    </button>
                  </div>
                  <p>{segment.description || "No description"}</p>
                  <div className="crm-segment-meta">
                    <SegmentSummary filterDefinition={segment.filter_definition || {}} />
                  </div>
                  <div className="crm-segment-foot">
                    <span>Preview: {segment.last_preview_count || 0}</span>
                    <span>{segment.is_shared ? "Team" : "Private"}</span>
                  </div>
                </article>
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
                {editingId ? "Edit Segment" : "New Segment"}
              </h3>
              <p className="crm-panel-sub">
                Simpan segment yang rapi supaya tim bisa pakai list yang sama di area kerja lain.
              </p>
            </div>
          </div>

          <form className="crm-form" onSubmit={handleSubmit}>
            <label className="crm-field">
              <span>Name</span>
              <input
                className="text-input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={saving}
              />
            </label>

            <label className="crm-field">
              <span>Description</span>
              <textarea
                className="text-input crm-textarea"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                disabled={saving}
              />
            </label>

            <label className="crm-field">
              <span>Entity Type</span>
              <select
                className="text-input"
                value={form.entity_type}
                onChange={(e) => setForm((prev) => ({ ...prev, entity_type: e.target.value }))}
                disabled={saving}
              >
                <option value="person">Person</option>
                <option value="organization">Organization</option>
                <option value="lead">Lead</option>
                <option value="deal">Deal</option>
              </select>
            </label>

            <div className="crm-filter-grid">
              <label className="crm-field">
                <span>Search</span>
                <input
                  className="text-input"
                  value={form.search}
                  onChange={(e) => setForm((prev) => ({ ...prev, search: e.target.value }))}
                  disabled={saving}
                />
              </label>
              <label className="crm-field">
                <span>Status</span>
                <select
                  className="text-input"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  disabled={saving}
                >
                  <option value="all">All status</option>
                  {PERSON_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crm-field">
                <span>Lifecycle</span>
                <select
                  className="text-input"
                  value={form.lifecycle}
                  onChange={(e) => setForm((prev) => ({ ...prev, lifecycle: e.target.value }))}
                  disabled={saving}
                >
                  <option value="all">All lifecycle</option>
                  {PERSON_LIFECYCLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crm-field">
                <span>Tag</span>
                <input
                  className="text-input"
                  value={form.tag === "all" ? "" : form.tag}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      tag: e.target.value.trim() || "all",
                    }))
                  }
                  disabled={saving}
                />
              </label>
            </div>

            <label className="crm-checkbox-inline">
              <input
                type="checkbox"
                checked={form.is_shared}
                onChange={(e) => setForm((prev) => ({ ...prev, is_shared: e.target.checked }))}
                disabled={saving}
              />
              Team segment
            </label>

            <div className="crm-segment-preview">
              <strong>Live preview</strong>
              <span>
                {form.entity_type === "person"
                  ? `${livePreviewCount} people match segment ini.`
                  : "Preview live untuk entity ini disiapkan di phase entity-specific berikutnya."}
              </span>
            </div>

            <div className="crm-form-actions">
              <button type="submit" className="cta-button" disabled={saving}>
                {saving ? "Menyimpan..." : editingId ? "Update Segment" : "Create Segment"}
              </button>
              {editingId ? (
                <button type="button" className="ghost-button" onClick={resetForm}>
                  Batal Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </aside>
    </section>
  );
}

export function ImportsSection({
  people,
  organizations,
  jobs,
  jobsLoading,
  refreshPeople,
  refreshOrganizations,
  refreshJobs,
}) {
  const toast = useToast();
  const [parsedFile, setParsedFile] = useState(null);
  const [mapping, setMapping] = useState({
    display_name: "",
    primary_email: "",
    primary_phone: "",
    organization_name: "",
    lifecycle_stage: "",
    tags: "",
  });
  const [importing, setImporting] = useState(false);

  const previewRows = useMemo(() => {
    if (!parsedFile) return [];

    const orgMap = new Map(
      organizations.map((org) => [normalizeKey(org.name), org]),
    );
    const emailMap = new Map(
      people
        .filter((person) => person.primary_email)
        .map((person) => [normalizeText(person.primary_email), person]),
    );
    const nameOrgMap = new Map(
      people.map((person) => [
        `${normalizeText(person.display_name)}::${person.primary_organization_id || ""}`,
        person,
      ]),
    );

    return parsedFile.rows.slice(0, 12).map((row, index) => {
      const imported = buildImportRow(row, mapping);
      const org = imported.organization_name
        ? orgMap.get(normalizeKey(imported.organization_name))
        : null;
      const matchedByEmail = imported.primary_email
        ? emailMap.get(normalizeText(imported.primary_email))
        : null;
      const matchedByNameOrg =
        !matchedByEmail && imported.display_name && org?.id
          ? nameOrgMap.get(`${normalizeText(imported.display_name)}::${org.id}`)
          : null;
      const matchedPerson = matchedByEmail || matchedByNameOrg || null;

      return {
        id: `${parsedFile.fileName}-${index}`,
        ...imported,
        orgExists: Boolean(org),
        personExists: Boolean(matchedPerson),
      };
    });
  }, [parsedFile, mapping, organizations, people]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await readImportFile(file);
      setParsedFile(result);
      setMapping(autoMapImportColumns(result.headers));
      toast.success(`File ${result.fileName} siap diimport.`);
    } catch (error) {
      toast.error(error?.message || "Gagal membaca file import.");
    }
  }

  async function handleRunImport() {
    if (!parsedFile || parsedFile.rows.length === 0) {
      toast.error("Upload file import dulu.");
      return;
    }

    setImporting(true);
    let jobId = null;

    try {
      const userId = await getCurrentUserId();
      const { data: jobRow, error: jobError } = await supabase
        .from("crm_import_jobs")
        .insert({
          user_id: userId,
          entity_type: "person",
          source_type: "upload",
          status: "draft",
          file_name: parsedFile.fileName,
          raw_rows: parsedFile.rows,
          mapping,
          input_summary: {
            total_rows: parsedFile.rows.length,
            headers: parsedFile.headers,
          },
        })
        .select()
        .single();

      if (jobError) throw jobError;
      jobId = jobRow.id;

      await supabase
        .from("crm_import_jobs")
        .update({ status: "processing" })
        .eq("id", jobId);

      const orgMap = new Map(organizations.map((org) => [normalizeKey(org.name), org]));
      const emailMap = new Map(
        people
          .filter((person) => person.primary_email)
          .map((person) => [normalizeText(person.primary_email), person]),
      );
      const nameOrgMap = new Map(
        people.map((person) => [
          `${normalizeText(person.display_name)}::${person.primary_organization_id || ""}`,
          person,
        ]),
      );

      const counters = {
        created_people: 0,
        updated_people: 0,
        created_organizations: 0,
        skipped_rows: 0,
        failed_rows: 0,
      };

      for (const rawRow of parsedFile.rows) {
        try {
          const imported = buildImportRow(rawRow, mapping);
          if (!imported.display_name && !imported.primary_email) {
            counters.skipped_rows += 1;
            continue;
          }

          let organization = null;
          if (imported.organization_name) {
            const orgKey = normalizeKey(imported.organization_name);
            organization = orgMap.get(orgKey) || null;

            if (!organization) {
              const { data, error } = await supabase
                .from("crm_organizations")
                .insert({
                  user_id: userId,
                  name: imported.organization_name,
                  name_normalized: orgKey,
                  status: "active",
                  metadata: { source: "crm_import" },
                })
                .select()
                .single();
              if (error) throw error;
              organization = data;
              orgMap.set(orgKey, organization);
              counters.created_organizations += 1;
            }
          }

          let person =
            (imported.primary_email
              ? emailMap.get(normalizeText(imported.primary_email))
              : null) || null;

          if (!person && imported.display_name) {
            person =
              nameOrgMap.get(
                `${normalizeText(imported.display_name)}::${organization?.id || ""}`,
              ) || null;
          }

          if (person) {
            const nextTags = [...new Set([...(person.tags || []), ...imported.tags])];
            const changes = {
              tags: nextTags,
            };

            if (!person.primary_phone && imported.primary_phone) {
              changes.primary_phone = imported.primary_phone;
            }
            if (!person.primary_email && imported.primary_email) {
              changes.primary_email = imported.primary_email;
            }
            if (
              (!person.primary_organization_id || person.primary_organization_id === null) &&
              organization?.id
            ) {
              changes.primary_organization_id = organization.id;
            }
            if (
              imported.lifecycle_stage &&
              imported.lifecycle_stage !== "lead" &&
              person.lifecycle_stage !== imported.lifecycle_stage
            ) {
              changes.lifecycle_stage = imported.lifecycle_stage;
            }

            const { error } = await supabase
              .from("crm_people")
              .update(changes)
              .eq("id", person.id);
            if (error) throw error;

            person = { ...person, ...changes };
            counters.updated_people += 1;
          } else {
            const { data, error } = await supabase
              .from("crm_people")
              .insert({
                user_id: userId,
                display_name: imported.display_name || imported.primary_email,
                primary_email: imported.primary_email || null,
                primary_phone: imported.primary_phone || null,
                lifecycle_stage: imported.lifecycle_stage,
                primary_organization_id: organization?.id || null,
                source_type: "import",
                source_ref: parsedFile.fileName,
                status: "active",
                tags: imported.tags,
                metadata: { source: "crm_import" },
              })
              .select(
                "*, primary_organization:crm_organizations!crm_people_primary_organization_id_fkey(id,name)",
              )
              .single();
            if (error) throw error;

            person = data;
            counters.created_people += 1;
          }

          if (person.primary_email) {
            emailMap.set(normalizeText(person.primary_email), person);
          }
          nameOrgMap.set(
            `${normalizeText(person.display_name)}::${person.primary_organization_id || ""}`,
            person,
          );

          if (organization?.id && person?.id) {
            const { error } = await supabase.from("crm_person_organizations").upsert(
              {
                user_id: userId,
                person_id: person.id,
                organization_id: organization.id,
                relationship_type: "employee",
              },
              {
                onConflict: "person_id,organization_id",
                ignoreDuplicates: true,
              },
            );
            if (error) throw error;
          }
        } catch {
          counters.failed_rows += 1;
        }
      }

      await supabase
        .from("crm_import_jobs")
        .update({
          status: "completed",
          result_summary: counters,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      await Promise.all([refreshPeople(), refreshOrganizations(), refreshJobs()]);
      toast.success("Import CRM selesai diproses.");
    } catch (error) {
      if (jobId) {
        await supabase
          .from("crm_import_jobs")
          .update({
            status: "failed",
            error_message: error?.message || "Unknown import error",
          })
          .eq("id", jobId);
      }
      toast.error(error?.message || "Import CRM gagal.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="crm-section-grid">
      <div className="crm-section-main">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h2 className="crm-panel-title">Imports</h2>
              <p className="crm-panel-sub">
                Import people dan organization dengan preview ringkas sebelum data masuk ke workspace.
              </p>
            </div>
          </div>

          <div className="crm-import-uploader">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={importing}
            />
            {parsedFile ? (
              <span>
                {parsedFile.fileName} | {parsedFile.rows.length} rows
              </span>
            ) : (
              <span>Pilih CSV atau Excel untuk import people dan organization.</span>
            )}
          </div>

          {parsedFile ? (
            <>
              <div className="crm-filter-grid">
                {[
                  ["display_name", "Display Name"],
                  ["primary_email", "Primary Email"],
                  ["primary_phone", "Primary Phone"],
                  ["organization_name", "Organization"],
                  ["lifecycle_stage", "Lifecycle"],
                  ["tags", "Tags"],
                ].map(([key, label]) => (
                  <label key={key} className="crm-field">
                    <span>{label}</span>
                    <select
                      className="text-input"
                      value={mapping[key]}
                      onChange={(e) =>
                        setMapping((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      disabled={importing}
                    >
                      <option value="">Ignore column</option>
                      {parsedFile.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <div className="crm-import-preview-meta">
                <strong>Preview rows</strong>
                <span>Row yang match akan diupdate, sisanya dibuat sebagai record baru.</span>
              </div>

              <div className="crm-table-wrap">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Organization</th>
                      <th>Lifecycle</th>
                      <th>Tags</th>
                      <th>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.display_name || "-"}</td>
                        <td>{row.primary_email || "-"}</td>
                        <td>{row.organization_name || "-"}</td>
                        <td>{row.lifecycle_stage || "-"}</td>
                        <td>{row.tags.join(", ") || "-"}</td>
                        <td>
                          {row.personExists
                            ? "Update person"
                            : row.orgExists
                              ? "Create person + reuse org"
                              : "Create person + org"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="crm-form-actions">
                <button
                  type="button"
                  className="cta-button"
                  onClick={handleRunImport}
                  disabled={importing}
                >
                  {importing ? "Processing import..." : "Run Import"}
                </button>
              </div>
            </>
          ) : null}
        </section>
      </div>

      <aside className="crm-section-side">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Recent Import Jobs</h3>
              <p className="crm-panel-sub">
                Riwayat import terbaru untuk cek hasil proses dan jumlah data yang masuk.
              </p>
            </div>
          </div>

          {jobsLoading ? (
            <div className="crm-empty">Memuat import jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="crm-empty">
              Belum ada job import yang tercatat.
            </div>
          ) : (
            <div className="crm-job-list">
              {jobs.map((job) => (
                <article key={job.id} className="crm-job-card">
                  <div className="crm-job-head">
                    <strong>{job.file_name || "Manual import"}</strong>
                    <StatusPill value={JOB_STATUS_LABELS[job.status] || job.status} />
                  </div>
                  <div className="crm-job-meta">
                    <span>{formatDate(job.created_at)}</span>
                    <span>{job.input_summary?.total_rows || 0} rows</span>
                  </div>
                  <p>
                    Created people: {job.result_summary?.created_people || 0} | Updated:{" "}
                    {job.result_summary?.updated_people || 0} | Failed:{" "}
                    {job.result_summary?.failed_rows || 0}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </aside>
    </section>
  );
}
