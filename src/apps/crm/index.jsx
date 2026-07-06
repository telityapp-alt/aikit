import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase.js";
import { useEntity } from "../../lib/useEntity.js";
import { useToast } from "../../lib/ToastContext.jsx";
import EntityActivityTimeline from "../../components/EntityActivityTimeline.jsx";
import {
  ImportsSection,
  PeopleOperationsSection,
  SegmentsSection,
} from "./operations.jsx";
import {
  DealsWorkspaceSection,
  LeadsWorkspaceSection,
  OrganizationsWorkspaceSection,
  TasksWorkspaceSection,
} from "./workspaces.jsx";
import SettingsWorkspaceSection from "./settings.jsx";
import "./index.css";

const CRM_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "people", label: "People" },
  { id: "organizations", label: "Organizations" },
  { id: "leads", label: "Leads" },
  { id: "deals", label: "Deals" },
  { id: "tasks", label: "Tasks" },
  { id: "segments", label: "Segments" },
  { id: "imports", label: "Imports" },
  { id: "settings", label: "Settings" },
];

const STATUS_LABELS = {
  active: "Aktif",
  inactive: "Tidak Aktif",
  archived: "Arsip",
  open: "Open",
  completed: "Selesai",
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
  return (
    <span className={`crm-pill crm-pill--${String(value).toLowerCase()}`}>
      {STATUS_LABELS[value] ?? value}
    </span>
  );
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
    expected_close_at: deal?.expected_close_at
      ? new Date(deal.expected_close_at).toISOString().slice(0, 16)
      : "",
    status: deal?.status || "open",
    source_type: deal?.source_type || "manual",
    source_ref: deal?.source_ref || "",
  };
}

