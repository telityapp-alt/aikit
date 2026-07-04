import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";

function normalizeInstagramUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let url = raw;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("instagram.com")) return null;

    parsed.hash = "";
    parsed.search = "";

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (!parts.length) return null;

    return `https://www.instagram.com/${parts[0]}/`;
  } catch {
    return null;
  }
}

function parseUrlsFromText(text) {
  const urls = [];
  const invalid = [];
  const seen = new Set();

  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/^url$/i.test(line)) continue;
    const [firstCell] = line.split(",");
    const normalized = normalizeInstagramUrl(firstCell);
    if (!normalized) {
      invalid.push(line);
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  return { urls, invalid };
}

function StatCard({ label, value }) {
  return (
    <div className="db-stat-card">
      <div className="db-stat-top">
        <span className="db-stat-value">{value}</span>
        <span className="db-stat-label">{label}</span>
      </div>
    </div>
  );
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function InstagramProfilesBrightData({ onBack }) {
  const toast = useToast();
  const [urlsText, setUrlsText] = useState("");
  const [limitPerInput, setLimitPerInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentRun, setCurrentRun] = useState(null);
  const pollTimerRef = useRef(null);

  const parsed = parseUrlsFromText(urlsText);
  const canRun = parsed.urls.length > 0 && !submitting;
  const summary = currentRun?.output?.summary || null;
  const rows = currentRun?.output?.profiles || [];
  const errors = currentRun?.output?.errors || [];
  const rawPayload = currentRun?.output?.raw || null;

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  async function pollRun(runId) {
    try {
      const { run } = await api.getAutomationRunStatus(runId);
      setCurrentRun(run);
      if (run?.status === "running" && run?.output?.snapshot_id) {
        toast.info("Bright Data masih memproses snapshot. Run tetap tersimpan dan bisa dicek lagi nanti.");
        return;
      }
      if (run?.status === "queued" || run?.status === "running") {
        pollTimerRef.current = setTimeout(() => pollRun(runId), 2500);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const nextParsed = parseUrlsFromText(text);
    setUrlsText(nextParsed.urls.join("\n"));

    if (nextParsed.invalid.length) {
      toast.info(`${nextParsed.invalid.length} baris diabaikan karena URL tidak valid.`);
    } else {
      toast.success(`${nextParsed.urls.length} URL dimuat dari file.`);
    }

    event.target.value = "";
  }

  async function submit(event) {
    event.preventDefault();
    if (!parsed.urls.length) {
      toast.error("Masukkan minimal satu URL Instagram yang valid.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        urls: parsed.urls,
        limit_per_input:
          limitPerInput.trim() === "" ? null : Number(limitPerInput.trim()),
      };

      const { run } = await api.runAutomation("instagram-profiles-brightdata", payload);
      setCurrentRun(run);
      toast.info("Run dimulai. Saya pantau statusnya di halaman ini.");
      await pollRun(run.id);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">Instagram Profiles by URL</h1>
          <p className="db-view-sub">
            Masukkan daftar URL profil Instagram, lalu worker akan menjalankan Bright
            Data dan menyimpan hasilnya ke automation dashboard.
          </p>
        </div>
        <button className="ghost-button" onClick={onBack}>
          Kembali ke daftar Automasi
        </button>
      </div>

      <div className="db-settings-card">
        <h2 className="db-settings-card-title">Input</h2>
        <p className="db-settings-card-sub">
          Satu URL per baris. Kamu juga bisa upload CSV dengan kolom `url`.
        </p>

        <form className="db-settings-form" onSubmit={submit}>
          <label className="db-field">
            <span>Daftar URL Instagram</span>
            <textarea
              className="db-field-input"
              value={urlsText}
              onChange={(event) => setUrlsText(event.target.value)}
              rows={8}
              placeholder={`https://www.instagram.com/cats_of_world_/\nhttps://www.instagram.com/dogsofinstagram/`}
              style={{ minHeight: "220px", resize: "vertical" }}
            />
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              alignItems: "end",
            }}
          >
            <label className="db-field">
              <span>Limit per input</span>
              <input
                className="db-field-input"
                inputMode="numeric"
                value={limitPerInput}
                onChange={(event) => setLimitPerInput(event.target.value.replace(/[^\d]/g, ""))}
                placeholder="Kosongkan untuk default dataset"
              />
            </label>

            <label className="db-field">
              <span>Upload CSV</span>
              <input
                className="db-field-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <span className="db-chip db-chip-blue">{parsed.urls.length} URL valid</span>
            <span className="db-chip db-chip-amber">{parsed.invalid.length} invalid</span>
            {currentRun?.status ? (
              <span
                className={`db-chip ${
                  currentRun.status === "completed"
                    ? "db-chip-green"
                    : currentRun.status === "failed"
                      ? "db-chip-amber"
                      : "db-chip-blue"
                }`}
              >
                Status: {currentRun.status}
              </span>
            ) : null}
          </div>

          {parsed.invalid.length ? (
            <div className="db-activity-list" style={{ marginTop: "8px" }}>
              <div className="db-activity-item">
                <div className="db-activity-body">
                  <div className="db-activity-row">
                    <span className="db-activity-title">Baris invalid</span>
                  </div>
                  <p className="db-activity-snippet">{parsed.invalid.slice(0, 5).join(" | ")}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="submit" className="cta-button" disabled={!canRun}>
              {submitting ? "Menjalankan..." : "Jalankan automasi"}
            </button>
            {rawPayload ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  downloadJson(
                    `instagram-profiles-${currentRun?.id?.slice(0, 8) || "run"}.json`,
                    rawPayload,
                  )
                }
              >
                Unduh raw JSON
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {summary ? (
        <>
          <div className="db-stats-row">
            <StatCard label="Profiles" value={summary.total_profiles ?? 0} />
            <StatCard label="Verified" value={summary.verified_profiles ?? 0} />
            <StatCard label="Business" value={summary.business_profiles ?? 0} />
            <StatCard label="With Email" value={summary.with_email ?? 0} />
          </div>

          <div className="db-settings-card">
            <h2 className="db-settings-card-title">Ringkasan hasil</h2>
            <p className="db-settings-card-sub">
              Snapshot cepat dari hasil Bright Data yang sudah dinormalisasi.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              <div className="db-activity-item">
                <div className="db-activity-body">
                  <div className="db-activity-row">
                    <span className="db-activity-title">Average followers</span>
                  </div>
                  <p className="db-activity-snippet">
                    {(summary.average_followers ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="db-activity-item">
                <div className="db-activity-body">
                  <div className="db-activity-row">
                    <span className="db-activity-title">Private profiles</span>
                  </div>
                  <p className="db-activity-snippet">{summary.private_profiles ?? 0}</p>
                </div>
              </div>
              <div className="db-activity-item">
                <div className="db-activity-body">
                  <div className="db-activity-row">
                    <span className="db-activity-title">With external URL</span>
                  </div>
                  <p className="db-activity-snippet">{summary.with_external_url ?? 0}</p>
                </div>
              </div>
              <div className="db-activity-item">
                <div className="db-activity-body">
                  <div className="db-activity-row">
                    <span className="db-activity-title">Posts captured</span>
                  </div>
                  <p className="db-activity-snippet">{summary.total_posts_captured ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {currentRun?.error ? (
        <div className="db-settings-card">
          <h2 className="db-settings-card-title">Error</h2>
          <p className="db-settings-card-sub">{currentRun.error}</p>
        </div>
      ) : null}

      {currentRun?.status === "running" && currentRun?.output?.snapshot_id ? (
        <div className="db-settings-card">
          <h2 className="db-settings-card-title">Snapshot pending</h2>
          <p className="db-settings-card-sub">
            Bright Data mengembalikan `snapshot_id` karena proses belum selesai dalam jalur sync.
            Run ini tetap tersimpan dan bisa dicek lagi dari dashboard.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "12px",
              background: "rgba(15, 23, 42, 0.04)",
              padding: "16px",
              borderRadius: "16px",
              overflow: "auto",
            }}
          >
            {JSON.stringify(currentRun.output, null, 2)}
          </pre>
        </div>
      ) : null}

      {errors.length ? (
        <div className="db-settings-card">
          <h2 className="db-settings-card-title">Partial errors</h2>
          <p className="db-settings-card-sub">
            Bright Data mengembalikan beberapa item error, tapi run tetap menghasilkan output.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "12px",
              background: "rgba(15, 23, 42, 0.04)",
              padding: "16px",
              borderRadius: "16px",
              overflow: "auto",
            }}
          >
            {JSON.stringify(errors.slice(0, 10), null, 2)}
          </pre>
        </div>
      ) : null}

      {rows.length ? (
        <div className="db-settings-card">
          <h2 className="db-settings-card-title">Preview profiles</h2>
          <p className="db-settings-card-sub">
            Menampilkan {Math.min(rows.length, 10)} dari {rows.length} profile yang tersimpan.
          </p>

          <div className="db-activity-list">
            {rows.slice(0, 10).map((profile) => (
              <div className="db-activity-item" key={profile.source_url || profile.username}>
                <div className="db-activity-body">
                  <div className="db-activity-row">
                    <span className="db-activity-title">
                      {profile.display_name || profile.full_name || profile.username || "-"}
                    </span>
                    <div className="db-activity-meta">
                      {profile.is_verified ? (
                        <span className="db-chip db-chip-green">Verified</span>
                      ) : null}
                      {profile.is_business_account ? (
                        <span className="db-chip db-chip-blue">Business</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="db-activity-snippet">
                    @{profile.username || "-"} | Followers:{" "}
                    {(profile.followers || 0).toLocaleString()} | Posts:{" "}
                    {(profile.posts_count || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
