import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import "./TikTokProfileIntelligence.css";

const DEFAULT_FORM = {
  handle: "",
  maxItems: 30,
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

export default function TikTokProfileIntelligence() {
  const toast = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [reports, setReports] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const report = reportDetail?.report;
  const summary = report?.summary || {};

  return (
    <div className="tpi-shell">
      <aside className="tpi-sidebar">
        <div className="tpi-sidebar-head">
          <span className="tpi-kicker">Apify Intelligence Stack</span>
          <h1 className="tpi-title">TikTok Profile Intelligence</h1>
          <p className="tpi-subtitle">
            Production workspace untuk menarik video TikTok via Apify, menghitung KPI
            virality dan intent, lalu menyusun dashboard yang siap dipakai tim growth.
          </p>
        </div>

        <form className="tpi-launcher" onSubmit={submitRun}>
          <label className="tpi-field">
            <span>Handle TikTok</span>
            <input
              value={form.handle}
              onChange={(event) =>
                setForm((current) => ({ ...current, handle: event.target.value }))
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
              <span>Dari tanggal</span>
              <input
                type="date"
                value={form.dateFrom}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dateFrom: event.target.value }))
                }
              />
            </label>
            <label className="tpi-field">
              <span>Sampai tanggal</span>
              <input
                type="date"
                value={form.dateTo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dateTo: event.target.value }))
                }
              />
            </label>
          </div>

          <button className="cta-button tpi-submit" type="submit" disabled={submitting}>
            {submitting ? "Menjalankan..." : "Run TikTok Intelligence"}
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
                  <strong>@{entry.tiktok_handle}</strong>
                  <span className={`tpi-badge tpi-badge-${entry.status}`}>{entry.status}</span>
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
              Begitu run berjalan, workspace ini akan mengisi progress actor, KPI turunan,
              top movers, pattern clusters, dan workbook export dari satu profil TikTok.
            </p>
          </div>
        )}

        {reportDetail && (
          <>
            <section className="tpi-command">
              <div>
                <span className="tpi-kicker">Signal Deck</span>
                <h2>@{report.tiktok_handle}</h2>
                <p>
                  {dateFormat(report.date_from)} sampai {dateFormat(report.date_to)} ·{" "}
                  {(report.filters?.maxItems || reportDetail.items?.length || 0)} target videos
                </p>
              </div>
              <div className="tpi-command-actions">
                <span className={`tpi-badge tpi-badge-${report.status}`}>{report.status}</span>
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
                <strong>{numberFormat(summary.totalVideosAnalyzed || reportDetail.items?.length)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Total views</span>
                <strong>{numberFormat(summary.totalViews)}</strong>
              </article>
              <article className="tpi-signal-card">
                <span>Avg engagement density</span>
                <strong>{percentFormat(summary.averageViewToEngagementRate)}</strong>
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
                <strong>{Number(summary.conversationScore || 0).toFixed(1)}</strong>
              </article>
            </section>

            <section className="tpi-grid-main">
              <div className="tpi-panel">
                <div className="tpi-panel-head">
                  <h3>Run progress</h3>
                  <span>{loadingDetail ? "refreshing" : `${reportDetail.events?.length || 0} events`}</span>
                </div>
                <div className="tpi-stage-list">
                  {(reportDetail.events || []).map((event, index) => (
                    <div className="tpi-stage-item" key={`${event.stage}-${index}`}>
                      <div className={`tpi-stage-dot tpi-stage-dot-${event.status}`} />
                      <div>
                        <strong>{STAGE_LABELS[event.stage] || event.stage}</strong>
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
                  {summary.executiveSummary || "Summary akan muncul setelah report selesai."}
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
                    <div className="tpi-top-rank">#{item.rank_position}</div>
                    <div className="tpi-top-meta">
                      <span>{dateFormat(item.published_at)}</span>
                      <span>Score {Number(item.top_score || 0).toFixed(1)}</span>
                    </div>
                    <h4>{item.ai_enrichment?.summary || "Top TikTok video"}</h4>
                    <p>{item.caption || "Caption tidak tersedia."}</p>
                    <div className="tpi-stat-row">
                      <span>{numberFormat(item.view_count)} views</span>
                      <span>{numberFormat(item.share_count)} shares</span>
                      <span>{percentFormat(item.save_rate)}</span>
                    </div>
                    <div className="tpi-chip-group">
                      {[item.ai_enrichment?.hookStyle, item.ai_enrichment?.contentFormat, item.ai_enrichment?.topicCluster]
                        .filter(Boolean)
                        .map((chip) => (
                          <span className="tpi-chip" key={chip}>
                            {chip}
                          </span>
                        ))}
                    </div>
                    <ul className="tpi-reasons">
                      {(item.ai_enrichment?.reasonsItWorked || []).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="tpi-link">
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