function EmptySelectOption({ label = "Pilih..." }) {
  return <option value="">{label}</option>;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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
      records,
      reason: key.startsWith("email:") ? "Same email" : "Same name + organization",
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

function CrmSectionPlaceholder({ title, summary }) {
  return (
    <section className="crm-panel">
      <div className="crm-panel-head">
        <div>
          <h2 className="crm-panel-title">{title}</h2>
          <p className="crm-panel-sub">{summary}</p>
        </div>
      </div>
      <div className="crm-empty">
        <strong>Area ini sedang disiapkan.</strong>
        <span>
          Tampilan detail untuk area ini akan dilanjutkan tanpa mengganggu alur kerja CRM yang sudah jalan.
        </span>
      </div>
    </section>
  );
}

function OverviewSection({ metrics, loading, schemaReady, onOpenSection, reports }) {
  return (
    <section className="crm-overview" data-testid="crm-section-overview">
      <div className="crm-panel">
        <div className="crm-panel-head">
          <div>
            <h2 className="crm-panel-title">CRM Workspace</h2>
            <p className="crm-panel-sub">
              Workspace operasional untuk people, organizations, leads, deals, dan follow-up harian.
            </p>
          </div>
          <div className="crm-banner-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => onOpenSection("people")}
            >
              Buka People
            </button>
            <button
              type="button"
              className="cta-button"
              onClick={() => onOpenSection("organizations")}
            >
              Lihat Organizations
            </button>
          </div>
        </div>

        <div className="crm-metric-grid">
          <article className="crm-metric-card">
            <span className="crm-metric-value">{loading ? "..." : metrics.people}</span>
            <span className="crm-metric-label">People</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">
              {loading ? "..." : metrics.organizations}
            </span>
            <span className="crm-metric-label">Organizations</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">{loading ? "..." : metrics.leads}</span>
            <span className="crm-metric-label">Leads</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">{loading ? "..." : metrics.deals}</span>
            <span className="crm-metric-label">Deals</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">{loading ? "..." : metrics.tasksOpen}</span>
            <span className="crm-metric-label">Open Tasks</span>
          </article>
        </div>
      </div>

      <div className="crm-grid-2">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Today Focus</h3>
              <p className="crm-panel-sub">
                Ringkasan cepat hal-hal yang paling butuh perhatian di workspace CRM hari ini.
              </p>
            </div>
          </div>
          <div className="crm-checklist">
            <div className="crm-check-item">
              <strong>Open tasks</strong>
              <span>{metrics.tasksOpen} task masih aktif dan perlu dieksekusi.</span>
            </div>
            <div className="crm-check-item">
              <strong>Active pipeline</strong>
              <span>{reports.dealPressure.staleCount} deal butuh follow-up lebih dekat.</span>
            </div>
            <div className="crm-check-item">
              <strong>Lead queue</strong>
              <span>{metrics.leads} lead aktif siap di-qualify atau dipindah ke next step.</span>
            </div>
          </div>
        </section>

        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Workspace Health</h3>
              <p className="crm-panel-sub">
                Status ringkas untuk tahu apakah workspace CRM ini siap dipakai tim secara normal.
              </p>
            </div>
          </div>
          <div className="crm-schema-status">
            <span
              className={`crm-pill ${schemaReady ? "crm-pill--ready" : "crm-pill--pending"}`}
            >
              {schemaReady ? "Workspace Ready" : "Workspace Pending"}
            </span>
            <p className="crm-schema-copy">
              {schemaReady
                ? "Data CRM, arsip, activity logging, dan settings utama sudah siap dipakai."
                : "Workspace CRM belum siap penuh. Selesaikan setup database terbaru sebelum dipakai tim."}
            </p>
          </div>
        </section>
      </div>

      <div className="crm-grid-2">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Lead Funnel</h3>
              <p className="crm-panel-sub">
                Snapshot stage lead supaya qualification pressure dan drop-off cepat kebaca.
              </p>
            </div>
          </div>
          <div className="crm-settings-list">
            {reports.leadFunnel.map((item) => (
              <article key={item.label} className="crm-setting-card">
                <div className="crm-setting-head">
                  <strong>{item.label}</strong>
                  <span>{item.count} lead</span>
                </div>
                <p>{item.share}% dari total lead aktif.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Task Backlog</h3>
              <p className="crm-panel-sub">
                Queue operasional untuk overdue, urgent, dan in-progress tasks.
              </p>
            </div>
          </div>
          <div className="crm-detail-grid">
            <div className="crm-detail-card">
              <strong>Overdue</strong>
              <span>{reports.taskBacklog.overdue}</span>
            </div>
            <div className="crm-detail-card">
              <strong>Urgent</strong>
              <span>{reports.taskBacklog.urgent}</span>
            </div>
            <div className="crm-detail-card">
              <strong>In Progress</strong>
              <span>{reports.taskBacklog.inProgress}</span>
            </div>
            <div className="crm-detail-card">
              <strong>Archived</strong>
              <span>{reports.taskBacklog.archived}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="crm-grid-2">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Deal Pressure</h3>
              <p className="crm-panel-sub">
                Deal stale dan pipeline value untuk tahu mana yang perlu follow-up segera.
              </p>
            </div>
          </div>
          <div className="crm-settings-list">
            <article className="crm-setting-card">
              <div className="crm-setting-head">
                <strong>Stale deals</strong>
                <span>{reports.dealPressure.staleCount}</span>
              </div>
              <p>{reports.dealPressure.staleValue} value berisiko idle terlalu lama.</p>
            </article>
            <article className="crm-setting-card">
              <div className="crm-setting-head">
                <strong>Won this workspace</strong>
                <span>{reports.dealPressure.wonCount}</span>
              </div>
              <p>{reports.dealPressure.wonValue} value sudah close won.</p>
            </article>
          </div>
        </section>

        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Source Quality</h3>
              <p className="crm-panel-sub">
                Breakdown source masuk untuk lihat channel yang paling aktif dan perlu perhatian.
              </p>
            </div>
          </div>
          <div className="crm-settings-list">
            {reports.sourceBreakdown.map((item) => (
              <article key={item.label} className="crm-setting-card">
                <div className="crm-setting-head">
                  <strong>{item.label}</strong>
                  <span>{item.count}</span>
                </div>
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function PeopleSection({ rows, loading, onOpenLegacy }) {
  return (
    <section className="crm-panel">
      <div className="crm-panel-head">
        <div>
          <h2 className="crm-panel-title">People</h2>
          <p className="crm-panel-sub">
            Daftar people utama untuk relationship management dan follow-up tim.
          </p>
        </div>
        <button type="button" className="ghost-button" onClick={onOpenLegacy}>
          Buka Legacy Contact Manager
        </button>
      </div>

      {loading ? (
        <div className="crm-empty">Memuat people...</div>
      ) : rows.length === 0 ? (
        <div className="crm-empty">
          Belum ada people. Import data atau buat record baru untuk mulai pakai workspace ini.
        </div>
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Lifecycle</th>
                <th>Status</th>
                <th>Next Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => (
                <tr key={person.id}>
                  <td>
                    <div className="crm-cell-strong">{person.display_name || "-"}</div>
                  </td>
                  <td>{person.primary_email || "-"}</td>
                  <td>{person.primary_phone || "-"}</td>
                  <td>{person.lifecycle_stage || "-"}</td>
                  <td>
                    <StatusPill value={person.status} />
                  </td>
                  <td>{formatDate(person.next_follow_up_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function OrganizationsSection({ rows, loading }) {
  return (
    <section className="crm-panel">
      <div className="crm-panel-head">
        <div>
          <h2 className="crm-panel-title">Organizations</h2>
          <p className="crm-panel-sub">
            Daftar organization untuk account tracking, deal, dan relasi antar tim.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="crm-empty">Memuat organizations...</div>
      ) : rows.length === 0 ? (
        <div className="crm-empty">
          Belum ada organization. Record bisa dibuat manual atau ikut masuk dari proses import.
        </div>
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Website</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((org) => (
                <tr key={org.id}>
                  <td>
                    <div className="crm-cell-strong">{org.name}</div>
                  </td>
                  <td>{org.website || "-"}</td>
                  <td>{org.industry || "-"}</td>
                  <td>
                    <StatusPill value={org.status} />
                  </td>
                  <td>{formatDate(org.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TasksSection({ rows, loading }) {
  return (
    <section className="crm-panel">
      <div className="crm-panel-head">
        <div>
          <h2 className="crm-panel-title">Tasks</h2>
          <p className="crm-panel-sub">
            Queue task untuk follow-up, next step, dan kerja harian tim.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="crm-empty">Memuat tasks...</div>
      ) : rows.length === 0 ? (
        <div className="crm-empty">
          Belum ada task CRM. Task akan muncul di sini saat follow-up mulai dibuat.
        </div>
      ) : (
        <div className="crm-task-list">
          {rows.map((task) => (
            <article key={task.id} className="crm-task-card">
              <div className="crm-task-head">
                <strong>{task.title}</strong>
                <div className="crm-task-meta">
                  <StatusPill value={task.status} />
                  <span className="crm-pill crm-pill--priority">
                    {PRIORITY_LABELS[task.priority] ?? task.priority}
                  </span>
                </div>
              </div>
              <p>{task.body || "Tidak ada detail tambahan."}</p>
              <div className="crm-task-foot">
                <span>
                  {task.entity_type}
                </span>
                <span>Due: {formatDate(task.due_at)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LeadsSection({
  leads,
  loading,
  peopleOptions,
  organizationOptions,
  createLead,
  updateLead,
  pipelines,
  pipelineStages,
  createDeal,
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedLead = useMemo(
    () => leads.find((item) => item.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );
  const [form, setForm] = useState(() => buildLeadForm(null));

  useEffect(() => {
    if (selectedLead) {
      setForm(buildLeadForm(selectedLead));
      return;
    }
    setForm(buildLeadForm(null));
  }, [selectedLead, isCreating]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
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
      return matchesSearch && matchesStage;
    });
  }, [leads, search, stageFilter]);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      qualified: leads.filter((item) => item.stage === "qualified").length,
      converted: leads.filter((item) => item.status === "converted").length,
      hot: leads.filter((item) => item.temperature === "hot").length,
    };
  }, [leads]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startCreate() {
    setSelectedLeadId(null);
    setIsCreating(true);
    setForm(buildLeadForm(null));
  }

  function selectLead(id) {
    setSelectedLeadId(id);
    setIsCreating(false);
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
    if (!selectedLead.person_id && !selectedLead.organization_id) {
      toast.error("Lead perlu person atau organization sebelum dikonversi.");
      return;
    }

    const defaultPipeline = pipelines.find((item) => item.is_default) ?? pipelines[0];
    const stages = pipelineStages[defaultPipeline?.id] ?? [];
    const openStage =
      stages.find((item) => !item.is_closed) ?? stages[0] ?? null;

    if (!defaultPipeline || !openStage) {
      toast.error("Pipeline default belum tersedia.");
      return;
    }

    const dealName =
      selectedLead.organization?.name ||
      selectedLead.person?.display_name ||
      "New Opportunity";

    setSaving(true);
    try {
      const createdDeal = await createDeal({
        name: `${dealName} Opportunity`,
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

  return (
    <section className="crm-section-grid">
      <div className="crm-section-main">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h2 className="crm-panel-title">Leads</h2>
              <p className="crm-panel-sub">
                Qualification workspace untuk source tracking, scoring, dan
                konversi ke deals.
              </p>
            </div>
            <button type="button" className="cta-button" onClick={startCreate}>
              Tambah Lead
            </button>
          </div>

          <div className="crm-metric-grid">
            <article className="crm-metric-card">
              <span className="crm-metric-value">{stats.total}</span>
              <span className="crm-metric-label">Total Leads</span>
            </article>
            <article className="crm-metric-card">
              <span className="crm-metric-value">{stats.qualified}</span>
              <span className="crm-metric-label">Qualified</span>
            </article>
            <article className="crm-metric-card">
              <span className="crm-metric-value">{stats.hot}</span>
              <span className="crm-metric-label">Hot Leads</span>
            </article>
            <article className="crm-metric-card">
              <span className="crm-metric-value">{stats.converted}</span>
              <span className="crm-metric-label">Converted</span>
            </article>
          </div>

          <div className="crm-toolbar">
            <input
              type="text"
              className="text-input"
              placeholder="Cari lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="text-input"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="all">Semua Stage</option>
              {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="crm-empty">Memuat leads...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="crm-empty">
              Belum ada lead yang cocok dengan filter saat ini.
            </div>
          ) : (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Source</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={selectedLeadId === lead.id ? "crm-table-row--active" : ""}
                      onClick={() => selectLead(lead.id)}
                    >
                      <td>
                        <div className="crm-cell-strong">
                          {lead.person?.display_name ||
                            lead.organization?.name ||
                            "Unlinked lead"}
                        </div>
                        <div className="crm-cell-sub">
                          {lead.organization?.name && lead.person?.display_name
                            ? lead.organization.name
                            : lead.person?.primary_email || lead.source_type || "-"}
                        </div>
                      </td>
                      <td>{lead.source_type || "-"}</td>
                      <td>{LEAD_STAGE_LABELS[lead.stage] ?? lead.stage}</td>
                      <td>
                        <StatusPill value={lead.status} />
                      </td>
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
                {isCreating ? "Buat Lead Baru" : selectedLead ? "Detail Lead" : "Pilih Lead"}
              </h3>
              <p className="crm-panel-sub">
                Lead bisa berdiri di atas person, organization, atau keduanya.
              </p>
            </div>
            {!isCreating && selectedLead ? (
              <button type="button" className="ghost-button" onClick={startCreate}>
                Lead Baru
              </button>
            ) : null}
          </div>

          {!isCreating && !selectedLead ? (
            <div className="crm-empty">
              Pilih lead dari tabel kiri atau buat lead baru untuk mulai kerja.
            </div>
          ) : (
            <form className="crm-form" onSubmit={handleSubmit}>
              <label className="crm-field">
                <span>Person</span>
                <select
                  className="text-input"
                  value={form.person_id}
                  onChange={(e) => setField("person_id", e.target.value)}
                  disabled={saving}
                >
                  <EmptySelectOption label="Pilih person" />
                  {peopleOptions.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.display_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="crm-field">
                <span>Organization</span>
                <select
                  className="text-input"
                  value={form.organization_id}
                  onChange={(e) => setField("organization_id", e.target.value)}
                  disabled={saving}
                >
                  <EmptySelectOption label="Pilih organization" />
                  {organizationOptions.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="crm-form-grid">
                <label className="crm-field">
                  <span>Source Type</span>
                  <input
                    className="text-input"
                    value={form.source_type}
                    onChange={(e) => setField("source_type", e.target.value)}
                    disabled={saving}
                  />
                </label>
                <label className="crm-field">
                  <span>Source Ref</span>
                  <input
                    className="text-input"
                    value={form.source_ref}
                    onChange={(e) => setField("source_ref", e.target.value)}
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="crm-form-grid">
                <label className="crm-field">
                  <span>Stage</span>
                  <select
                    className="text-input"
                    value={form.stage}
                    onChange={(e) => setField("stage", e.target.value)}
                    disabled={saving}
                  >
                    {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="crm-field">
                  <span>Status</span>
                  <select
                    className="text-input"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                    disabled={saving}
                  >
                    {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="crm-form-grid">
                <label className="crm-field">
                  <span>Score</span>
                  <input
                    type="number"
                    className="text-input"
                    value={form.score}
                    onChange={(e) => setField("score", e.target.value)}
                    disabled={saving}
                  />
                </label>
                <label className="crm-field">
                  <span>Temperature</span>
                  <select
                    className="text-input"
                    value={form.temperature}
                    onChange={(e) => setField("temperature", e.target.value)}
                    disabled={saving}
                  >
                    <option value="cold">Cold</option>
                    <option value="warm">Warm</option>
                    <option value="hot">Hot</option>
                  </select>
                </label>
              </div>

              <label className="crm-field">
                <span>Qualification Notes</span>
                <textarea
                  className="text-input crm-textarea"
                  value={form.qualification_notes}
                  onChange={(e) => setField("qualification_notes", e.target.value)}
                  disabled={saving}
                />
              </label>

              <label className="crm-field">
                <span>Disqualification Reason</span>
                <textarea
                  className="text-input crm-textarea"
                  value={form.disqualification_reason}
                  onChange={(e) => setField("disqualification_reason", e.target.value)}
                  disabled={saving}
                />
              </label>

              <div className="crm-form-actions">
                <button type="submit" className="cta-button" disabled={saving}>
                  {saving ? "Menyimpan..." : isCreating ? "Simpan Lead" : "Update Lead"}
                </button>
                {!isCreating && selectedLead?.status !== "converted" ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={convertLead}
                    disabled={saving}
                  >
                    Convert to Deal
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </section>

        {selectedLead ? (
          <EntityActivityTimeline
            entityType="lead"
            entityId={selectedLead.id}
            entityLabel={
              selectedLead.person?.display_name ||
              selectedLead.organization?.name ||
              "lead"
            }
            emptyTitle="Belum ada aktivitas untuk lead ini."
            allowFollowUp
          />
        ) : null}
      </aside>
    </section>
  );
}

function DealsSection({
  deals,
  loading,
  pipelines,
  pipelineStages,
  peopleOptions,
  organizationOptions,
  createDeal,
  updateDeal,
}) {
  const toast = useToast();
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (selectedDeal) {
      setForm(buildDealForm(selectedDeal, activePipeline?.id || "", defaultStageId));
      return;
    }
    setForm(buildDealForm(null, activePipeline?.id || "", defaultStageId));
  }, [selectedDeal, isCreating, activePipeline?.id, defaultStageId]);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (pipelineFilter === "all") return true;
      return deal.pipeline_id === pipelineFilter;
    });
  }, [deals, pipelineFilter]);

  const groupedDeals = useMemo(() => {
    const map = Object.fromEntries(activeStages.map((stage) => [stage.id, []]));
    for (const deal of filteredDeals) {
      if (!map[deal.stage_id]) {
        map[deal.stage_id] = [];
      }
      map[deal.stage_id].push(deal);
    }
    return map;
  }, [activeStages, filteredDeals]);

  const stats = useMemo(() => {
    const openDeals = deals.filter((item) => item.status === "open");
    const wonDeals = deals.filter((item) => item.status === "won");
    return {
      total: deals.length,
      open: openDeals.length,
      won: wonDeals.length,
      openValue: openDeals.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      wonValue: wonDeals.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [deals]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startCreate() {
    setSelectedDealId(null);
    setIsCreating(true);
    setForm(buildDealForm(null, activePipeline?.id || "", defaultStageId));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nama deal wajib diisi.");
      return;
    }
    if (!form.pipeline_id || !form.stage_id) {
      toast.error("Pipeline dan stage wajib dipilih.");
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

  return (
    <section className="crm-section-grid crm-section-grid--stack">
      <section className="crm-panel">
        <div className="crm-panel-head">
          <div>
            <h2 className="crm-panel-title">Deals & Pipeline</h2>
            <p className="crm-panel-sub">
              Revenue workspace untuk track opportunity, value, stage, dan next
              step pipeline.
            </p>
          </div>
          <div className="crm-banner-actions">
            <select
              className="text-input"
              value={pipelineFilter}
              onChange={(e) => setPipelineFilter(e.target.value)}
            >
              <option value="all">Semua Pipeline</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
            <button type="button" className="cta-button" onClick={startCreate}>
              Tambah Deal
            </button>
          </div>
        </div>

        <div className="crm-metric-grid">
          <article className="crm-metric-card">
            <span className="crm-metric-value">{stats.total}</span>
            <span className="crm-metric-label">Total Deals</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">{stats.open}</span>
            <span className="crm-metric-label">Open Deals</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">{formatMoney(stats.openValue)}</span>
            <span className="crm-metric-label">Open Pipeline Value</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">{formatMoney(stats.wonValue)}</span>
            <span className="crm-metric-label">Won Value</span>
          </article>
        </div>
      </section>

      <section className="crm-board-layout">
        <div className="crm-board-wrap">
          {loading ? (
            <div className="crm-empty">Memuat pipeline...</div>
          ) : activeStages.length === 0 ? (
            <div className="crm-empty">
              Belum ada pipeline stage tersedia. Jalankan migration supaya default
              pipeline tercipta.
            </div>
          ) : (
            <div className="crm-board">
              {activeStages.map((stage) => (
                <section key={stage.id} className="crm-board-column">
                  <div className="crm-board-head">
                    <div>
                      <strong>{stage.name}</strong>
                      <span>{groupedDeals[stage.id]?.length ?? 0} deal</span>
                    </div>
                    <span className="crm-pill crm-pill--priority">
                      {stage.win_probability}%
                    </span>
                  </div>
                  <div className="crm-board-list">
                    {(groupedDeals[stage.id] ?? []).map((deal) => (
                      <article
                        key={deal.id}
                        className={`crm-board-card${selectedDealId === deal.id ? " crm-board-card--active" : ""}`}
                        onClick={() => {
                          setSelectedDealId(deal.id);
                          setIsCreating(false);
                        }}
                      >
                        <div className="crm-board-card-top">
                          <strong>{deal.name}</strong>
                          <StatusPill value={deal.status} />
                        </div>
                        <p>{deal.organization?.name || deal.person?.display_name || "Unlinked deal"}</p>
                        <div className="crm-board-card-foot">
                          <span>{formatMoney(deal.amount, deal.currency)}</span>
                          <select
                            className="crm-mini-select"
                            value={deal.stage_id || ""}
                            onChange={(e) => moveDeal(deal, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {activeStages.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
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
        </div>

        <aside className="crm-section-side">
          <section className="crm-panel">
            <div className="crm-panel-head">
              <div>
                <h3 className="crm-panel-title">
                  {isCreating ? "Buat Deal Baru" : selectedDeal ? "Detail Deal" : "Pilih Deal"}
                </h3>
                <p className="crm-panel-sub">
                  Deal terhubung ke pipeline, person, dan organization yang sama.
                </p>
              </div>
            </div>

            {!isCreating && !selectedDeal ? (
              <div className="crm-empty">
                Pilih deal di board atau buat deal baru untuk mengisi pipeline.
              </div>
            ) : (
              <form className="crm-form" onSubmit={handleSubmit}>
                <label className="crm-field">
                  <span>Deal Name</span>
                  <input
                    className="text-input"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    disabled={saving}
                  />
                </label>

                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Pipeline</span>
                    <select
                      className="text-input"
                      value={form.pipeline_id}
                      onChange={(e) => {
                        const nextPipelineId = e.target.value;
                        const nextStages = pipelineStages[nextPipelineId] ?? [];
                        setForm((prev) => ({
                          ...prev,
                          pipeline_id: nextPipelineId,
                          stage_id:
                            prev.pipeline_id === nextPipelineId && prev.stage_id
                              ? prev.stage_id
                              : nextStages.find((item) => !item.is_closed)?.id ||
                                nextStages[0]?.id ||
                                "",
                        }));
                      }}
                      disabled={saving}
                    >
                      <EmptySelectOption label="Pilih pipeline" />
                      {pipelines.map((pipeline) => (
                        <option key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="crm-field">
                    <span>Stage</span>
                    <select
                      className="text-input"
                      value={form.stage_id}
                      onChange={(e) => setField("stage_id", e.target.value)}
                      disabled={saving}
                    >
                      <EmptySelectOption label="Pilih stage" />
                      {(pipelineStages[form.pipeline_id] ?? []).map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Organization</span>
                    <select
                      className="text-input"
                      value={form.organization_id}
                      onChange={(e) => setField("organization_id", e.target.value)}
                      disabled={saving}
                    >
                      <EmptySelectOption label="Pilih organization" />
                      {organizationOptions.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="crm-field">
                    <span>Primary Person</span>
                    <select
                      className="text-input"
                      value={form.primary_person_id}
                      onChange={(e) => setField("primary_person_id", e.target.value)}
                      disabled={saving}
                    >
                      <EmptySelectOption label="Pilih person" />
                      {peopleOptions.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.display_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Amount</span>
                    <input
                      type="number"
                      className="text-input"
                      value={form.amount}
                      onChange={(e) => setField("amount", e.target.value)}
                      disabled={saving}
                    />
                  </label>
                  <label className="crm-field">
                    <span>Currency</span>
                    <input
                      className="text-input"
                      value={form.currency}
                      onChange={(e) => setField("currency", e.target.value)}
                      disabled={saving}
                    />
                  </label>
                </div>

                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Expected Close</span>
                    <input
                      type="datetime-local"
                      className="text-input"
                      value={form.expected_close_at}
                      onChange={(e) => setField("expected_close_at", e.target.value)}
                      disabled={saving}
                    />
                  </label>
                  <label className="crm-field">
                    <span>Status</span>
                    <select
                      className="text-input"
                      value={form.status}
                      onChange={(e) => setField("status", e.target.value)}
                      disabled={saving}
                    >
                      {Object.entries(DEAL_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="crm-form-grid">
                  <label className="crm-field">
                    <span>Source Type</span>
                    <input
                      className="text-input"
                      value={form.source_type}
                      onChange={(e) => setField("source_type", e.target.value)}
                      disabled={saving}
                    />
                  </label>
                  <label className="crm-field">
                    <span>Source Ref</span>
                    <input
                      className="text-input"
                      value={form.source_ref}
                      onChange={(e) => setField("source_ref", e.target.value)}
                      disabled={saving}
                    />
                  </label>
                </div>

                <div className="crm-form-actions">
                  <button type="submit" className="cta-button" disabled={saving}>
                    {saving ? "Menyimpan..." : isCreating ? "Simpan Deal" : "Update Deal"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {selectedDeal ? (
            <EntityActivityTimeline
              entityType="deal"
              entityId={selectedDeal.id}
              entityLabel={selectedDeal.name}
              emptyTitle="Belum ada aktivitas untuk deal ini."
              allowFollowUp
            />
          ) : null}
        </aside>
      </section>
    </section>
  );
}

export default function CrmApp({ routeSegments = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const section = CRM_SECTIONS.some((item) => item.id === routeSegments[0])
    ? routeSegments[0]
    : "overview";
  const focusToken = new URLSearchParams(location.search).get("record") || "";
  const focusedRecordId = focusToken.split(":")[1] || "";

  const {
    data: people,
    loading: peopleLoading,
    update: updatePerson,
    refresh: refreshPeople,
  } = useEntity("crm_people", {
    select:
      "*, primary_organization:crm_organizations!crm_people_primary_organization_id_fkey(id,name)",
    orderBy: "updated_at",
    ascending: false,
  });
  const {
    data: organizations,
    loading: organizationsLoading,
    create: createOrganization,
    update: updateOrganization,
    refresh: refreshOrganizations,
  } = useEntity("crm_organizations", {
    orderBy: "updated_at",
    ascending: false,
  });
  const {
    data: tasks,
    loading: tasksLoading,
    create: createTask,
    update: updateTask,
    refresh: refreshTasks,
  } = useEntity("crm_tasks", {
    orderBy: "due_at",
    ascending: true,
  });
  const {
    data: leads,
    loading: leadsLoading,
    create: createLead,
    update: updateLead,
    refresh: refreshLeads,
  } = useEntity("crm_leads", {
    select:
      "*, person:crm_people!crm_leads_person_id_fkey(id,display_name,primary_email), organization:crm_organizations!crm_leads_organization_id_fkey(id,name)",
    orderBy: "updated_at",
    ascending: false,
  });
  const {
    data: deals,
    loading: dealsLoading,
    create: createDeal,
    update: updateDeal,
    refresh: refreshDeals,
  } = useEntity("crm_deals", {
    select:
      "*, person:crm_people!crm_deals_primary_person_id_fkey(id,display_name), organization:crm_organizations!crm_deals_organization_id_fkey(id,name)",
    orderBy: "updated_at",
    ascending: false,
  });
  const {
    data: savedViews,
    loading: savedViewsLoading,
    refresh: refreshSavedViews,
  } = useEntity("crm_saved_views", {
    filter: { entity_type: "person" },
    orderBy: "updated_at",
    ascending: false,
  });
  const {
    data: segments,
    loading: segmentsLoading,
    refresh: refreshSegments,
  } = useEntity("crm_segments", {
    orderBy: "updated_at",
    ascending: false,
  });
  const {
    data: importJobs,
    loading: importJobsLoading,
    refresh: refreshImportJobs,
  } = useEntity("crm_import_jobs", {
    filter: { entity_type: "person" },
    orderBy: "created_at",
    ascending: false,
  });

  const [metrics, setMetrics] = useState({
    people: 0,
    organizations: 0,
    leads: 0,
    deals: 0,
    tasksOpen: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [pipelines, setPipelines] = useState([]);
  const [pipelineStages, setPipelineStages] = useState({});
  const [pipelineLoading, setPipelineLoading] = useState(true);

  const reportPacks = useMemo(() => {
    const activeLeads = leads.filter((lead) => !lead.archived_at);
    const leadFunnel = ["new", "attempted", "connected", "qualified", "proposal", "converted", "lost"].map((stage) => {
      const count = activeLeads.filter((lead) => lead.stage === stage).length;
      return {
        label: LEAD_STAGE_LABELS[stage] ?? stage,
        count,
        share: activeLeads.length > 0 ? Math.round((count / activeLeads.length) * 100) : 0,
      };
    });

    const now = Date.now();
    const staleDeals = deals.filter((deal) => {
      const updatedAt = new Date(deal.updated_at || deal.created_at || 0).getTime();
      return deal.status === "open" && now - updatedAt > 1000 * 60 * 60 * 24 * 14;
    });
    const overdueTasks = tasks.filter((task) => {
      if (!task.due_at || task.archived_at || task.status === "completed" || task.status === "cancelled") {
        return false;
      }
      return new Date(task.due_at).getTime() < now;
    });

    const sourceCounts = {};
    for (const lead of leads) {
      const key = lead.source_type || "manual";
      sourceCounts[key] = (sourceCounts[key] || 0) + 1;
    }

    const missingOwnerPeople = people.filter((person) => !person.owner_user_id).length;
    const followUpQueue = people.filter((person) => person.next_follow_up_at).length;

    return {
      leadFunnel,
      taskBacklog: {
        overdue: overdueTasks.length,
        urgent: tasks.filter((task) => task.priority === "urgent" && !task.archived_at).length,
        inProgress: tasks.filter((task) => task.status === "in_progress" && !task.archived_at).length,
        archived: tasks.filter((task) => task.archived_at).length,
      },
      dealPressure: {
        staleCount: staleDeals.length,
        staleValue: formatMoney(staleDeals.reduce((sum, deal) => sum + Number(deal.amount || 0), 0)),
        wonCount: deals.filter((deal) => deal.status === "won").length,
        wonValue: formatMoney(deals.filter((deal) => deal.status === "won").reduce((sum, deal) => sum + Number(deal.amount || 0), 0)),
      },
      sourceBreakdown: Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([label, count]) => ({
          label,
          count,
          summary: `${count} lead | Missing owner people: ${missingOwnerPeople} | Follow-up queue: ${followUpQueue}`,
        })),
    };
  }, [deals, leads, people, tasks]);

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      setMetricsLoading(true);
      try {
        const [
          peopleRes,
          organizationsRes,
          leadsRes,
          dealsRes,
          tasksRes,
        ] = await Promise.all([
          supabase.from("crm_people").select("id", { count: "exact", head: true }),
          supabase
            .from("crm_organizations")
            .select("id", { count: "exact", head: true }),
          supabase.from("crm_leads").select("id", { count: "exact", head: true }),
          supabase.from("crm_deals").select("id", { count: "exact", head: true }),
          supabase
            .from("crm_tasks")
            .select("id", { count: "exact", head: true })
            .eq("status", "open"),
        ]);

        const firstError = [
          peopleRes.error,
          organizationsRes.error,
          leadsRes.error,
          dealsRes.error,
          tasksRes.error,
        ].find(Boolean);

        if (firstError) throw firstError;

        if (!active) return;

        setMetrics({
          people: peopleRes.count ?? 0,
          organizations: organizationsRes.count ?? 0,
          leads: leadsRes.count ?? 0,
          deals: dealsRes.count ?? 0,
          tasksOpen: tasksRes.count ?? 0,
        });
        setSchemaReady(true);
      } catch {
        if (!active) return;
        setSchemaReady(false);
        setMetrics({
          people: 0,
          organizations: 0,
          leads: 0,
          deals: 0,
          tasksOpen: 0,
        });
      } finally {
        if (active) setMetricsLoading(false);
      }
    }

    loadMetrics();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPipelines() {
      setPipelineLoading(true);
      try {
        const [{ data: pipelineRows, error: pipelineError }, { data: stageRows, error: stageError }] =
          await Promise.all([
            supabase
              .from("crm_pipelines")
              .select("*")
              .order("is_default", { ascending: false })
              .order("created_at", { ascending: true }),
            supabase
              .from("crm_pipeline_stages")
              .select("*")
              .order("position", { ascending: true }),
          ]);

        if (pipelineError) throw pipelineError;
        if (stageError) throw stageError;
        if (!active) return;

        const groupedStages = (stageRows ?? []).reduce((acc, stage) => {
          if (!acc[stage.pipeline_id]) acc[stage.pipeline_id] = [];
          acc[stage.pipeline_id].push(stage);
          return acc;
        }, {});

        setPipelines(pipelineRows ?? []);
        setPipelineStages(groupedStages);
      } catch (error) {
        if (!active) return;
        setPipelines([]);
        setPipelineStages({});
        toast.error(error?.message || "Gagal memuat pipeline CRM.");
      } finally {
        if (active) setPipelineLoading(false);
      }
    }

    loadPipelines();

    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!schemaReady) return;
    setMetrics({
      people: people.length,
      organizations: organizations.length,
      leads: leads.length,
      deals: deals.length,
      tasksOpen: tasks.filter((task) => task.status === "open").length,
    });
  }, [schemaReady, people, organizations, leads, deals, tasks]);

  function goToSection(nextSection) {
    navigate(`/dashboard/apps/crm/${nextSection}`);
  }

  function navigateToRecord(nextSection, recordId) {
    navigate(`/dashboard/apps/crm/${nextSection}?record=${nextSection}:${recordId}`);
  }

  function renderSection() {
    switch (section) {
      case "overview":
        return (
          <OverviewSection
            metrics={metrics}
            loading={metricsLoading}
            schemaReady={schemaReady}
            onOpenSection={goToSection}
            reports={reportPacks}
          />
        );
      case "people":
        return (
          <PeopleOperationsSection
            rows={people}
            loading={peopleLoading}
            onOpenLegacy={() => navigate("/dashboard/module/contact-manager")}
            focusedRecordId={section === "people" ? focusedRecordId : ""}
            onNavigateRecord={navigateToRecord}
            savedViews={savedViews}
            savedViewsLoading={savedViewsLoading}
            refreshSavedViews={refreshSavedViews}
            refreshPeople={refreshPeople}
            updatePerson={updatePerson}
            createTask={createTask}
            leads={leads}
            deals={deals}
            tasks={tasks}
          />
        );
      case "organizations":
        return (
          <OrganizationsWorkspaceSection
            organizations={organizations}
            people={people}
            leads={leads}
            deals={deals}
            tasks={tasks}
            focusedRecordId={section === "organizations" ? focusedRecordId : ""}
            onNavigateRecord={navigateToRecord}
            loading={organizationsLoading}
            createOrganization={createOrganization}
            updateOrganization={updateOrganization}
            createTask={createTask}
            refreshOrganizations={refreshOrganizations}
          />
        );
      case "tasks":
        return (
          <TasksWorkspaceSection
            tasks={tasks}
            focusedRecordId={section === "tasks" ? focusedRecordId : ""}
            onNavigateRecord={navigateToRecord}
            loading={tasksLoading}
            createTask={createTask}
            updateTask={updateTask}
            refreshTasks={refreshTasks}
          />
        );
      case "leads":
        return (
          <LeadsWorkspaceSection
            leads={leads}
            loading={leadsLoading}
            peopleOptions={people}
            organizationOptions={organizations}
            tasks={tasks}
            focusedRecordId={section === "leads" ? focusedRecordId : ""}
            onNavigateRecord={navigateToRecord}
            createLead={createLead}
            updateLead={updateLead}
            pipelines={pipelines}
            pipelineStages={pipelineStages}
            createDeal={createDeal}
            createTask={createTask}
            refreshLeads={refreshLeads}
          />
        );
      case "deals":
        return (
          <DealsWorkspaceSection
            deals={deals}
            loading={dealsLoading || pipelineLoading}
            pipelines={pipelines}
            pipelineStages={pipelineStages}
            peopleOptions={people}
            organizationOptions={organizations}
            tasks={tasks}
            focusedRecordId={section === "deals" ? focusedRecordId : ""}
            onNavigateRecord={navigateToRecord}
            createDeal={createDeal}
            updateDeal={updateDeal}
            createTask={createTask}
            refreshDeals={refreshDeals}
          />
        );
      case "segments":
        return (
          <SegmentsSection
            rows={segments}
            loading={segmentsLoading}
            people={people}
            refreshSegments={refreshSegments}
          />
        );
      case "imports":
        return (
          <ImportsSection
            people={people}
            organizations={organizations}
            jobs={importJobs}
            jobsLoading={importJobsLoading}
            refreshPeople={refreshPeople}
            refreshOrganizations={refreshOrganizations}
            refreshJobs={refreshImportJobs}
          />
        );
      case "settings":
        return <SettingsWorkspaceSection />;
      default:
        return null;
    }
  }

  return (
    <div className="crm-shell" data-testid="crm-shell">
      <aside className="crm-sidebar">
        <div className="crm-sidebar-top">
          <span className="crm-kicker">Apps / CRM</span>
          <h1 className="crm-title">CRM</h1>
          <p className="crm-copy">
            White, compact workspace untuk jalankan relationship ops harian.
          </p>
        </div>

        <nav className="crm-nav" aria-label="CRM navigation">
          {CRM_SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`crm-nav-${item.id}`}
              className={`crm-nav-link${section === item.id ? " crm-nav-link--active" : ""}`}
              onClick={() => goToSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="crm-sidebar-foot">
          <div className="crm-mini-card">
            <strong>Workspace mode</strong>
            <span>
              Gunakan sidebar ini buat pindah cepat antar people, leads, deals, tasks, dan settings.
            </span>
          </div>
        </div>
      </aside>

      <main className="crm-main">{renderSection()}</main>
    </div>
  );
}
