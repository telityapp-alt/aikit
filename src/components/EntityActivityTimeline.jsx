import { useEffect, useState } from "react";
import { fmt } from "../lib/format";
import { useEntity } from "../lib/useEntity";
import { useToast } from "../lib/ToastContext";

const ACTIVITY_TYPES = [
  { value: "note", label: "Catatan" },
  { value: "call", label: "Panggilan" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
];

const ACTIVITY_TYPE_LABEL = Object.fromEntries(
  ACTIVITY_TYPES.map((item) => [item.value, item.label]),
);

function toDateTimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function buildInitial(entityLabel) {
  return {
    activity_type: "note",
    title: "",
    body: "",
    happened_at: toDateTimeLocal(new Date()),
    follow_up_at: "",
    entityLabel,
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(buildInitial(entityLabel));
  }, [entityId, entityLabel]);

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

    const payload = {
      entity_type: entityType,
      entity_id: entityId,
      activity_type: form.activity_type,
      title: form.title.trim(),
      body: form.body.trim() || null,
      happened_at: form.happened_at || new Date().toISOString(),
      metadata: form.follow_up_at ? { follow_up_at: form.follow_up_at } : {},
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

  return (
    <div className="entity-activity">
      <div className="entity-activity-header">
        <h3 className="entity-activity-title">Timeline Aktivitas</h3>
        <p className="entity-activity-sub">
          Simpan jejak kerja, follow-up, dan konteks penting untuk {entityLabel}.
        </p>
      </div>

      <form className="entity-activity-form" onSubmit={handleSubmit}>
        <div className="entity-activity-form-grid">
          <label className="entity-activity-field">
            <span>Tipe</span>
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
            <span>Waktu</span>
            <input
              type="datetime-local"
              value={form.happened_at}
              onChange={(e) => setField("happened_at", e.target.value)}
              disabled={submitting}
            />
          </label>
        </div>

        <label className="entity-activity-field">
          <span>Judul</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Contoh: Follow-up brief campaign"
            disabled={submitting}
          />
        </label>

        <label className="entity-activity-field">
          <span>Detail</span>
          <textarea
            rows={3}
            value={form.body}
            onChange={(e) => setField("body", e.target.value)}
            placeholder="Apa yang dibahas atau perlu diingat?"
            disabled={submitting}
          />
        </label>

        {allowFollowUp && (
          <label className="entity-activity-field">
            <span>Next Follow-up</span>
            <input
              type="datetime-local"
              value={form.follow_up_at}
              onChange={(e) => setField("follow_up_at", e.target.value)}
              disabled={submitting}
            />
          </label>
        )}

        <div className="entity-activity-actions">
          <button
            type="submit"
            className="cta-button"
            disabled={submitting}
          >
            {submitting ? "Menyimpan..." : "Tambah Aktivitas"}
          </button>
        </div>
      </form>

      <div className="entity-activity-list">
        {error ? (
          <p className="entity-activity-empty">Gagal memuat aktivitas.</p>
        ) : loading ? (
          <p className="entity-activity-empty">Memuat aktivitas...</p>
        ) : activities.length === 0 ? (
          <p className="entity-activity-empty">{emptyTitle}</p>
        ) : (
          activities.map((activity) => {
            const followUpAt = activity.metadata?.follow_up_at;
            return (
              <article key={activity.id} className="entity-activity-item">
                <div className="entity-activity-row">
                  <span className="entity-activity-chip">
                    {ACTIVITY_TYPE_LABEL[activity.activity_type] ?? activity.activity_type}
                  </span>
                  <span className="entity-activity-time">
                    {fmt.relativeTime(activity.happened_at)}
                  </span>
                </div>
                <h4 className="entity-activity-item-title">{activity.title}</h4>
                {activity.body && (
                  <p className="entity-activity-item-body">{activity.body}</p>
                )}
                <div className="entity-activity-meta">
                  <span>{fmt.date(activity.happened_at)}</span>
                  {followUpAt ? <span>Follow-up: {fmt.date(followUpAt)}</span> : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
