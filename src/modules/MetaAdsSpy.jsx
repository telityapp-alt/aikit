import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import { useEntity } from "../lib/useEntity";
import "./TikTokProfileIntelligence.css";
import "./TikTokAdsSpy.css";
import "./MetaAdsSpy.css";
import "../lib/bridge.css";

// Bridge entity options — module-level to ensure stability
const CAMPAIGNS_OPTS = { orderBy: "name", ascending: true, autoLoad: false };

const DEFAULT_FORM = {
  query: "",
  country: "ID",
  activeStatus: "all",
  mediaType: "all",
  adType: "all",
  searchType: "keyword_unordered",
  count: 50,
  mode: "full",
  startUrl: "",
  dateFrom: "",
  dateTo: "",
};

const STAGE_LABELS = {
  starting_actor: "Actor",
  normalizing_ads: "Normalize",
  scoring_ads: "KPI Engine",
  building_summary: "Signal Deck",
  building_workbook: "Workbook",
  completed: "Done",
};

function numberFormat(v) {
  return Number(v || 0).toLocaleString("id-ID");
}
function compactNumber(v) {
  const n = Number(v || 0);
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
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
  if (!data.length) return <div className="tpi-chart-empty">{emptyLabel}</div>;
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

function ClusterList({
  rows = [],
  labelKey,
  valueKey,
  formatValue = numberFormat,
  emptyLabel = "Belum ada data.",
}) {
  if (!rows.length) return <div className="tpi-chart-empty">{emptyLabel}</div>;
  return (
    <div style={{ marginTop: 8 }}>
      {rows.map((r, i) => (
        <div className="tpi-cluster-row" key={`${r[labelKey]}-${i}`}>
          <span>{r[labelKey] || "-"}</span>
          <strong>{formatValue(r[valueKey])}</strong>
        </div>
      ))}
    </div>
  );
}

export default function MetaAdsSpy() {
  const toast = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reports, setReports] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Bridge state
  const [showCampaignSelect, setShowCampaignSelect] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [bridgeSaving, setBridgeSaving] = useState(false);

  // Bridge hooks
  const {
    data: campaigns,
    refresh: loadCampaigns,
    update: updateCampaign,
  } = useEntity("campaigns", CAMPAIGNS_OPTS);

  const loadReports = useEffectEvent(async (selectFirst = false) => {
    setLoadingReports(true);
    try {
      const data = await api.getMetaAdsReports();
      const next = data.reports || [];
      setReports(next);
      if (selectFirst) {
        const id = activeReportId || next[0]?.id || null;
        if (id) setActiveReportId(id);
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
      setReportDetail(await api.getMetaAdsReport(reportId));
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
    if (activeReportId) loadReportDetail(activeReportId);
  }, [activeReportId]);
  useEffect(() => {
    const status = reportDetail?.report?.status;
    if (!activeReportId || !status || !["queued", "running"].includes(status))
      return undefined;
    const timer = setInterval(() => {
      loadReportDetail(activeReportId, true);
      loadReports(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeReportId, reportDetail?.report?.status]);

  const topAds = useMemo(
    () => (reportDetail?.items || []).slice(0, 6),
    [reportDetail],
  );

  async function submitRun(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const data = await api.runAutomation("meta-ads-spy", form);
      setActiveReportId(data.report.id);
      toast.success(
        "Run Meta Ads Spy dimulai. Dashboard akan terisi otomatis.",
      );
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
      await api.downloadMetaAdsReport(
        reportDetail.report.id,
        (reportDetail.report.query || "report").slice(0, 30),
      );
      toast.success("Workbook Meta Ads berhasil diunduh.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Bridge handlers
  function handleOpenCampaignSelect() {
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
          <h1 className="tpi-title">Meta Ads Spy</h1>
          <p className="tpi-subtitle">
            Bedah iklan kompetitor di Meta Ads Library (Facebook + Instagram) —
            creative gallery, ad copy, format & platform mix, longevity, dan
            influencer partnerships.
          </p>
        </div>

        <form className="tpi-launcher" onSubmit={submitRun}>
          <label className="tpi-field">
            <span>Keyword / brand</span>
            <input
              value={form.query}
              onChange={(e) =>
                setForm((c) => ({ ...c, query: e.target.value }))
              }
              placeholder="contoh: skincare / Adobe"
            />
          </label>

          <div className="tpi-grid-two">
            <label className="tpi-field">
              <span>Country</span>
              <input
                value={form.country}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    country: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="ID / US / ALL"
              />
            </label>
            <label className="tpi-field">
              <span>Max ads</span>
              <input
                type="number"
                min="10"
                max="500"
                value={form.count}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    count: Number(e.target.value || 10),
                  }))
                }
              />
            </label>
          </div>

          <div className="tpi-grid-two">
            <label className="tpi-field">
              <span>Status iklan</span>
              <select
                className="mas-select"
                value={form.activeStatus}
                onChange={(e) =>
                  setForm((c) => ({ ...c, activeStatus: e.target.value }))
                }
              >
                <option value="all">Semua</option>
                <option value="active">Aktif saja</option>
                <option value="inactive">Nonaktif saja</option>
              </select>
            </label>
            <label className="tpi-field">
              <span>Tipe media</span>
              <select
                className="mas-select"
                value={form.mediaType}
                onChange={(e) =>
                  setForm((c) => ({ ...c, mediaType: e.target.value }))
                }
              >
                <option value="all">Semua</option>
                <option value="video">Video</option>
                <option value="image">Gambar</option>
                <option value="meme">Meme</option>
              </select>
            </label>
          </div>

          <div className="tpi-grid-two">
            <label className="tpi-field">
              <span>Tipe iklan</span>
              <select
                className="mas-select"
                value={form.adType}
                onChange={(e) =>
                  setForm((c) => ({ ...c, adType: e.target.value }))
                }
              >
                <option value="all">Semua kategori</option>
                <option value="political_and_issue_ads">
                  Politik / isu sosial (ada spend)
                </option>
              </select>
            </label>
            <label className="tpi-field">
              <span>Presisi keyword</span>
              <select
                className="mas-select"
                value={form.searchType}
                onChange={(e) =>
                  setForm((c) => ({ ...c, searchType: e.target.value }))
                }
              >
                <option value="keyword_unordered">Longgar (unordered)</option>
                <option value="keyword_exact_phrase">Frasa persis</option>
              </select>
            </label>
          </div>

          <div className="tpi-field">
            <span>Mode scrape</span>
            <div className="ipi-mode-toggle">
              <button
                type="button"
                className={`ipi-mode-btn ${form.mode === "lite" ? "ipi-mode-active" : ""}`}
                onClick={() => setForm((c) => ({ ...c, mode: "lite" }))}
              >
                <strong>Hemat</strong>
                <em>skip detail per-ad · lebih cepat</em>
              </button>
              <button
                type="button"
                className={`ipi-mode-btn ${form.mode === "full" ? "ipi-mode-active" : ""}`}
                onClick={() => setForm((c) => ({ ...c, mode: "full" }))}
              >
                <strong>Lengkap</strong>
                <em>copy + carousel + creative penuh</em>
              </button>
            </div>
          </div>

          <button
            type="button"
            className="tas-advanced-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced
              ? "− Sembunyikan advanced"
              : "+ Advanced: tempel URL Ads Library"}
          </button>
          {showAdvanced && (
            <label className="tpi-field">
              <span>startUrl (opsional, override)</span>
              <input
                value={form.startUrl}
                onChange={(e) =>
                  setForm((c) => ({ ...c, startUrl: e.target.value }))
                }
                placeholder="https://www.facebook.com/ads/library/?..."
              />
            </label>
          )}

          <button
            className="cta-button tpi-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Menjalankan..." : "Run Meta Ads Spy"}
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
                  <strong>{entry.query}</strong>
                  <span className={`tpi-badge tpi-badge-${entry.status}`}>
                    {entry.status}
                  </span>
                </div>
                <div className="tpi-history-meta">
                  <span>
                    {entry.summary?.totalAds ?? entry.filters?.count ?? 0} ads ·{" "}
                    {entry.country}
                  </span>
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
            <h2>
              Run pertama akan membuat Meta ads intelligence deck secara
              otomatis
            </h2>
            <p>
              Begitu run berjalan, workspace ini mengisi creative gallery, ad
              copy swipe file, format & platform mix, advertiser leaderboard,
              longevity, dan influencer partnerships.
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
                  className="bridge-btn bridge-btn--secondary"
                  aria-label="Assign report ini ke campaign"
                  onClick={handleOpenCampaignSelect}
                >
                  📋 Assign ke Campaign
                </button>
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
              <div>
                <span className="tpi-kicker">
                  Meta Ads Deck · {report.country}
                </span>
                <h2>{report.query}</h2>
                <p>
                  {summary.totalAds ?? reportDetail.items?.length ?? 0} ads ·{" "}
                  market size ~{compactNumber(summary.marketSize)} ·{" "}
                  {report.filters?.activeStatus || "all"}
                </p>
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
                <span>Total ads</span>
                <strong>{numberFormat(summary.totalAds)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Advertisers</span>
                <strong>{numberFormat(summary.uniqueAdvertisers)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Active ads</span>
                <strong>{numberFormat(summary.activeAds)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Market size</span>
                <strong>{compactNumber(summary.marketSize)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Long-runners</span>
                <strong>{numberFormat(summary.longRunners)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Avg variants</span>
                <strong>{Number(summary.avgVariants || 0).toFixed(1)}</strong>
              </article>
            </section>

            <section className="tpi-kpi-strip">
              <article className="tpi-kpi-card">
                <span>Avg days active</span>
                <strong>{numberFormat(summary.avgDaysActive)}</strong>
                <em>durasi flight</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Median days active</span>
                <strong>{numberFormat(summary.medianDaysActive)}</strong>
                <em>benchmark longevity</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Partnerships</span>
                <strong>{numberFormat(summary.partnershipCount)}</strong>
                <em>influencer terdeteksi</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Top format</span>
                <strong className="tpi-kpi-text">
                  {summary.formatMix?.[0]?.format || "-"}
                </strong>
                <em>{summary.formatMix?.[0]?.count || 0} ads</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Top platform</span>
                <strong className="tpi-kpi-text">
                  {summary.platformMix?.[0]?.platform || "-"}
                </strong>
                <em>{summary.platformMix?.[0]?.count || 0} ads</em>
              </article>
              <article className="tpi-kpi-card">
                <span>Top advertiser</span>
                <strong className="tpi-kpi-text">
                  {summary.advertiserLeaderboard?.[0]?.advertiser || "-"}
                </strong>
                <em>{summary.advertiserLeaderboard?.[0]?.count || 0} ads</em>
              </article>
            </section>

            <section className="tpi-grid-main">
              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Longevity (top ads)</h3>
                  <span>hari aktif</span>
                </div>
                <BarChart
                  data={(summary.longevitySeries || []).map((d) => ({
                    label: d.label,
                    value: d.value,
                  }))}
                  formatValue={(v) => `${v}d`}
                />
              </div>
              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Advertiser leaderboard</h3>
                  <span>by ad volume</span>
                </div>
                <BarChart
                  data={(summary.advertiserLeaderboard || [])
                    .slice(0, 8)
                    .map((d) => ({
                      label: (d.advertiser || "").slice(0, 10),
                      value: d.count,
                    }))}
                />
              </div>
            </section>

            <section className="tpi-board">
              <div className="tpi-panel-head">
                <h3>Creative gallery</h3>
                <span>{topAds.length} top ads (spy-score)</span>
              </div>
              <div className="tas-gallery">
                {topAds.map((ad) => (
                  <article className="tas-ad-card" key={ad.id}>
                    <div className="tas-ad-thumb">
                      {ad.thumbnail_url ? (
                        <img
                          src={ad.thumbnail_url}
                          alt={ad.advertiser_name}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <div className="tas-ad-thumb-fallback">
                          {(ad.advertiser_name || "AD")[0]}
                        </div>
                      )}
                      <span className="tas-ad-rank">#{ad.rank_position}</span>
                      {ad.is_active && (
                        <span className="mas-active-dot" title="Aktif">
                          ● live
                        </span>
                      )}
                      {ad.video_url && (
                        <a
                          className="tas-ad-play"
                          href={ad.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Play creative"
                        >
                          ▶
                        </a>
                      )}
                    </div>
                    <div className="tas-ad-body">
                      <strong>
                        {ad.advertiser_name || "Unknown advertiser"}
                      </strong>
                      {ad.ai_enrichment?.isBrandedContent && (
                        <span className="mas-brand-badge">
                          🤝 {ad.ai_enrichment.brandPartner}
                        </span>
                      )}
                      <p>
                        {ad.ai_enrichment?.summary || ad.title || "No copy"}
                      </p>
                      <div className="tas-ad-metrics">
                        <span>{ad.days_active}d active</span>
                        <span>{ad.collation_count} varian</span>
                        <span>{ad.cta_type}</span>
                      </div>
                      <div className="tpi-chip-group">
                        <span className="tpi-chip">
                          {ad.ai_enrichment?.format}
                        </span>
                        {(ad.ai_enrichment?.publisherPlatform || [])
                          .slice(0, 3)
                          .map((p) => (
                            <span className="tpi-chip tpi-chip-muted" key={p}>
                              {p}
                            </span>
                          ))}
                      </div>
                      {ad.link_url && (
                        <a
                          href={ad.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tpi-link"
                        >
                          {ad.ai_enrichment?.landingDomain || "Open landing"}
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

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
                <ul className="tpi-reasons">
                  {(summary.recommendations || []).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="tas-disclaimer">{summary.creativeAngleNote}</p>
              </div>
            </section>

            <section className="tpi-grid-main">
              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Format mix</h3>
                </div>
                <ClusterList
                  rows={summary.formatMix || []}
                  labelKey="format"
                  valueKey="count"
                />
              </div>
              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Platform mix</h3>
                </div>
                <ClusterList
                  rows={summary.platformMix || []}
                  labelKey="platform"
                  valueKey="count"
                />
              </div>
            </section>

            <section className="tpi-grid-main">
              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>CTA breakdown</h3>
                </div>
                <ClusterList
                  rows={summary.ctaBreakdown || []}
                  labelKey="cta"
                  valueKey="count"
                />
              </div>
              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Landing domains</h3>
                </div>
                <ClusterList
                  rows={summary.landingDomains || []}
                  labelKey="domain"
                  valueKey="count"
                />
              </div>
            </section>

            {(summary.partnerships || []).length > 0 && (
              <section className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Influencer partnerships</h3>
                  <span>{summary.partnershipCount} terdeteksi</span>
                </div>
                <div className="tpi-chip-group">
                  {summary.partnerships.map((p, i) => (
                    <span className="tpi-chip" key={`${p.brand}-${i}`}>
                      {p.brand} → {p.creator}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {(summary.spendAds || []).length > 0 && (
              <section className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Spend intel (iklan politik/sosial)</h3>
                  <span>{summary.spendAdsCount} ads</span>
                </div>
                <div className="tpi-table-wrap">
                  <table className="tpi-table">
                    <thead>
                      <tr>
                        <th>Advertiser</th>
                        <th>Spend</th>
                        <th>Reach</th>
                        <th>Currency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.spendAds.map((s, i) => (
                        <tr key={i}>
                          <td>{s.advertiser}</td>
                          <td>
                            {s.spendRaw || compactNumber(s.spendEstimate)}
                          </td>
                          <td>{s.reachRaw || "-"}</td>
                          <td>{s.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="tpi-panel">
              <div className="tpi-panel-head">
                <h3>Raw explorer</h3>
                <span>{reportDetail.items?.length || 0} ads</span>
              </div>
              <div className="tpi-table-wrap">
                <table className="tpi-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Advertiser</th>
                      <th>Format</th>
                      <th>Copy</th>
                      <th>CTA</th>
                      <th>Days</th>
                      <th>Active</th>
                      <th>Spy score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportDetail.items || []).map((ad) => (
                      <tr key={ad.id}>
                        <td>{ad.rank_position}</td>
                        <td>{ad.advertiser_name || "-"}</td>
                        <td>{ad.ai_enrichment?.format || "-"}</td>
                        <td>
                          {(ad.body_text || ad.title || "-").slice(0, 60)}
                        </td>
                        <td>{ad.cta_type}</td>
                        <td>{ad.days_active}</td>
                        <td>{ad.is_active ? "✅" : "—"}</td>
                        <td>{Number(ad.spy_score || 0).toFixed(1)}</td>
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
