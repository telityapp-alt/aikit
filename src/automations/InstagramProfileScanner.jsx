import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";

const PUBLIC_AUTOMATION_SLUG = "instagram-profile-intelligence";
const BACKEND_AUTOMATION_SLUG = "instagram-profiles-brightdata";
const STORED_AUTOMATION_SLUGS = [
  PUBLIC_AUTOMATION_SLUG,
  BACKEND_AUTOMATION_SLUG,
];
const PUBLIC_AUTOMATION_TITLE = "Instagram Profile Intelligence";

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

function formatNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function prettifyLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (value === false) return false;
  if (value === "") return false;
  if (Array.isArray(value)) return value.some((item) => isMeaningfulValue(item));
  if (typeof value === "object") return Object.values(value).some((item) => isMeaningfulValue(item));
  return true;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function isImageUrl(value) {
  return /\.(png|jpe?g|webp|gif|avif|heic)(\?|$)/i.test(String(value || ""));
}

function isVideoUrl(value) {
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(String(value || ""));
}

function MediaLink({ href }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all" }}>
      {href}
    </a>
  );
}

function PrimitiveValue({ value }) {
  if (!isMeaningfulValue(value)) return null;
  if (typeof value === "boolean") return <span>Ya</span>;
  if (typeof value === "number") return <span>{String(value)}</span>;

  const text = String(value);
  if (isVideoUrl(text)) {
    return (
      <div style={{ display: "grid", gap: "10px" }}>
        <video
          controls
          preload="metadata"
          src={text}
          style={{ width: "100%", maxHeight: "360px", borderRadius: "16px", background: "#000" }}
        />
        <MediaLink href={text} />
      </div>
    );
  }

  if (isImageUrl(text)) {
    return (
      <div style={{ display: "grid", gap: "10px" }}>
        <img
          src={text}
          alt=""
          loading="lazy"
          style={{
            width: "100%",
            maxWidth: "360px",
            maxHeight: "360px",
            objectFit: "cover",
            borderRadius: "16px",
            border: "1px solid rgba(15, 23, 42, 0.08)",
          }}
        />
        <MediaLink href={text} />
      </div>
    );
  }

  if (isHttpUrl(text)) {
    return <MediaLink href={text} />;
  }

  return <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text}</div>;
}

function JsonExplorer({ value, label = null, depth = 0 }) {
  const isArray = Array.isArray(value);
  const isObject = value && typeof value === "object" && !isArray;

  if (!isArray && !isObject) {
    if (!isMeaningfulValue(value)) return null;
    return (
      <div style={{ display: "grid", gap: "6px" }}>
        {label ? <strong style={{ fontSize: "12px", opacity: 0.8 }}>{prettifyLabel(label)}</strong> : null}
        <PrimitiveValue value={value} />
      </div>
    );
  }

  const entries = (isArray
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value)).filter(([, entryValue]) => isMeaningfulValue(entryValue));
  if (!entries.length) return null;

  const title = label ? prettifyLabel(label) : isArray ? `Daftar (${entries.length})` : "Detail";
  const openByDefault = depth < 1;

  return (
    <details
      open={openByDefault}
      style={{
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: "18px",
        padding: "12px 14px",
        background: depth % 2 === 0 ? "rgba(255,255,255,0.84)" : "rgba(248,250,252,0.96)",
      }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>
        {title}
      </summary>

      <div
        style={{
          display: "grid",
          gap: "12px",
          marginTop: "12px",
        }}
      >
        {entries.map(([key, entryValue]) => (
          <div
            key={`${title}:${key}`}
            style={{
              display: "grid",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "14px",
              background: "rgba(15, 23, 42, 0.03)",
            }}
          >
            <JsonExplorer
              value={entryValue}
              label={isArray ? `Item ${Number(key) + 1}` : key}
              depth={depth + 1}
            />
          </div>
        ))}
      </div>
    </details>
  );
}

