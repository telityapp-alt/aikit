import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import "./TikTokProfileIntelligence.css";
import "./TikTokAdsSpy.css";

const DEFAULT_FORM = {
  query: "",
  region: "all",
  resultsLimit: 50,
  mode: "full",
  startUrl: "",
  dateFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10),
  dateTo: new Date().toISOString().slice(0, 10),
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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
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
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

function BarChart({ data = [], formatValue = (v) => v, emptyLabel = "Belum ada data." }) {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  if (!data.length) return <div className="tpi-chart-empty">{emptyLabel}</div>;
  return (
    <div className="tpi-chart">
      {data.map((d, index) => (
        <div className="tpi-chart-col" key={`${d.label}-${index}`}>
          <div className="tpi-chart-bar-wrap">
            <span className="tpi-chart-value">{formatValue(d.value)}</span>
            <div className="tpi-chart-bar" style={{ height: `${Math.max(4, (Number(d.value) / max) * 100)}%` }} />
          </div>
          <span className="tpi-chart-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function ClusterList({ rows = [], labelKey, valueKey, formatValue = numberFormat, emptyLabel = "Belum ada data." }) {
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

export default function TikTokAdsSpy() {
  const toast = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reports, setReports] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReports = useEffectEvent(async (selectFirst = false) => {
    setLoadingReports(true);
    try {
      const data = await api.getTikTokAdsReports();
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
      setReportDetail(await api.getTikTokAdsReport(reportId));
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
    if (!activeReportId || !status || !["queued", "running"].includes(status)) return undefined;
    const timer = setInterval(() => {
      loadReportDetail(activeReportId, true);
      loadReports(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeReportId, reportDetail?.report?.status]);

  const topAds = useMemo(() => (reportDetail?.items || []).slice(0, 6), [reportDetail]);

  async function submitRun(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const data = await api.runAutomation("tiktok-ads-spy", form);
      setActiveReportId(data.report.id);
      toast.success("Run TikTok Ads Spy dimulai. Dashboard akan terisi otomatis.");
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
      await api.downloadTikTokAdsReport(reportDetail.report.id, (reportDetail.report.query || "report").slice(0, 30));
      toast.success("Workbook TikTok Ads berhasil diunduh.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  const report = reportDetail?.report;
  const summary = report?.summary || {};

  return (
    <div className="tpi-shell">
      <aside className="tpi-sidebar">
        <div className="tpi-sidebar-head">
          <span className="tpi-kicker">Apify Intelligence Stack</span>
          <h1 className="tpi-title">TikTok Ads Spy</h1>
          <p className="tpi-subtitle">
            Bedah iklan kompetitor di TikTok Ads Library — creative gallery, share-of-voice,
            targeting usia/gender, dan region intelligence. Competitive intel, bukan ROI.
          </p>
        </div>

        <form className="tpi-launcher" onSubmit={submitRun}>
          <label className="tpi-field">
            <span>Advertiser / keyword</span>
            <input
              value={form.query}
              onChange={(e) => setForm((c) => ({ ...c, query: e.target.value }))}
              placeholder="contoh: NVIDIA GmbH"
            />
          </label>

          <div className="tpi-grid-two">
            <label className="tpi-field">
              <span>Region</span>
              <input
                value={form.region}
                onChange={(e) => setForm((c) => ({ ...c, region: e.target.value }))}
                placeholder="all / ID / DE ..."
              />
            </label>
            <label className="tpi-field">
              <span>Max ads</span>
              <input
                type="number"
                min="1"
                max="500"
                value={form.resultsLimit}
                onChange={(e) => setForm((c) => ({ ...c, resultsLimit: Number(e.target.value || 1) }))}
              />
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
                <em>skip targeting detail · lebih cepat</em>
              </button>
              <button
                type="button"
                className={`ipi-mode-btn ${form.mode === "full" ? "ipi-mode-active" : ""}`}
                onClick={() => setForm((c) => ({ ...c, mode: "full" }))}
              >
                <strong>Lengkap</strong>
                <em>targeting usia/gender + audience</em>
              </button>
            </div>
          </div>

          <div className="tpi-grid-two">
            <label className="tpi-field">
              <span>Dari tanggal</span>
              <input type="date" value={form.dateFrom} onChange={(e) => setForm((c) => ({ ...c, dateFrom: e.target.value }))} />
            </label>
            <label className="tpi-field">
              <span>Sampai tanggal</span>
              <input type="date" value={form.dateTo} onChange={(e) => setForm((c) => ({ ...c, dateTo: e.target.value }))} />
            </label>
          </div>

          <button type="button" className="tas-advanced-toggle" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "− Sembunyikan advanced" : "+ Advanced: tempel URL Ads Library"}
          </button>
          {showAdvanced && (
            <label className="tpi-field">
              <span>startUrl (opsional, override)</span>
              <input
                value={form.startUrl}
                onChange={(e) => setForm((c) => ({ ...c, startUrl: e.target.value }))}
                placeholder="https://library.tiktok.com/ads?..."
              />
            </label>
          )}

          <button className="cta-button tpi-submit" type="submit" disabled={submitting}>
            {submitting ? "Menjalankan..." : "Run TikTok Ads Spy"}
          </button>
        </form>

        <div className="tpi-history">
          <div className="tpi-history-head">
            <h2>Report history</h2>
            <span>{loadingReports ? "memuat" : `${reports.length} report`}</span>
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
                  <span className={`tpi-badge tpi-badge-${entry.status}`}>{entry.status}</span>
                </div>
                <div className="tpi-history-meta">
                  <span>{entry.summary?.totalAds ?? entry.filters?.resultsLimit ?? 0} ads</span>
                  <span>{compactTime(entry.created_at)}</span>
                </div>
              </button>
            ))}
            {!loadingReports && reports.length === 0 && (
              <div className="tpi-empty-history">Report pertama yang kamu jalankan akan muncul di sini.</div>
            )}
          </div>
        </div>
      </aside>

      <main className="tpi-main">
        {!reportDetail && (
          <div className="tpi-empty-stage">
            <span className="tpi-kicker">Production vertical ready</span>
            <h2>Run pertama akan membuat ads intelligence deck secara otomatis</h2>
            <p>
              Begitu run berjalan, workspace ini mengisi creative gallery, share-of-voice,
              CTA & landing analysis, region impressions, dan targeting breakdown kompetitor.
            </p>
          </div>
        )}

        {reportDetail && (
          <>
            <section className="tpi-command">
              <div>
                <span className="tpi-kicker">Ads Intelligence Deck</span>
                <h2>{report.query}</h2>
                <p>
                  Region {report.region} · {dateFormat(report.date_from)} — {dateFormat(report.date_to)} ·{" "}
                  {summary.totalAds ?? reportDetail.items?.length ?? 0} ads
                </p>
              </div>
              <div className="tpi-command-actions">
                <span className={`tpi-badge tpi-badge-${report.status}`}>{report.status}</span>
                <button type="button" className="ghost-button" onClick={downloadReport} disabled={!report.artifact_id} style={{ height: 38 }}>
                  Download Workbook
                </button>
              </div>
            </section>

            <section className="tpi-signal-strip">
              <article className="tpi-signal-card"><span>Total ads</span><strong>{numberFormat(summary.totalAds)}</strong></article>
              <article className="tpi-signal-card"><span>Advertisers</span><strong>{numberFormat(summary.uniqueAdvertisers)}</strong></article>
              <article className="tpi-signal-card"><span>Active ads</span><strong>{numberFormat(summary.activeAds)}</strong></article>
              <article className="tpi-signal-card"><span>Est. impressions</span><strong>{compactNumber(summary.estImpressions)}</strong></article>
              <article className="tpi-signal-card"><span>Est. reach</span><strong>{compactNumber(summary.estReach)}</strong></article>
              <article className="tpi-signal-card"><span>Avg days active</span><strong>{numberFormat(summary.avgDaysActive)}</strong></article>
            </section>

            <section className="tpi-kpi-strip">
              <article className="tpi-kpi-card"><span>Ad velocity</span><strong>{Number(summary.adVelocityPerWeek || 0).toFixed(1)}</strong><em>ads / minggu</em></article>
              <article className="tpi-kpi-card"><span>Avg audience size</span><strong>{compactNumber(summary.avgAudienceSize)}</strong><em>targeting reach</em></article>
              <article className="tpi-kpi-card"><span>High spend power</span><strong>{Math.round((summary.highSpendingPowerRatio || 0) * 100)}%</strong><em>ads targeting</em></article>
              <article className="tpi-kpi-card"><span>Top CTA</span><strong className="tpi-kpi-text">{summary.ctaBreakdown?.[0]?.cta || "-"}</strong><em>{summary.ctaBreakdown?.[0]?.count || 0} ads</em></article>
              <article className="tpi-kpi-card"><span>Top region</span><strong className="tpi-kpi-text">{summary.regionImpressions?.[0]?.regionCode || "-"}</strong><em>{compactNumber(summary.regionImpressions?.[0]?.impressions)} impr</em></article>
              <article className="tpi-kpi-card"><span>Top advertiser</span><strong className="tpi-kpi-text">{summary.shareOfVoice?.[0]?.advertiser || "-"}</strong><em>{summary.shareOfVoice?.[0]?.share || 0}% SOV</em></article>
            </section>

            <section className="tpi-grid-main">
              <div className="tpi-panel">
                <div className="tpi-panel-head"><h3>Est. impressions (top ads)</h3><span>geometric mid-point</span></div>
                <BarChart data={(summary.impressionsSeries || []).map((d) => ({ label: d.label, value: d.value }))} formatValue={compactNumber} />
              </div>
              <div className="tpi-panel">
                <div className="tpi-panel-head"><h3>Share of voice</h3><span>by est. impressions</span></div>
                <BarChart data={(summary.shareOfVoice || []).map((d) => ({ label: (d.advertiser || "").slice(0, 10), value: d.impressions }))} formatValue={compactNumber} />
              </div>
            </section>

            <section className="tpi-board">
              <div className="tpi-panel-head"><h3>Creative gallery</h3><span>{topAds.length} top ads</span></div>
              <div className="tas-gallery">
                {topAds.map((ad) => (
                  <article className="tas-ad-card" key={ad.id}>
                    <div className="tas-ad-thumb">
                      {ad.cover_image_url ? (
                        <img src={ad.cover_image_url} alt={ad.advertiser_name} referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <div className="tas-ad-thumb-fallback">{(ad.advertiser_name || "AD")[0]}</div>
                      )}
                      <span className="tas-ad-rank">#{ad.rank_position}</span>
                      {ad.video_url && (
                        <a className="tas-ad-play" href={ad.video_url} target="_blank" rel="noopener noreferrer" title="Play creative">▶</a>
                      )}
                    </div>
                    <div className="tas-ad-body">
                      <strong>{ad.advertiser_name || "Unknown advertiser"}</strong>
                      <p>{ad.ai_enrichment?.summary || ad.caption || "No caption"}</p>
                      <div className="tas-ad-metrics">
                        <span>{compactNumber(ad.impressions_estimate)} impr</span>
                        <span>{ad.days_active}d active</span>
                        <span>{ad.cta}</span>
                      </div>
                      <div className="tpi-chip-group">
                        {(ad.ai_enrichment?.ageRanges || []).slice(0, 3).map((a) => (
                          <span className="tpi-chip" key={a}>{a}</span>
                        ))}
                        {(ad.ai_enrichment?.targetRegions || []).slice(0, 3).map((r) => (
                          <span className="tpi-chip tpi-chip-muted" key={r}>{r}</span>
                        ))}
                      </div>
                      {ad.click_url && (
                        <a href={ad.click_url} target="_blank" rel="noopener noreferrer" className="tpi-link">
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
                <div className="tpi-panel-head"><h3>Run progress</h3><span>{loadingDetail ? "refreshing" : `${reportDetail.events?.length || 0} events`}</span></div>
                <div className="tpi-stage-list">
                  {(reportDetail.events || []).map((event, index) => (
                    <div className="tpi-stage-item" key={`${event.stage}-${index}`}>
                      <div className={`tpi-stage-dot tpi-stage-dot-${event.status}`} />
                      <div><strong>{STAGE_LABELS[event.stage] || event.stage}</strong><p>{event.message}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="tpi-panel">
                <div className="tpi-panel-head"><h3>Executive summary</h3><span>{compactTime(report.updated_at)}</span></div>
                <p className="tpi-summary-callout">{summary.executiveSummary || "Summary akan muncul setelah report selesai."}</p>
                <ul className="tpi-reasons">
                  {(summary.recommendations || []).map((r) => (<li key={r}>{r}</li>))}
                </ul>
                <p className="tas-disclaimer">{summary.creativeAngleNote}</p>
              </div>
            </section>

            <section className="tpi-grid-main">
              <div className="tpi-panel">
                <div className="tpi-panel-head"><h3>CTA breakdown</h3></div>
                <ClusterList rows={summary.ctaBreakdown || []} labelKey="cta" valueKey="count" />
              </div>
              <div className="tpi-panel">
                <div className="tpi-panel-head"><h3>Landing domains</h3></div>
                <ClusterList rows={summary.landingDomains || []} labelKey="domain" valueKey="count" />
              </div>
            </section>

            <section className="tpi-grid-main">
              <div className="tpi-panel">
                <div className="tpi-panel-head"><h3>Region impressions</h3></div>
                <ClusterList rows={summary.regionImpressions || []} labelKey="regionCode" valueKey="impressions" formatValue={compactNumber} />
              </div>
              <div className="tpi-panel">
                <div className="tpi-panel-head"><h3>Targeting mix</h3></div>
                <div className="tpi-cluster-group">
                  <div>
                    <span className="tpi-cluster-label">Age</span>
                    {(summary.ageDistribution || []).map((r) => (
                      <div className="tpi-cluster-row" key={r.label}><span>{r.label}</span><strong>{r.count}</strong></div>
                    ))}
                  </div>
                  <div>
                    <span className="tpi-cluster-label">Gender</span>
                    {(summary.genderDistribution || []).map((r) => (
                      <div className="tpi-cluster-row" key={r.label}><span>{r.label}</span><strong>{r.count}</strong></div>
                    ))}
                  </div>
                  <div>
                    <span className="tpi-cluster-label">Language</span>
                    {(summary.languages || []).map((r) => (
                      <div className="tpi-cluster-row" key={r.label}><span>{r.label}</span><strong>{r.count}</strong></div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="tpi-panel">
              <div className="tpi-panel-head"><h3>Raw explorer</h3><span>{reportDetail.items?.length || 0} ads</span></div>
              <div className="tpi-table-wrap">
                <table className="tpi-table">
                  <thead>
                    <tr><th>#</th><th>Advertiser</th><th>Caption</th><th>CTA</th><th>Est. impr</th><th>Days</th><th>First shown</th></tr>
                  </thead>
                  <tbody>
                    {(reportDetail.items || []).map((ad) => (
                      <tr key={ad.id}>
                        <td>{ad.rank_position}</td>
                        <td>{ad.advertiser_name || "-"}</td>
                        <td>{(ad.caption || "-").slice(0, 70)}</td>
                        <td>{ad.cta}</td>
                        <td>{numberFormat(ad.impressions_estimate)}</td>
                        <td>{ad.days_active}</td>
                        <td>{dateFormat(ad.first_shown)}</td>
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
