import { useState, useEffect } from "react";
import { useToast } from "../../lib/ToastContext.jsx";

const TYPE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Pelanggan" },
  { value: "vendor", label: "Vendor" },
  { value: "creator", label: "Kreator" },
  { value: "competitor", label: "Kompetitor" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak Aktif" },
  { value: "archived", label: "Diarsipkan" },
];

function validateEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildInitialForm(contact) {
  if (!contact) {
    return {
      name: "",
      type: "lead",
      status: "active",
      email: "",
      phone: "",
      company: "",
      notes: "",
      tags: [],
      social_handles: [{ platform: "", handle: "" }],
    };
  }
  const handles = contact.social_handles && Object.keys(contact.social_handles).length > 0
    ? Object.entries(contact.social_handles).map(([platform, handle]) => ({ platform, handle }))
    : [{ platform: "", handle: "" }];
  return {
    name: contact.name || "",
    type: contact.type || "lead",
    status: contact.status || "active",
    email: contact.email || "",
    phone: contact.phone || "",
    company: contact.company || "",
    notes: contact.notes || "",
    tags: Array.isArray(contact.tags) ? [...contact.tags] : [],
    social_handles: handles,
  };
}

export default function ContactForm({ contact, onCreate, onUpdate, onCancel, submitting, setSubmitting }) {
  const toast = useToast();
  const [form, setForm] = useState(() => buildInitialForm(contact));
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setForm(buildInitialForm(contact));
    setErrors({});
    setTagInput("");
  }, [contact]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Nama wajib diisi.";
    if (form.email && !validateEmail(form.email)) next.email = "Format email tidak valid.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Tags
  function commitTag() {
    const raw = tagInput.trim().replace(/,+$/, "").trim();
    if (!raw) { setTagInput(""); return; }
    const newTags = raw.split(",").map((t) => t.trim()).filter(Boolean);
    const merged = [...new Set([...form.tags, ...newTags])];
    setField("tags", merged);
    setTagInput("");
  }

  function handleTagKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTag();
    } else if (e.key === "Backspace" && tagInput === "" && form.tags.length > 0) {
      setField("tags", form.tags.slice(0, -1));
    }
  }

  function removeTag(index) {
    setField("tags", form.tags.filter((_, i) => i !== index));
  }

  // Social handles
  function setSocialField(index, key, value) {
    const next = form.social_handles.map((row, i) =>
      i === index ? { ...row, [key]: value } : row
    );
    setField("social_handles", next);
  }

  function addSocialRow() {
    setField("social_handles", [...form.social_handles, { platform: "", handle: "" }]);
  }

  function removeSocialRow(index) {
    const next = form.social_handles.filter((_, i) => i !== index);
    setField("social_handles", next.length === 0 ? [{ platform: "", handle: "" }] : next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const socialObj = {};
    for (const row of form.social_handles) {
      if (row.platform.trim() && row.handle.trim()) {
        socialObj[row.platform.trim()] = row.handle.trim();
      }
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      notes: form.notes.trim() || null,
      tags: form.tags,
      social_handles: socialObj,
    };

    setSubmitting(true);
    try {
      if (contact) {
        await onUpdate(contact.id, payload);
        toast.success("Kontak berhasil diperbarui.");
      } else {
        await onCreate(payload);
        toast.success("Kontak berhasil ditambahkan.");
      }
    } catch {
      toast.error("Gagal menyimpan kontak. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="cm-form" onSubmit={handleSubmit} noValidate>
      {/* Name */}
      <div className="cm-form-field">
        <label className="cm-form-label" htmlFor="cm-name">
          Nama <span className="cm-form-required" aria-hidden="true">*</span>
        </label>
        <input
          id="cm-name"
          type="text"
          className={`cm-form-input${errors.name ? " cm-form-input--error" : ""}`}
          placeholder="Nama lengkap atau nama perusahaan"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          disabled={submitting}
          autoComplete="off"
          aria-required="true"
          aria-describedby={errors.name ? "cm-name-err" : undefined}
        />
        {errors.name && <span id="cm-name-err" className="cm-form-error" role="alert">{errors.name}</span>}
      </div>

      {/* Type + Status row */}
      <div className="cm-form-row">
        <div className="cm-form-field">
          <label className="cm-form-label" htmlFor="cm-type">Tipe</label>
          <select
            id="cm-type"
            className="cm-form-input cm-form-select"
            value={form.type}
            onChange={(e) => setField("type", e.target.value)}
            disabled={submitting}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="cm-form-field">
          <label className="cm-form-label" htmlFor="cm-status">Status</label>
          <select
            id="cm-status"
            className="cm-form-input cm-form-select"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
            disabled={submitting}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Email */}
      <div className="cm-form-field">
        <label className="cm-form-label" htmlFor="cm-email">Email</label>
        <input
          id="cm-email"
          type="email"
          className={`cm-form-input${errors.email ? " cm-form-input--error" : ""}`}
          placeholder="email@contoh.com"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          disabled={submitting}
          autoComplete="off"
          aria-describedby={errors.email ? "cm-email-err" : undefined}
        />
        {errors.email && <span id="cm-email-err" className="cm-form-error" role="alert">{errors.email}</span>}
      </div>

      {/* Phone */}
      <div className="cm-form-field">
        <label className="cm-form-label" htmlFor="cm-phone">Telepon</label>
        <input
          id="cm-phone"
          type="tel"
          className="cm-form-input"
          placeholder="+62 812 3456 7890"
          value={form.phone}
          onChange={(e) => setField("phone", e.target.value)}
          disabled={submitting}
          autoComplete="off"
        />
      </div>

      {/* Company */}
      <div className="cm-form-field">
        <label className="cm-form-label" htmlFor="cm-company">Perusahaan</label>
        <input
          id="cm-company"
          type="text"
          className="cm-form-input"
          placeholder="Nama perusahaan atau brand"
          value={form.company}
          onChange={(e) => setField("company", e.target.value)}
          disabled={submitting}
          autoComplete="off"
        />
      </div>

      {/* Tags */}
      <div className="cm-form-field">
        <label className="cm-form-label" htmlFor="cm-tags">Tag</label>
        <div className="cm-tags-input-wrap" aria-label="Input tag">
          {form.tags.map((tag, i) => (
            <span key={i} className="cm-tag-chip">
              {tag}
              <button
                type="button"
                className="cm-tag-chip-remove"
                aria-label={`Hapus tag ${tag}`}
                onClick={() => removeTag(i)}
                disabled={submitting}
              >
                ×
              </button>
            </span>
          ))}
          <input
            id="cm-tags"
            type="text"
            className="cm-tags-input"
            placeholder={form.tags.length === 0 ? "Ketik lalu tekan Enter atau koma…" : "Tambah tag…"}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={commitTag}
            disabled={submitting}
            aria-label="Tambah tag baru"
          />
        </div>
      </div>

      {/* Social handles */}
      <div className="cm-form-field">
        <span className="cm-form-label">Media Sosial</span>
        <div className="cm-social-rows">
          {form.social_handles.map((row, i) => (
            <div key={i} className="cm-social-row">
              <input
                type="text"
                className="cm-form-input cm-social-platform"
                placeholder="Platform (mis. tiktok)"
                value={row.platform}
                onChange={(e) => setSocialField(i, "platform", e.target.value)}
                disabled={submitting}
                aria-label={`Platform media sosial baris ${i + 1}`}
              />
              <input
                type="text"
                className="cm-form-input cm-social-handle"
                placeholder="@handle"
                value={row.handle}
                onChange={(e) => setSocialField(i, "handle", e.target.value)}
                disabled={submitting}
                aria-label={`Handle media sosial baris ${i + 1}`}
              />
              <button
                type="button"
                className="cm-social-remove"
                aria-label={`Hapus baris media sosial ${i + 1}`}
                onClick={() => removeSocialRow(i)}
                disabled={submitting}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="cm-social-add-btn"
            onClick={addSocialRow}
            disabled={submitting}
          >
            + Tambah platform
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="cm-form-field">
        <label className="cm-form-label" htmlFor="cm-notes">Catatan</label>
        <textarea
          id="cm-notes"
          className="cm-form-textarea"
          placeholder="Catatan tambahan tentang kontak ini…"
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          disabled={submitting}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="cm-form-actions">
        <button
          type="button"
          className="ghost-button"
          onClick={onCancel}
          disabled={submitting}
        >
          Batal
        </button>
        <button
          type="submit"
          className="cta-button"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? "Menyimpan…" : contact ? "Simpan Perubahan" : "Tambah Kontak"}
        </button>
      </div>
    </form>
  );
}