function HistoryItem({ run, selected, onClick }) {
  const summary = run?.output?.summary || {};
  const title = STORED_AUTOMATION_SLUGS.includes(run?.automation_slug)
    ? PUBLIC_AUTOMATION_TITLE
    : run?.title || "Run";

  return (
    <button
      type="button"
      onClick={onClick}
      className="db-activity-item"
      style={{
        width: "100%",
        textAlign: "left",
        border: selected ? "1px solid rgba(37, 99, 235, 0.35)" : "1px solid transparent",
        background: selected ? "rgba(37, 99, 235, 0.05)" : undefined,
        cursor: "pointer",
      }}
    >
      <div className="db-activity-body">
        <div className="db-activity-row">
          <span className="db-activity-title">{title}</span>
          <div className="db-activity-meta">
            <span
              className={`db-chip ${
                run.status === "completed"
                  ? "db-chip-green"
                  : run.status === "failed"
                    ? "db-chip-amber"
                    : "db-chip-blue"
              }`}
            >
              {run.status}
            </span>
          </div>
        </div>
        <p className="db-activity-snippet">
          {formatDateTime(run.created_at)} | {formatNumber(summary.total_profiles)} profil |{" "}
          {formatNumber(summary.total_posts_captured)} post
        </p>
      </div>
    </button>
  );
}

