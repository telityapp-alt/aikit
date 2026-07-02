import { useState, useEffect } from "react";
import { fmt } from "../../lib/format";
import { useToast } from "../../lib/ToastContext";

const OBJECTIVE_SUGGESTIONS = [
  "Awareness",
  "Konversi",
  "Retensi",
  "Engagement",
  "Brand Building",
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Aktif" },
  { value: "paused", label: "Dijeda" },
  { value: "completed", label: "Selesai" },
  { value: "archived", label: "Arsip" },
];

const CURRENCY_OPTIONS = [
  { value: "IDR", label: "IDR — Rupiah" },
  { value: "USD", label: "USD — Dolar" },
];

function buildInitial(campaign) {
  if (!campaign) {
    return {
      name: "",
      objective: "",
      status: "draft",
      start_date: "",
      end_date: "",
      budget: "",
      currency: "IDR",
      notes: "",
    };
  }
  return {
    name: campaign.name ?? "",
    objective: campaign.objective ?? "",
    status: campaign.status ?? "draft",
    start_date: fmt.dateInput(campaign.start_date),
    end_date: fmt.dateInput(campaign.end_date),
    budget: campaign.budget != null ? String(campaign.budget) : "",
    currency: campaign.currency ?? "IDR",
    notes: campaign.notes ?? "",
  };
}

export default function CampaignForm({ campaign, onCreate, onUpdate, onCancel }) {
  const toast = useToast();
  const isEdit = Boolean(campaign);

  const [fields, setFields] = useState(() => buildInitial(campaign));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Re-seed when the campaign prop changes (switching from create to edit).
  useEffect(() => {
    setFields(buildInitial(campaign));
    setErrors({});
  }, [campaign?.id]);

  function set(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  }

  function validate() {
    const errs = {};
    if (!fields.name.trim()) {
      errs.name = "Nama campaign wajib diisi.";
    }
    if (fields.start_date && fields.end_date && fields.end_date < fields.start_date) {
      errs.end_date = "Tanggal selesai harus sama atau sesudah tanggal mulai.";
    }
    if (fields.budget !== "" && Number(fields.budget) < 0) {
      errs.budget = "Budget tidak boleh negatif.";
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

    const payload = {
      name: fields.name.trim(),
      objective: fields.objective.trim() || null,
      status: fields.status,
      start_date: fields.start_date || null,
      end_date: fields.end_date || null,
      budget: fields.budget !== "" ? Number(fields.budget) : null,
      currency: fields.currency,
      notes: fields.notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await onUpdate(campaign.id, payload);
        toast.success("Campaign berhasil diperbarui.");
      } else {
        await onCreate(payload);
        toast.success("Campaign berhasil dibuat.");
      }
    } catch (err) {
      toast.error(err?.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="cgm-detail-inner">
      <div className="db-view-header">
        <h1 className="db-view-title">
          {isEdit ? "Edit Campaign" : "Buat Campaign Baru"}
        </h1>
        <p className="db-view-sub">
          {isEdit
            ? "Perbarui detail campaign di bawah ini."
            : "Isi detail untuk membuat campaign baru."}
        </p>
      </div>

      <form className="cgm-form" onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div className="cgm-form-row">
          <label className="cgm-form-label" htmlFor="cgm-name">
            Nama Campaign <span className="cgm-form-required">*</span>
          </label>
          <input
            id="cgm-name"
            type="text"
            className="cgm-form-input"
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Contoh: Kampanye Ramadan 2025"
            aria-required="true"
            aria-describedby={errors.name ? "cgm-name-err" : undefined}
          />
          {errors.name && (
            <span id="cgm-name-err" className="cgm-form-error" role="alert">
              {errors.name}
            </span>
          )}
        </div>

        {/* Objective */}
        <div className="cgm-form-row">
          <label className="cgm-form-label" htmlFor="cgm-objective">
            Tujuan Campaign
          </label>
          <input
            id="cgm-objective"
            type="text"
            list="cgm-objective-suggestions"
            className="cgm-form-input"
            value={fields.objective}
            onChange={(e) => set("objective", e.target.value)}
            placeholder="Contoh: Awareness, Konversi..."
          />
          <datalist id="cgm-objective-suggestions">
            {OBJECTIVE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {/* Status */}
        <div className="cgm-form-row">
          <label className="cgm-form-label" htmlFor="cgm-status">
            Status
          </label>
          <select
            id="cgm-status"
            className="cgm-form-select"
            value={fields.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="cgm-form-row-split">
          <div className="cgm-form-row">
            <label className="cgm-form-label" htmlFor="cgm-start-date">
              Tanggal Mulai
            </label>
            <input
              id="cgm-start-date"
              type="date"
              className="cgm-form-input"
              value={fields.start_date}
              onChange={(e) => set("start_date", e.target.value)}
            />
          </div>
          <div className="cgm-form-row">
            <label className="cgm-form-label" htmlFor="cgm-end-date">
              Tanggal Selesai
            </label>
            <input
              id="cgm-end-date"
              type="date"
              className="cgm-form-input"
              value={fields.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              aria-describedby={errors.end_date ? "cgm-end-date-err" : undefined}
            />
            {errors.end_date && (
              <span id="cgm-end-date-err" className="cgm-form-error" role="alert">
                {errors.end_date}
              </span>
            )}
          </div>
        </div>

        {/* Budget + Currency */}
        <div className="cgm-form-row-split">
          <div className="cgm-form-row">
            <label className="cgm-form-label" htmlFor="cgm-budget">
              Budget
            </label>
            <input
              id="cgm-budget"
              type="number"
              min="0"
              step="1000"
              className="cgm-form-input"
              value={fields.budget}
              onChange={(e) => set("budget", e.target.value)}
              placeholder="0"
              aria-describedby={errors.budget ? "cgm-budget-err" : undefined}
            />
            {errors.budget && (
              <span id="cgm-budget-err" className="cgm-form-error" role="alert">
                {errors.budget}
              </span>
            )}
          </div>
          <div className="cgm-form-row">
            <label className="cgm-form-label" htmlFor="cgm-currency">
              Mata Uang
            </label>
            <select
              id="cgm-currency"
              className="cgm-form-select"
              value={fields.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="cgm-form-row">
          <label className="cgm-form-label" htmlFor="cgm-notes">
            Catatan
          </label>
          <textarea
            id="cgm-notes"
            className="cgm-form-textarea"
            value={fields.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Catatan tambahan tentang campaign ini..."
            rows={4}
          />
        </div>

        {/* Actions */}
        <div className="cgm-form-actions">
          <button
            type="submit"
            className="cgm-button cgm-form-submit"
            disabled={submitting}
          >
            {submitting
              ? isEdit
                ? "Menyimpan..."
                : "Membuat..."
              : isEdit
              ? "Simpan Perubahan"
              : "Buat Campaign"}
          </button>
          <button
            type="button"
            className="cgm-button"
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
