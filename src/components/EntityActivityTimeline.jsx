import { useEffect, useMemo, useState } from "react";
import { fmt } from "../lib/format";
import { useEntity } from "../lib/useEntity";
import { useToast } from "../lib/ToastContext";
import { useAuth } from "../lib/AuthContext";
import { CRM_ACTIVITY_CATALOG } from "../apps/crm/controlPlaneConfig.js";

const ACTIVITY_TYPES = CRM_ACTIVITY_CATALOG.map((item) => ({
  value: item.id,
  label: item.label,
  channel: item.channel,
}));

const ACTIVITY_LOOKUP = Object.fromEntries(
  ACTIVITY_TYPES.map((item) => [item.value, item]),
);

const LEGACY_ACTIVITY_LOOKUP = {
  note: { label: "Note", channel: "manual" },
  call: { label: "Call", channel: "call" },
  email: { label: "Email", channel: "email" },
  meeting: { label: "Meeting", channel: "calendar" },
  task: { label: "Task", channel: "manual" },
  status_change: { label: "Status Change", channel: "system" },
  owner_change: { label: "Owner Change", channel: "system" },
  system: { label: "System", channel: "system" },
  import: { label: "Import", channel: "import" },
  import_event: { label: "Import Event", channel: "import" },
  automation: { label: "Automation", channel: "automation" },
  automation_event: { label: "Automation Event", channel: "automation" },
};

function toDateTimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function parseList(value) {
  return String(value || "")
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferDirection(activityType) {
  if (activityType === "call_outbound" || activityType === "email_outbound") return "outbound";
  if (activityType === "call_inbound" || activityType === "email_inbound") return "inbound";
  return "internal";
}

function buildInitial(entityLabel) {
  return {
    activity_type: "note",
    title: "",
    body: "",
    happened_at: toDateTimeLocal(new Date()),
    follow_up_at: "",
    duration_minutes: "",
    recipients: "",
    subject: "",
    outcome: "",
    location: "",
    tags: "",
    next_step: "",
    visibility: "team",
    entityLabel,
  };
}

function getActivityPresentation(activityType, metadata = {}) {
  const direct = ACTIVITY_LOOKUP[activityType];
  if (direct) return direct;

  const legacy = LEGACY_ACTIVITY_LOOKUP[activityType];
  if (legacy) {
    return {
      value: activityType,
      label: legacy.label,
      channel: metadata?.channel || legacy.channel,
    };
  }

  return {
    value: activityType,
    label: activityType,
    channel: metadata?.channel || "manual",
  };
}

export default function EntityActivityTimeline({
  entityType,
  entityId,
  entityLabel,
  emptyTitle,
  allowFollowUp = false,
  onActivityCreated,
}) {
  const toast = useToast();
  const { user } = useAuth();
  const {
    data: activities,
    loading,
    create,
    error,
  } = useEntity("activities", {
    orderBy: "happened_at",
    ascending: false,
    filter: { entity_type: entityType, entity_id: entityId },
    autoLoad: Boolean(entityId),
  });

  const [form, setForm] = useState(() => buildInitial(entityLabel));
  const [typeFilter, setTypeFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(buildInitial(entityLabel));
  }, [entityId, entityLabel]);

  const activeType = useMemo(
    () => getActivityPresentation(form.activity_type),
    [form.activity_type],
  );

  const visibleActivities = useMemo(() => {
    return activities.filter((activity) => {
      const presentation = getActivityPresentation(activity.activity_type, activity.metadata);
      const haystack = [
        activity.title,
        activity.body,
        activity.metadata?.subject,
        activity.metadata?.outcome,
        activity.metadata?.next_step,
        ...(Array.isArray(activity.metadata?.tags) ? activity.metadata.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesType = typeFilter === "all" || activity.activity_type === typeFilter;
      const matchesChannel = channelFilter === "all" || presentation.channel === channelFilter;
      const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
      return matchesType && matchesChannel && matchesSearch;
    });
  }, [activities, channelFilter, search, typeFilter]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!entityId) return;
    if (!form.title.trim()) {
      toast.error("Judul aktivitas wajib diisi.");
      return;
    }

    const metadata = {
      channel: activeType.channel,
      direction: inferDirection(form.activity_type),
      visibility: form.visibility || "team",
      tags: parseList(form.tags),
    };

    if (form.follow_up_at) metadata.follow_up_at = form.follow_up_at;
    if (form.duration_minutes) metadata.duration_minutes = Number(form.duration_minutes);
    if (form.recipients.trim()) metadata.recipients = parseList(form.recipients);
    if (form.subject.trim()) metadata.subject = form.subject.trim();
    if (form.outcome.trim()) metadata.outcome = form.outcome.trim();
    if (form.location.trim()) metadata.location = form.location.trim();
    if (form.next_step.trim()) metadata.next_step = form.next_step.trim();

    const payload = {
      entity_type: entityType,
      entity_id: entityId,
      activity_type: form.activity_type,
      title: form.title.trim(),
      body: form.body.trim() || null,
      happened_at: form.happened_at || new Date().toISOString(),
      metadata,
      actor_user_id: user?.id || null,
      direction: inferDirection(form.activity_type),
      source_type: "crm_manual",
      source_ref: entityType,
    };

    setSubmitting(true);
    try {
      const created = await create(payload);
      if (onActivityCreated) {
        await onActivityCreated(created, payload);
      }
      setForm(buildInitial(entityLabel));
      toast.success("Aktivitas ditambahkan.");
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan aktivitas.");
    } finally {
      setSubmitting(false);
    }
  }

  const showCallFields = activeType.channel === "call";
  const showEmailFields = activeType.channel === "email";
  const showMeetingFields = form.activity_type === "meeting";

  return (
    <div className="entity-activity">
      <div className="entity-activity-header">
        <h3 className="entity-activity-title">Timeline Aktivitas</h3>
        <p className="entity-activity-sub">
          Simpan note, call log, email touchpoint, dan next step penting untuk {entityLabel}.
        </p>
      </div>

      <form className="entity-activity-form" onSubmit={handleSubmit}>
        <div className="entity-activity-form-grid">
          <label className="entity-activity-field">
            <span>Activity Type</span>
            <select
              value={form.activity_type}
              onChange={(e) => setField("activity_type", e.target.value)}
              disabled={submitting}
            >
              {ACTIVITY_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="entity-activity-field">
            <span>Logged At</span>
            <input
              type="datetime-local"
              value={form.happened_at}
              onChange={(e) => setField("happened_at", e.target.value)}
              disabled={submitting}
            />
          </label>
        </div>

        <label className="entity-activity-field">
          <span>Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Contoh: Follow-up proposal Q3"
            disabled={submitting}
          />
        </label>

        <label className="entity-activity-field">
          <span>Detail</span>
          <textarea
            rows={4}
            value={form.body}
            onChange={(e) => setField("body", e.target.value)}
            placeholder="Apa yang terjadi, insight penting, dan konteks lanjutan?"
            disabled={submitting}
          />
        </label>

        <div className="entity-activity-form-grid">
          {showEmailFields ? (
            <label className="entity-activity-field">
              <span>Subject</span>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setField("subject", e.target.value)}
                placeholder="Subject email"
                disabled={submitting}
              />
            </label>
          ) : null}

          {showEmailFields ? (
            <label className="entity-activity-field">
              <span>Recipients</span>
              <input
                type="text"
                value={form.recipients}
                onChange={(e) => setField("recipients", e.target.value)}
                placeholder="to@brand.com, cc@team.com"
                disabled={submitting}
              />
            </label>
          ) : null}

          {showCallFields ? (
            <label className="entity-activity-field">
              <span>Duration (minutes)</span>
              <input
                type="number"
                min="0"
                value={form.duration_minutes}
                onChange={(e) => setField("duration_minutes", e.target.value)}
                placeholder="15"
                disabled={submitting}
              />
            </label>
          ) : null}

          {(showCallFields || showEmailFields || showMeetingFields) ? (
            <label className="entity-activity-field">
              <span>Outcome</span>
              <input
                type="text"
                value={form.outcome}
                onChange={(e) => setField("outcome", e.target.value)}
                placeholder="Reply pending / booked / need revision"
                disabled={submitting}
              />
            </label>
          ) : null}

          {showMeetingFields ? (
            <label className="entity-activity-field">
              <span>Location / Channel</span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Google Meet / Office / WhatsApp"
                disabled={submitting}
              />
            </label>
          ) : null}
        </div>

        <div className="entity-activity-form-grid">
          <label className="entity-activity-field">
            <span>Tags</span>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setField("tags", e.target.value)}
              placeholder="proposal, q3, urgent"
              disabled={submitting}
            />
          </label>

          <label className="entity-activity-field">
            <span>Visibility</span>
            <select
              value={form.visibility}
              onChange={(e) => setField("visibility", e.target.value)}
              disabled={submitting}
            >
              <option value="team">Team</option>
              <option value="private">Private</option>
            </select>
          </label>
        </div>

        <label className="entity-activity-field">
          <span>Next Step</span>
          <input
            type="text"
            value={form.next_step}
            onChange={(e) => setField("next_step", e.target.value)}
            placeholder="Kirim revised quote besok pagi"
            disabled={submitting}
          />
        </label>

        {allowFollowUp ? (
          <label className="entity-activity-field">
            <span>Next Follow-up</span>
            <input
              type="datetime-local"
              value={form.follow_up_at}
              onChange={(e) => setField("follow_up_at", e.target.value)}
              disabled={submitting}
            />
          </label>
        ) : null}

        <div className="entity-activity-actions">
          <button type="submit" className="cta-button" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Tambah Aktivitas"}
          </button>
        </div>
      </form>

      <div className="entity-activity-filters">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-input"
          placeholder="Cari title, detail, subject, tags, next step"
        />
        <select
          className="text-input"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All activity types</option>
          {ACTIVITY_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="text-input"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
        >
          <option value="all">All channels</option>
          <option value="manual">Manual</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="calendar">Calendar</option>
          <option value="system">System</option>
          <option value="automation">Automation</option>
          <option value="import">Import</option>
        </select>
      </div>

      <div className="entity-activity-list">
        {error ? (
          <p className="entity-activity-empty">Gagal memuat aktivitas.</p>
        ) : loading ? (
          <p className="entity-activity-empty">Memuat aktivitas...</p>
        ) : visibleActivities.length === 0 ? (
          <p className="entity-activity-empty">{emptyTitle}</p>
        ) : (
          visibleActivities.map((activity) => {
            const meta = activity.metadata || {};
            const presentation = getActivityPresentation(activity.activity_type, meta);
            const followUpAt = meta.follow_up_at;
            const tags = Array.isArray(meta.tags) ? meta.tags : [];
            const recipients = Array.isArray(meta.recipients) ? meta.recipients : [];
            return (
              <article key={activity.id} className="entity-activity-item">
                <div className="entity-activity-row">
                  <div className="entity-activity-chip-group">
                    <span className="entity-activity-chip">{presentation.label}</span>
                    <span className="entity-activity-chip entity-activity-chip--soft">
                      {presentation.channel}
                    </span>
                    {meta.direction ? (
                      <span className="entity-activity-chip entity-activity-chip--soft">
                        {meta.direction}
                      </span>
                    ) : null}
                  </div>
                  <span className="entity-activity-time">
                    {fmt.relativeTime(activity.happened_at)}
                  </span>
                </div>
                <h4 className="entity-activity-item-title">{activity.title}</h4>
                {activity.body ? (
                  <p className="entity-activity-item-body">{activity.body}</p>
                ) : null}
                <div className="entity-activity-meta">
                  <span>{fmt.date(activity.happened_at)}</span>
                  {meta.subject ? <span>Subject: {meta.subject}</span> : null}
                  {meta.outcome ? <span>Outcome: {meta.outcome}</span> : null}
                  {meta.duration_minutes ? <span>{meta.duration_minutes} min</span> : null}
                  {meta.location ? <span>{meta.location}</span> : null}
                  {followUpAt ? <span>Follow-up: {fmt.date(followUpAt)}</span> : null}
                  {meta.next_step ? <span>Next: {meta.next_step}</span> : null}
                  {recipients.length > 0 ? <span>{recipients.length} recipient(s)</span> : null}
                </div>
                {tags.length > 0 ? (
                  <div className="entity-activity-chip-group">
                    {tags.map((tag) => (
                      <span key={`${activity.id}-${tag}`} className="entity-activity-chip entity-activity-chip--soft">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
