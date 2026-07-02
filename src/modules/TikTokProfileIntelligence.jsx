import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import { useEntity } from "../lib/useEntity";
import "./TikTokProfileIntelligence.css";
import "../lib/bridge.css";

// Bridge entity options — module-level to ensure stability
const CONTACTS_OPTS = {
  orderBy: "created_at",
  ascending: false,
  autoLoad: false,
};
const CAMPAIGNS_OPTS = { orderBy: "name", ascending: true, autoLoad: false };

const DEFAULT_FORM = {
  handle: "",
  maxItems: 30,
  sorting: "latest",
  excludePinned: false,
  minLikes: 0,
  dateFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
    .toISOString()
    .slice(0, 10),
  dateTo: new Date().toISOString().slice(0, 10),
};

const STAGE_LABELS = {
  starting_actor: "Actor",
  normalizing_profile: "Profile",
  normalizing_videos: "Normalize",
  scoring_videos: "KPI Engine",
  building_summary: "Signal Deck",
  building_workbook: "Workbook",
  completed: "Done",
};

function numberFormat(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function compactNumber(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function percentFormat(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function compactTime(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

function dateFormat(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function BarChart({
  data = [],
  formatValue = (v) => v,
  emptyLabel = "Belum ada data.",
}) {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  if (!data.length) {
    return <div className="tpi-chart-empty">{emptyLabel}</div>;
  }
  return (
    <div className="tpi-chart">
      {data.map((d, index) => (
        <div className="tpi-chart-col" key={`${d.label}-${index}`}>
          <div className="tpi-chart-bar-wrap">
            <span className="tpi-chart-value">{formatValue(d.value)}</span>
            <div
              className="tpi-chart-bar"
              style={{
                height: `${Math.max(4, (Number(d.value) / max) * 100)}%`,
              }}
            />
          </div>
          <span className="tpi-chart-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function TikTokProfileIntelligence() {
  const toast = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [reports, setReports] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Bridge state
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [showCampaignSelect, setShowCampaignSelect] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [bridgeSaving, setBridgeSaving] = useState(false);

  // Bridge hooks
  const { create: createContact } = useEntity("contacts", CONTACTS_OPTS);
  const {
    data: campaigns,
    refresh: loadCampaigns,
    update: updateCampaign,
  } = useEntity("campaigns", CAMPAIGNS_OPTS);

  const loadReports = useEffectEvent(async (selectFirst = false) => {
    setLoadingReports(true);
    try {
      const data = await api.getTikTokProfileReports();
      const nextReports = data.reports || [];
      setReports(nextReports);
      if (selectFirst) {
        const nextId = activeReportId || nextReports[0]?.id || null;
        if (nextId) setActiveReportId(nextId);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingReports(false);
    }
  });

  const loadReportDetail = useEffectEvent(async (reportId, silent = false) => {
    if (!reportId) return;
    if (!silent) setLoadingDetail(true);
    try {
      const data = await api.getTikTokProfileReport(reportId);
      setReportDetail(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      if (!silent) setLoadingDetail(false);
    }
  });

  useEffect(() => {
    loadReports(true);
  }, []);

  useEffect(() => {
    if (!activeReportId) return;
    loadReportDetail(activeReportId);
  }, [activeReportId]);

  useEffect(() => {
    const status = reportDetail?.report?.status;
    if (!activeReportId || !status || !["queued", "running"].includes(status)) {
      return undefined;
    }
    const timer = setInterval(() => {
      loadReportDetail(activeReportId, true);
      loadReports(false);
    }, 3500);
    return () => clearInterval(timer);
  }, [activeReportId, reportDetail?.report?.status]);

  const topItems = useMemo(
    () => (reportDetail?.items || []).slice(0, 5),
    [reportDetail],
  );

  const patternClusters = useMemo(() => {
    const format = new Map();
    const topic = new Map();
    const music = new Map();
    for (const item of reportDetail?.items || []) {
      const ai = item.ai_enrichment || {};
      format.set(ai.contentFormat, (format.get(ai.contentFormat) || 0) + 1);
      topic.set(ai.topicCluster, (topic.get(ai.topicCluster) || 0) + 1);
      music.set(ai.musicCluster, (music.get(ai.musicCluster) || 0) + 1);
    }
    const toSorted = (map) =>
      [...map.entries()]
        .filter(([key]) => Boolean(key))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
    return {
      formats: toSorted(format),
      topics: toSorted(topic),
      music: toSorted(music),
    };
  }, [reportDetail]);

  async function submitRun(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const data = await api.runAutomation("tiktok-profile-intelligence", form);
      setActiveReportId(data.report.id);
      toast.success("Run TikTok dimulai. Dashboard akan terisi otomatis.");
      await loadReports();
      await loadReportDetail(data.report.id);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadReport() {
    if (!reportDetail?.report?.id) return;
    try {
      await api.downloadTikTokProfileReport(
        reportDetail.report.id,
        reportDetail.report.tiktok_handle,
      );
      toast.success("Workbook TikTok berhasil diunduh.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Bridge handlers
  async function confirmSaveContact() {
    const handle = reportDetail?.report?.tiktok_handle || "";
    const name = reportDetail?.profile?.display_name || handle;
    setBridgeSaving(true);
    try {
      await createContact({
        name,
        type: "creator",
        social_handles: { tiktok: handle },
        tags: ["tiktok", "creator"],
        status: "active",
      });
      toast.success("Creator disimpan ke Contacts");
      setShowSaveContact(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBridgeSaving(false);
    }
  }

  function handleOpenCampaignSelect() {
    setShowSaveContact(false);
    setSelectedCampaignId("");
    setShowCampaignSelect(true);
    loadCampaigns();
  }

  async function confirmAssignCampaign() {
    if (!selectedCampaignId || !reportDetail?.report?.id) return;
    setBridgeSaving(true);
    try {
      const campaign = campaigns.find((c) => c.id === selectedCampaignId);
      const current = campaign?.metadata || {};
      const linked = current.linked_reports || [];
      if (!linked.includes(reportDetail.report.id)) {
        await updateCampaign(selectedCampaignId, {
          metadata: {
            ...current,
            linked_reports: [...linked, reportDetail.report.id],
          },
        });
      }
      toast.success("Report ditautkan ke Campaign");
      setShowCampaignSelect(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBridgeSaving(false);
    }
  }

  const report = reportDetail?.report;
  const summary = report?.summary || {};

  return (
    <div className="tpi-shell">
      <aside className="tpi-sidebar">
        <div className="tpi-sidebar-head">
          <span className="tpi-kicker">aikit Intelligence</span>
          <h1 className="tpi-title">TikTok Profile Intelligence</h1>
          <p className="tpi-subtitle">
            Production workspace untuk menarik video TikTok, menghitung KPI
            virality dan intent, lalu menyusun dashboard yang siap dipakai tim
            growth.
          </p>
        </div>

        <form className="tpi-launcher" onSubmit={submitRun}>
          <label className="tpi-field">
            <span>Handle TikTok</span>
            <input
              value={form.handle}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  handle: event.target.value,
                }))
              }
              placeholder="contoh: dr.giovanniabraham"
            />
          </label>

          <div className="tpi-grid-two">
            <label className="tpi-field">
              <span>Max items</span>
              <input
                type="number"
                min="1"
                max="100"
                value={form.maxItems}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    maxItems: Number(event.target.value || 1),
                  }))
                }
              />
            </label>
            <div className="tpi-mini-note">
              <strong>Signal logic</strong>
              <span>
                Skor memprioritaskan share rate, save rate, engagement density,
                dan scale views.
              </span>
            </div>
          </div>

          <div className="tpi-grid-two">
            <label className="tpi-field">
              <span>Urutkan video</span>
              <select
                className="tpi-select"
                value={form.sorting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sorting: event.target.value,
                  }))
                }
              >
                <option value="latest">Terbaru</option>
                <option value="popular">Terpopuler</option>
                <option value="oldest">Terlama</option>
              </select>
            </label>
            <label className="tpi-field">
              <span>Min. likes (opsional)</span>
              <input
                type="number"
                min="0"
                value={form.minLikes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minLikes: Number(event.target.value || 0),
                  }))
                }
                placeholder="0 = semua"
              />
            </label>
          </div>

          <label className="tpi-check">
            <input
              type="checkbox"
              checked={form.excludePinned}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  excludePinned: event.target.checked,
                }))
              }
            />
            <span>Kecualikan pinned posts</span>
          </label>

          <div className="tpi-grid-two">
            <label className="tpi-field">
              <span>Dari tanggal</span>
              <input
                type="date"
                value={form.dateFrom}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dateFrom: event.target.value,
                  }))
                }
              />
            </label>
            <label className="tpi-field">
              <span>Sampai tanggal</span>
              <input
                type="date"
                value={form.dateTo}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dateTo: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <button
            className="cta-button tpi-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Menjalankan..." : "Run TikTok Intelligence"}
          </button>
        </form>

        <div className="tpi-history">
          <div className="tpi-history-head">
            <h2>Report history</h2>
            <span>
              {loadingReports ? "memuat" : `${reports.length} report`}
            </span>
          </div>
          <div className="tpi-history-list">
            {reports.map((entry) => (
              <button
                key={entry.id}
                className={`tpi-history-item ${activeReportId === entry.id ? "tpi-history-item-active" : ""}`}
                type="button"
                onClick={() => setActiveReportId(entry.id)}
              >
                <div className="tpi-history-top">
                  <strong>@{entry.tiktok_handle}</strong>
                  <span className={`tpi-badge tpi-badge-${entry.status}`}>
                    {entry.status}
                  </span>
                </div>
                <div className="tpi-history-meta">
                  <span>{entry.filters?.maxItems || 0} videos</span>
                  <span>{compactTime(entry.created_at)}</span>
                </div>
              </button>
            ))}
            {!loadingReports && reports.length === 0 && (
              <div className="tpi-empty-history">
                Report pertama yang kamu jalankan akan muncul di sini.
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="tpi-main">
        {!reportDetail && (
          <div className="tpi-empty-stage">
            <span className="tpi-kicker">Production vertical ready</span>
            <h2>Run pertama akan membuat signal deck TikTok secara otomatis</h2>
            <p>
              Begitu run berjalan, workspace ini akan mengisi progress actor,
              KPI turunan, top movers, pattern clusters, dan workbook export
              dari satu profil TikTok.
            </p>
          </div>
        )}

        {reportDetail && (
          <>
            {/* Bridge actions — only show when report is complete */}
            {reportDetail?.report?.status === "completed" && (
              <div className="bridge-actions">
                <button
                  type="button"
                  className="bridge-btn"
                  aria-label="Simpan creator ini sebagai kontak"
                  onClick={() => {
                    setShowCampaignSelect(false);
                    setShowSaveContact(true);
                  }}
                >
                  + Simpan sebagai Kontak
                </button>
                <button
                  type="button"
                  className="bridge-btn bridge-btn--secondary"
                  aria-label="Assign report ini ke campaign"
                  onClick={handleOpenCampaignSelect}
                >
                  📋 Assign ke Campaign
                </button>
              </div>
            )}
            {showSaveContact && (
              <div className="bridge-panel">
                <p>
                  Simpan{" "}
                  <strong>
                    {reportDetail?.profile?.display_name ||
                      reportDetail?.report?.tiktok_handle}
                  </strong>{" "}
                  sebagai kreator?
                </p>
                <div className="bridge-panel-actions">
                  <button onClick={confirmSaveContact} disabled={bridgeSaving}>
                    {bridgeSaving ? "Menyimpan..." : "Simpan"}
                  </button>
                  <button onClick={() => setShowSaveContact(false)}>
                    Batal
                  </button>
                </div>
              </div>
            )}
            {showCampaignSelect && (
              <div className="bridge-panel">
                <p>Assign ke Campaign:</p>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  aria-label="Pilih campaign"
                >
                  <option value="">-- Pilih Campaign --</option>
                  {(campaigns || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="bridge-panel-actions">
                  <button
                    onClick={confirmAssignCampaign}
                    disabled={!selectedCampaignId || bridgeSaving}
                  >
                    {bridgeSaving ? "Menyimpan..." : "Assign"}
                  </button>
                  <button onClick={() => setShowCampaignSelect(false)}>
                    Batal
                  </button>
                </div>
              </div>
            )}
            <section className="tpi-command">
              <div className="tpi-command-identity">
                {summary.profilePicUrl ? (
                  <img
                    className="tpi-avatar"
                    src={summary.profilePicUrl}
                    alt={report.tiktok_handle}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="tpi-avatar tpi-avatar-fallback">
                    {report.tiktok_handle?.[0]?.toUpperCase() || "T"}
                  </div>
                )}
                <div>
                  <span className="tpi-kicker">Signal Deck</span>
                  <h2>@{report.tiktok_handle}</h2>
                  <p>
                    {dateFormat(report.date_from)} —{" "}
                    {dateFormat(report.date_to)} ·{" "}
                    {report.filters?.maxItems ||
                      reportDetail.items?.length ||
                      0}{" "}
                    target videos
                  </p>
                  {summary.followerCount ? (
                    <div className="tpi-identity-stats">
                      <span>
                        <strong>{compactNumber(summary.followerCount)}</strong>{" "}
                        followers
                      </span>
                      <span>
                        <strong>{compactNumber(summary.profileLikes)}</strong>{" "}
                        likes
                      </span>
                      <span>
                        <strong>{compactNumber(summary.followingCount)}</strong>{" "}
                        following
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="tpi-command-actions">
                <span className={`tpi-badge tpi-badge-${report.status}`}>
                  {report.status}
                </span>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={downloadReport}
                  disabled={!report.artifact_id}
                  style={{ height: 38 }}
                >
                  Download Workbook
                </button>
              </div>
            </section>

            <section className="tpi-signal-strip">
              <article className="tpi-signal-card">
                <span>Total videos</span>
                <strong>
                  {numberFormat(
                    summary.totalVideosAnalyzed || reportDetail.items?.length,
                  )}
                </strong>
              </article>
              <article className="tpi-signal-card">
                <span>Total views</span>
                <strong>{numberFormat(summary.totalViews)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Avg engagement density</span>
                <strong>
                  {percentFormat(summary.averageViewToEngagementRate)}
                </strong>
              </article>
              <article className="tpi-signal-card">
                <span>Virality score</span>
                <strong>{Number(summary.viralityScore || 0).toFixed(1)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Intent score</span>
                <strong>{Number(summary.intentScore || 0).toFixed(1)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Conversation score</span>
                <strong>
                  {Number(summary.conversationScore || 0).toFixed(1)}
                </strong>
              </article>
            </section>

            <section className="tpi-kpi-strip">
              <article className="tpi-kpi-card">
                <span>Median views</span>
                <strong>{compactNumber(summary.medianViews)}</strong>
                <em>benchmark per video</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Posting cadence</span>
                <strong>
                  {Number(summary.postingCadencePerWeek || 0).toFixed(1)}
                </strong>
                <em>video / minggu</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Breakout rate</span>
                <strong>{Number(summary.breakoutRate || 0).toFixed(0)}%</strong>
                <em>{summary.breakoutCount || 0} video &gt; 2× median</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Consistency</span>
                <strong>
                  {Number(summary.consistencyScore || 0).toFixed(0)}
                </strong>
                <em>stabilitas performa</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Duration sweet spot</span>
                <strong className="tpi-kpi-text">
                  {summary.durationSweetSpot || "-"}
                </strong>
                <em>durasi paling perform</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Best posting window</span>
                <strong className="tpi-kpi-text">
                  {summary.bestPostingWindow || "-"}
                </strong>
                <em>rata-rata views tertinggi</em>
              </article>
            </section>

            {(summary.viewsSeries || []).length > 0 && (
              <section className="tpi-grid-main">
                <div className="tpi-panel">
                  <div className="tpi-panel-head">
                    <h3>Views per video</h3>
                    <span>rank order</span>
                  </div>
                  <BarChart
                    data={summary.viewsSeries.map((d) => ({
                      label: `#${d.rank}`,
                      value: d.views,
                    }))}
                    formatValue={compactNumber}
                  />
                </div>
                <div className="tpi-panel">
                  <div className="tpi-panel-head">
                    <h3>Views by posting window</h3>
                    <span>UTC hour</span>
                  </div>
                  <BarChart
                    data={(summary.hourPerformance || []).map((d) => ({
                      label: d.label,
                      value: d.avgViews,
                    }))}
                    formatValue={compactNumber}
                    emptyLabel="Belum cukup data waktu posting."
                  />
                </div>
              </section>
            )}

            <section className="tpi-grid-main">
              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Run progress</h3>
                  <span>
                    {loadingDetail
                      ? "refreshing"
                      : `${reportDetail.events?.length || 0} events`}
                  </span>
                </div>
                <div className="tpi-stage-list">
                  {(reportDetail.events || []).map((event, index) => (
                    <div
                      className="tpi-stage-item"
                      key={`${event.stage}-${index}`}
                    >
                      <div
                        className={`tpi-stage-dot tpi-stage-dot-${event.status}`}
                      />
                      <div>
                        <strong>
                          {STAGE_LABELS[event.stage] || event.stage}
                        </strong>
                        <p>{event.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Executive summary</h3>
                  <span>{compactTime(report.updated_at)}</span>
                </div>
                <p className="tpi-summary-callout">
                  {summary.executiveSummary ||
                    "Summary akan muncul setelah report selesai."}
                </p>
                <div className="tpi-chip-group">
                  {(summary.winningPatterns || []).map((chip) => (
                    <span className="tpi-chip" key={chip}>
                      {chip}
                    </span>
                  ))}
                  {(summary.topicClusters || []).map((chip) => (
                    <span className="tpi-chip tpi-chip-muted" key={chip}>
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="tpi-board">
              <div className="tpi-panel-head">
                <h3>Top movers</h3>
                <span>{topItems.length} cards</span>
              </div>
              <div className="tpi-top-grid">
                {topItems.map((item) => (
                  <article className="tpi-top-card" key={item.id}>
                    {item.thumbnail_url ? (
                      <div className="tpi-top-thumb">
                        <img
                          src={item.thumbnail_url}
                          alt={`Video #${item.rank_position}`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <span className="tpi-top-rank tpi-top-rank-overlay">
                          #{item.rank_position}
                        </span>
                      </div>
                    ) : (
                      <div className="tpi-top-rank">#{item.rank_position}</div>
                    )}
                    <div className="tpi-top-meta">
                      <span>{dateFormat(item.published_at)}</span>
                      <span>
                        Score {Number(item.top_score || 0).toFixed(1)}
                      </span>
                    </div>
                    <h4>{item.ai_enrichment?.summary || "Top TikTok video"}</h4>
                    <p>{item.caption || "Caption tidak tersedia."}</p>
                    <div className="tpi-stat-row">
                      <span>{numberFormat(item.view_count)} views</span>
                      <span>{numberFormat(item.share_count)} shares</span>
                      <span>{percentFormat(item.save_rate)}</span>
                    </div>
                    <div className="tpi-chip-group">
                      {[
                        item.ai_enrichment?.hookStyle,
                        item.ai_enrichment?.contentFormat,
                        item.ai_enrichment?.topicCluster,
                      ]
                        .filter(Boolean)
                        .map((chip) => (
                          <span className="tpi-chip" key={chip}>
                            {chip}
                          </span>
                        ))}
                    </div>
                    <ul className="tpi-reasons">
                      {(item.ai_enrichment?.reasonsItWorked || []).map(
                        (reason) => (
                          <li key={reason}>{reason}</li>
                        ),
                      )}
                    </ul>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tpi-link"
                    >
                      Open source video
                    </a>
                  </article>
                ))}
              </div>
            </section>

            <section className="tpi-grid-main">
              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Pattern clusters</h3>
                </div>
                <div className="tpi-cluster-group">
                  <div>
                    <span className="tpi-cluster-label">Formats</span>
                    {patternClusters.formats.map(([label, count]) => (
                      <div className="tpi-cluster-row" key={label}>
                        <span>{label}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                  <div>
                    <span className="tpi-cluster-label">Topics</span>
                    {patternClusters.topics.map(([label, count]) => (
                      <div className="tpi-cluster-row" key={label}>
                        <span>{label}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                  <div>
                    <span className="tpi-cluster-label">Music</span>
                    {patternClusters.music.map(([label, count]) => (
                      <div className="tpi-cluster-row" key={label}>
                        <span>{label}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Opportunity queue</h3>
                </div>
                <ul className="tpi-reasons">
                  {(summary.recommendations || []).map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
                <div className="tpi-opportunity-metrics">
                  <div>
                    <span>Dominant format</span>
                    <strong>{summary.dominantFormat || "-"}</strong>
                  </div>
                  <div>
                    <span>Dominant topic</span>
                    <strong>{summary.dominantTopic || "-"}</strong>
                  </div>
                </div>
                {(summary.topHashtags || []).length > 0 && (
                  <>
                    <span
                      className="tpi-cluster-label"
                      style={{ marginTop: 18 }}
                    >
                      Top hashtags
                    </span>
                    <div className="tpi-chip-group">
                      {summary.topHashtags.slice(0, 8).map((h) => (
                        <span className="tpi-chip" key={h.tag}>
                          #{h.tag} · {h.count}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="tpi-panel">
              <div className="tpi-panel-head">
                <h3>Raw explorer</h3>
                <span>{reportDetail.items?.length || 0} rows</span>
              </div>
              <div className="tpi-table-wrap">
                <table className="tpi-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Caption</th>
                      <th>Views</th>
                      <th>Shares</th>
                      <th>Saves</th>
                      <th>Eng. density</th>
                      <th>Top score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportDetail.items || []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.rank_position || "-"}</td>
                        <td>{item.caption || "-"}</td>
                        <td>{numberFormat(item.view_count)}</td>
                        <td>{numberFormat(item.share_count)}</td>
                        <td>{numberFormat(item.save_count)}</td>
                        <td>{percentFormat(item.view_to_engagement_rate)}</td>
                        <td>{Number(item.top_score || 0).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