function ProfilePreviewCard({ profile }) {
  const heroImage =
    profile?.profile_image_link ||
    profile?.image_url ||
    profile?.profile_image ||
    null;
  const posts = Array.isArray(profile?.posts) ? profile.posts : [];
  const highlights = Array.isArray(profile?.highlights) ? profile.highlights : [];
  const externalLinks = Array.isArray(profile?.external_url)
    ? profile.external_url
    : profile?.external_url
      ? [profile.external_url]
      : [];

  return (
    <div className="db-settings-card" style={{ padding: "16px", overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: heroImage ? "88px minmax(0, 1fr)" : "minmax(0, 1fr)",
          gap: "14px",
          alignItems: "start",
        }}
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt={profile?.username || "profile"}
            loading="lazy"
            style={{
              width: "88px",
              height: "88px",
              objectFit: "cover",
              borderRadius: "22px",
              border: "1px solid rgba(15, 23, 42, 0.08)",
            }}
          />
        ) : null}

        <div style={{ minWidth: 0 }}>
          <div className="db-activity-row">
            <span className="db-activity-title">
              {profile?.display_name || profile?.full_name || profile?.username || "-"}
            </span>
            <div className="db-activity-meta">
              {profile?.is_verified ? <span className="db-chip db-chip-green">Verified</span> : null}
              {profile?.is_business_account ? <span className="db-chip db-chip-blue">Business</span> : null}
            </div>
          </div>

          <p className="db-activity-snippet" style={{ marginTop: "6px" }}>
            @{profile?.username || "-"} | {formatNumber(profile?.followers)} followers |{" "}
            {formatNumber(profile?.posts_count)} posts
          </p>

          {profile?.biography ? (
            <p className="db-activity-snippet" style={{ marginTop: "8px", whiteSpace: "pre-wrap" }}>
              {profile.biography}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            {externalLinks.length ? (
              <span className="db-chip db-chip-blue">Ada link keluar</span>
            ) : null}
            {profile?.email_address ? <span className="db-chip db-chip-green">Ada email</span> : null}
            {profile?.phone_number ? <span className="db-chip db-chip-blue">Ada nomor</span> : null}
            {profile?.is_private ? <span className="db-chip db-chip-amber">Private</span> : null}
          </div>

          {externalLinks.length ? (
            <div style={{ display: "grid", gap: "6px", marginTop: "10px" }}>
              {externalLinks.map((link) => (
                <div key={link} style={{ fontSize: "12px", minWidth: 0 }}>
                  <MediaLink href={link} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {posts.length ? (
        <div style={{ marginTop: "16px" }}>
          <div className="db-activity-row" style={{ marginBottom: "8px" }}>
            <span className="db-activity-title">Post yang tertangkap</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "10px",
            }}
          >
            {posts.map((post) => (
              <div
                key={post?.id || post?.url}
                style={{
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                {post?.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post?.caption || post?.id || "post"}
                    loading="lazy"
                    style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
                  />
                ) : post?.video_url ? (
                  <video
                    controls
                    preload="metadata"
                    src={post.video_url}
                    style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", background: "#000" }}
                  />
                ) : null}
                <div style={{ padding: "10px" }}>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                    {post?.content_type ? <span className="db-chip db-chip-blue">{post.content_type}</span> : null}
                    {post?.likes ? <span className="db-chip db-chip-green">{formatNumber(post.likes)} likes</span> : null}
                    {post?.comments ? <span className="db-chip db-chip-blue">{formatNumber(post.comments)} komentar</span> : null}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      lineHeight: 1.45,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {post?.caption || post?.content_type || "Post tanpa caption"}
                  </p>
                  {post?.url ? (
                    <div style={{ marginTop: "8px", fontSize: "12px" }}>
                      <MediaLink href={post.url} />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {highlights.length ? (
        <div style={{ marginTop: "16px" }}>
          <div className="db-activity-row" style={{ marginBottom: "8px" }}>
            <span className="db-activity-title">Highlights</span>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {highlights.map((item) => (
              <div key={item?.id || item?.highlight_url} style={{ width: "88px" }}>
                {item?.image ? (
                  <img
                    src={item.image}
                    alt={item?.title || item?.id || "highlight"}
                    loading="lazy"
                    style={{
                      width: "88px",
                      height: "88px",
                      objectFit: "cover",
                      borderRadius: "18px",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                    }}
                  />
                ) : null}
                <div style={{ fontSize: "11px", lineHeight: 1.35, marginTop: "6px" }}>
                  {item?.title || "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function InstagramProfileScanner({ onBack }) {
  const toast = useToast();
  const [urlsText, setUrlsText] = useState("");
  const [limitPerInput, setLimitPerInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentRun, setCurrentRun] = useState(null);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const pollTimerRef = useRef(null);

  const parsed = parseUrlsFromText(urlsText);
  const canRun = parsed.urls.length > 0 && !submitting;

  const runs = [...historyRuns];
  if (currentRun && !runs.some((run) => run.id === currentRun.id)) {
    runs.unshift(currentRun);
  }
  runs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const selectedRun =
    runs.find((run) => run.id === selectedRunId) ||
    currentRun ||
    runs[0] ||
    null;
  const summary = selectedRun?.output?.summary || null;
  const rows = selectedRun?.output?.profiles || [];
  const errors = selectedRun?.output?.errors || [];
  const rawPayload = selectedRun?.output?.raw || selectedRun?.output || null;
  const displayProfiles = Array.isArray(rawPayload)
    ? rawPayload
    : Array.isArray(rawPayload?.data)
      ? rawPayload.data
      : rows;

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (selectedRun?.id) {
      setSelectedRunId(selectedRun.id);
    }
  }, [currentRun?.id]);

  async function loadHistory() {
    try {
      const { runs: storedRuns } = await api.getAutomationFiles();
      const nextRuns = (storedRuns || [])
        .filter((run) => STORED_AUTOMATION_SLUGS.includes(run.automation_slug))
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
        );
      setHistoryRuns(nextRuns);
      setSelectedRunId((current) => current || nextRuns[0]?.id || null);
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function pollRun(runId) {
    try {
      const { run } = await api.getAutomationRunStatus(runId);
      setCurrentRun(run);

      if (run?.status === "running" && run?.output?.snapshot_id) {
        toast.info("Data masih diproses. Run tetap tersimpan dan bisa dicek lagi nanti.");
      }

      if (run?.status === "completed" || run?.status === "failed") {
        await loadHistory();
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

      const { run } = await api.runAutomation(PUBLIC_AUTOMATION_SLUG, payload);
      setCurrentRun(run);
      setSelectedRunId(run.id);
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
          <h1 className="db-view-title">Instagram Profile Intelligence</h1>
          <p className="db-view-sub">
            Jalankan analisis profil Instagram dan buka ulang hasilnya dalam tampilan yang lebih
            rapi, padat, dan enak dibaca.
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
            {parsed.invalid.length ? (
              <span className="db-chip db-chip-amber">{parsed.invalid.length} URL tidak valid</span>
            ) : null}
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
                Status run aktif: {currentRun.status}
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
                    `instagram-profiles-${selectedRun?.id?.slice(0, 8) || "run"}.json`,
                    rawPayload,
                  )
                }
              >
                Unduh data lengkap
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        <div className="db-settings-card">
          <h2 className="db-settings-card-title">History hasil</h2>
          <p className="db-settings-card-sub">
            Semua hasil tersimpan di sini. Klik salah satu run buat buka ulang isi lengkapnya.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {runs.length ? (
              runs.map((run) => (
                <HistoryItem
                  key={run.id}
                  run={run}
                  selected={run.id === selectedRun?.id}
                  onClick={() => setSelectedRunId(run.id)}
                />
              ))
            ) : (
              <div className="db-activity-item">
                <div className="db-activity-body">
                  <div className="db-activity-row">
                    <span className="db-activity-title">Belum ada history</span>
                  </div>
                  <p className="db-activity-snippet">
                    Jalankan automasi dulu, nanti semua session hasil akan muncul di sini.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
          {selectedRun ? (
            <>
              <div className="db-settings-card">
                <h2 className="db-settings-card-title">Session terpilih</h2>
                <p className="db-settings-card-sub">
                  Hasil ini tersimpan dari run tanggal {formatDateTime(selectedRun.created_at)} dan
                  bisa dibuka lagi kapan pun.
                </p>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <span
                    className={`db-chip ${
                      selectedRun.status === "completed"
                        ? "db-chip-green"
                        : selectedRun.status === "failed"
                          ? "db-chip-amber"
                          : "db-chip-blue"
                    }`}
                  >
                    {selectedRun.status}
                  </span>
                  <span className="db-chip db-chip-blue">{PUBLIC_AUTOMATION_TITLE}</span>
                </div>

                {summary ? (
                  <>
                    <div className="db-stats-row">
                      <StatCard label="Profil" value={summary.total_profiles ?? 0} />
                      <StatCard label="Verified" value={summary.verified_profiles ?? 0} />
                      <StatCard label="Business" value={summary.business_profiles ?? 0} />
                      <StatCard label="Punya Email" value={summary.with_email ?? 0} />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "16px",
                        marginTop: "16px",
                      }}
                    >
                      <div className="db-activity-item">
                        <div className="db-activity-body">
                          <div className="db-activity-row">
                            <span className="db-activity-title">Rata-rata followers</span>
                          </div>
                          <p className="db-activity-snippet">
                            {(summary.average_followers ?? 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="db-activity-item">
                        <div className="db-activity-body">
                          <div className="db-activity-row">
                            <span className="db-activity-title">Profil private</span>
                          </div>
                          <p className="db-activity-snippet">{summary.private_profiles ?? 0}</p>
                        </div>
                      </div>
                      <div className="db-activity-item">
                        <div className="db-activity-body">
                          <div className="db-activity-row">
                            <span className="db-activity-title">Punya link keluar</span>
                          </div>
                          <p className="db-activity-snippet">{summary.with_external_url ?? 0}</p>
                        </div>
                      </div>
                      <div className="db-activity-item">
                        <div className="db-activity-body">
                          <div className="db-activity-row">
                            <span className="db-activity-title">Post tertangkap</span>
                          </div>
                          <p className="db-activity-snippet">{summary.total_posts_captured ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {selectedRun.error ? (
                <div className="db-settings-card">
                  <h2 className="db-settings-card-title">Error</h2>
                  <p className="db-settings-card-sub">{selectedRun.error}</p>
                </div>
              ) : null}

              {errors.length ? (
                <div className="db-settings-card">
                  <h2 className="db-settings-card-title">Catatan error parsial</h2>
                  <p className="db-settings-card-sub">
                    Kalau ada data yang gagal di level item, tetap kita simpan dan tampilkan di sini.
                  </p>
                  <JsonExplorer value={errors} label="errors" />
                </div>
              ) : null}

              {displayProfiles.length ? (
                <div className="db-settings-card">
                  <h2 className="db-settings-card-title">Ringkasan profil</h2>
                  <p className="db-settings-card-sub">
                    Bagian ini fokus ke informasi yang benar-benar kepakai. Data teknis lengkap ada
                    di bawah kalau memang dibutuhkan.
                  </p>

                  <div style={{ display: "grid", gap: "16px" }}>
                    {displayProfiles.map((profile) => (
                      <ProfilePreviewCard
                        key={profile?.source_url || profile?.url || profile?.username || profile?.id}
                        profile={profile}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {rawPayload ? (
                <div className="db-settings-card">
                  <h2 className="db-settings-card-title">Data teknis lengkap</h2>
                  <p className="db-settings-card-sub">
                    Semua field tetap disimpan penuh. Bagian ini dipisah supaya tampilan utama tidak
                    penuh noise.
                  </p>
                  <details>
                    <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                      Buka data teknis lengkap
                    </summary>
                    <div style={{ marginTop: "12px" }}>
                      <JsonExplorer value={rawPayload} label="raw_payload" />
                    </div>
                  </details>
                </div>
              ) : null}
            </>
          ) : null}

          {selectedRun?.status === "running" && selectedRun?.output?.snapshot_id ? (
            <div className="db-settings-card">
              <h2 className="db-settings-card-title">Snapshot pending</h2>
              <p className="db-settings-card-sub">
                Sistem mengembalikan `snapshot_id` karena proses belum selesai dalam jalur sinkron.
                Session ini tetap tampil di history.
              </p>
              <JsonExplorer value={selectedRun.output} label="pending_output" />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
