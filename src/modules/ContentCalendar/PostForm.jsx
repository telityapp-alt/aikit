import { useState, useEffect } from "react";
import { fmt } from "../../lib/format.js";
import { useToast } from "../../lib/ToastContext.jsx";

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter/X" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Lainnya" },
];

const STATUS_OPTIONS = [
  { value: "idea", label: "Ide" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Terjadwal" },
  { value: "published", label: "Terbit" },
  { value: "cancelled", label: "Dibatalkan" },
];

function dateTimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function buildInitial(post, prefilledStatus, prefilledDate) {
  if (!post) {
    return {
      platform: "instagram",
      status: prefilledStatus || "idea",
      title: "",
      body: "",
      campaign_id: "",
      scheduled_at: prefilledDate ? dateTimeLocalValue(prefilledDate) : "",
      published_at: "",
      tags: [],
      media_urls: [""],
    };
  }
  return {
    platform: post.platform ?? "instagram",
    status: post.status ?? "idea",
    title: post.title ?? "",
    body: post.body ?? "",
    campaign_id: post.campaign_id ?? "",
    scheduled_at: dateTimeLocalValue(post.scheduled_at),
    published_at: dateTimeLocalValue(post.published_at),
    tags: Array.isArray(post.tags) ? [...post.tags] : [],
    media_urls:
      Array.isArray(post.media_urls) && post.media_urls.length > 0
        ? [...post.media_urls]
        : [""],
  };
}

export default function PostForm({
  post,
  campaigns,
  onCreate,
  onUpdate,
  onCancel,
  prefilledStatus,
  prefilledDate,
}) {
  const toast = useToast();
  const isEdit = Boolean(post);

  const [fields, setFields] = useState(() =>
    buildInitial(post, prefilledStatus, prefilledDate)
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setFields(buildInitial(post, prefilledStatus, prefilledDate));
    setErrors({});
  }, [post?.id, prefilledStatus, prefilledDate]);

  function set(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  }

  function validate() {
    const errs = {};
    if (fields.status === "scheduled" && !fields.scheduled_at) {
      errs.scheduled_at = "Tanggal terjadwal wajib diisi untuk status Terjadwal.";
    }
    const cleanUrls = fields.media_urls.filter((u) => u.trim() !== "");
    if (cleanUrls.length !== fields.media_urls.filter((u) => u !== "").length) {
      errs.media_urls = "URL media tidak boleh hanya spasi.";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        platform: fields.platform,
        status: fields.status,
        title: fields.title || null,
        body: fields.body || null,
        campaign_id: fields.campaign_id || null,
        scheduled_at: fields.scheduled_at || null,
        published_at: fields.published_at || null,
        tags: fields.tags,
        media_urls: fields.media_urls.filter((u) => u.trim() !== ""),
      };

      if (isEdit) {
        await onUpdate(post.id, payload);
        toast.success("Post berhasil diperbarui.");
      } else {
        await onCreate(payload);
        toast.success("Post berhasil dibuat.");
      }
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !fields.tags.includes(trimmed)) {
      set("tags", [...fields.tags, trimmed]);
      setTagInput("");
    }
  }

  function removeTag(tag) {
    set(
      "tags",
      fields.tags.filter((t) => t !== tag)
    );
  }

  function handleTagKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  function addMediaUrl() {
    set("media_urls", [...fields.media_urls, ""]);
  }

  function removeMediaUrl(idx) {
    set(
      "media_urls",
      fields.media_urls.filter((_, i) => i !== idx)
    );
  }

  function setMediaUrl(idx, value) {
    const updated = [...fields.media_urls];
    updated[idx] = value;
    set("media_urls", updated);
  }

  return (
    <div className="cc-form-wrap">
      <h2 className="cc-form-title">{isEdit ? "Edit Post" : "Buat Post Baru"}</h2>
      <form className="cc-form" onSubmit={handleSubmit}>
        <div className="cc-form-row">
          <label htmlFor="cc-platform" className="cc-form-label">
            Platform
          </label>
          <select
            id="cc-platform"
            className="cc-form-select"
            value={fields.platform}
            onChange={(e) => set("platform", e.target.value)}
          >
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="cc-form-row">
          <label htmlFor="cc-status" className="cc-form-label">
            Status
          </label>
          <select
            id="cc-status"
            className="cc-form-select"
            value={fields.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.status && <p className="cc-form-error">{errors.status}</p>}
        </div>

        <div className="cc-form-row">
          <label htmlFor="cc-title" className="cc-form-label">
            Judul (opsional)
          </label>
          <input
            id="cc-title"
            type="text"
            className="cc-form-input"
            value={fields.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Judul post..."
          />
        </div>

        <div className="cc-form-row">
          <label htmlFor="cc-body" className="cc-form-label">
            Caption / Konten (opsional)
          </label>
          <textarea
            id="cc-body"
            className="cc-form-textarea"
            value={fields.body}
            onChange={(e) => set("body", e.target.value)}
            placeholder="Tulis caption atau konten post..."
            rows={5}
          />
        </div>

        <div className="cc-form-row">
          <label htmlFor="cc-campaign" className="cc-form-label">
            Campaign (opsional)
          </label>
          <select
            id="cc-campaign"
            className="cc-form-select"
            value={fields.campaign_id}
            onChange={(e) => set("campaign_id", e.target.value)}
          >
            <option value="">Tanpa Campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {fields.status === "scheduled" && (
          <div className="cc-form-row">
            <label htmlFor="cc-scheduled" className="cc-form-label">
              Tanggal Terjadwal *
            </label>
            <input
              id="cc-scheduled"
              type="datetime-local"
              className="cc-form-input"
              value={fields.scheduled_at}
              onChange={(e) => set("scheduled_at", e.target.value)}
            />
            {errors.scheduled_at && (
              <p className="cc-form-error">{errors.scheduled_at}</p>
            )}
          </div>
        )}

        {fields.status === "published" && (
          <div className="cc-form-row">
            <label htmlFor="cc-published" className="cc-form-label">
              Tanggal Terbit (opsional)
            </label>
            <input
              id="cc-published"
              type="datetime-local"
              className="cc-form-input"
              value={fields.published_at}
              onChange={(e) => set("published_at", e.target.value)}
            />
          </div>
        )}

        <div className="cc-form-row">
          <label htmlFor="cc-tag-input" className="cc-form-label">
            Tags
          </label>
          <div className="cc-tags-wrap">
            {fields.tags.map((tag) => (
              <span key={tag} className="cc-tag-chip">
                {tag}
                <button
                  type="button"
                  className="cc-tag-remove"
                  onClick={() => removeTag(tag)}
                  aria-label={`Hapus tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            id="cc-tag-input"
            type="text"
            className="cc-form-input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            placeholder="Ketik tag lalu tekan Enter atau koma..."
          />
        </div>

        <div className="cc-form-row">
          <label className="cc-form-label">Media URLs (opsional)</label>
          {fields.media_urls.map((url, idx) => (
            <div key={idx} className="cc-media-url-row">
              <input
                type="text"
                className="cc-form-input"
                value={url}
                onChange={(e) => setMediaUrl(idx, e.target.value)}
                placeholder="https://..."
              />
              {fields.media_urls.length > 1 && (
                <button
                  type="button"
                  className="cc-media-remove"
                  onClick={() => removeMediaUrl(idx)}
                  aria-label="Hapus URL"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="cc-media-add"
            onClick={addMediaUrl}
          >
            + Tambah URL
          </button>
          {errors.media_urls && (
            <p className="cc-form-error">{errors.media_urls}</p>
          )}
        </div>

        <div className="cc-form-actions">
          <button
            type="submit"
            className="cc-button cc-button--primary"
            disabled={submitting}
          >
            {submitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Post"}
          </button>
          <button
            type="button"
            className="cc-button"
            onClick={onCancel}
            disabled={submitting}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
