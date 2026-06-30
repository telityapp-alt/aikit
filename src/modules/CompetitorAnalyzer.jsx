import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import "./CompetitorAnalyzer.css";

const DEFAULT_FORM = {
  instagramHandle: "",
  sourceTab: "posts",
  dateFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
    .toISOString()
    .slice(0, 10),
  dateTo: new Date().toISOString().slice(0, 10),
  region: "ID",
  includeTranscripts: true,
};

const STAGE_LABELS = {
  fetching_profile: "Profile",
  fetching_media_index: "Media",
  normalizing_metrics: "Metrics",
  ranking_top_content: "Ranking",
  fetching_comments: "Comments",
  fetching_transcripts: "Transcript",
  building_workbook: "Workbook",
  completed: "Done",
};

function numberFormat(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function percentFormat(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function dateFormat(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
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

function metricFromComment(comment, key, fallback = "") {
  return comment?.metrics?.[key] ?? fallback;
}

export default function CompetitorAnalyzer() {
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
      const data = await api.getInstagramCompetitorReports();
      const nextReports = data.reports || [];
      setReports(nextReports);
      if (selectFirst) {
        const nextActiveId = activeReportId || nextReports[0]?.id || null;
        if (nextActiveId) {
          setActiveReportId(nextActiveId);
        }
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
      const data = await api.getInstagramCompetitorReport(reportId);
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
    () =>
      (reportDetail?.items || [])
        .filter((item) => item.is_top_content)
        .slice(0, 5),
    [reportDetail],
  );

  const commentThemes = useMemo(() => {
    const counts = new Map();
    for (const comment of reportDetail?.comments || []) {
      const theme = metricFromComment(comment, "theme", "general");
      counts.set(theme, (counts.get(theme) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [reportDetail]);

  async function submitRun(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const data = await api.runAutomation("competitor-analyzer", form);
      setActiveReportId(data.report.id);
      toast.success("Run dimulai. Progress report akan muncul otomatis.");
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
      await api.downloadInstagramCompetitorReport(
        reportDetail.report.id,
        reportDetail.report.instagram_handle,
      );
      toast.success("File Excel berhasil diunduh.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  const summary = reportDetail?.report?.summary || {};
  const status = reportDetail?.report?.status;

  return (
    <div className="ica-shell">
      <aside className="ica-sidebar">
        <div className="ica-sidebar-head">
          <span className="ica-kicker">Instagram Intelligence</span>
          <h1 className="ica-title">Generator Laporan Kompetitor Instagram</h1>
          <p className="ica-subtitle">
            Shared foundation untuk scrape, analisis top content, komentar,
            dan export workbook yang siap dipakai tim.
          </p>
        </div>

        <form className="ica-launcher" onSubmit={submitRun}>
          <label className="ica-field">
            <span>Handle Instagram</span>
            <input
              value={form.instagramHandle}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  instagramHandle: event.target.value,
                }))
              }
              placeholder="contoh: somethincbeauty"
            />
          </label>

          <div className="ica-grid-two">
            <label className="ica-field">
              <span>Sumber konten</span>
              <select
                value={form.sourceTab}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sourceTab: event.target.value,
                  }))
                }
              >
                <option value="posts">Posts</option>
                <option value="reels">Reels</option>
              </select>
            </label>
            <label className="ica-field">
              <span>Region proxy</span>
              <input
                value={form.region}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    region: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="ID"
              />
            </label>
          </div>

          <div className="ica-grid-two">
            <label className="ica-field">
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
            <label className="ica-field">
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

          <label className="ica-toggle">
            <input
              type="checkbox"
              checked={form.includeTranscripts}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  includeTranscripts: event.target.checked,
                }))
              }
            />
            <span>Ambil transcript untuk konten video prioritas</span>
          </label>

          <button className="ica-primary" type="submit" disabled={submitting}>
            {submitting ? "Menjalankan..." : "Jalankan report"}
          </button>
        </form>

        <div className="ica-history">
          <div className="ica-history-head">
            <h2>Riwayat report</h2>
            <span>{loadingReports ? "memuat" : `${reports.length} report`}</span>
          </div>

          <div className="ica-history-list">
            {reports.map((report) => (
              <button
                key={report.id}
                className={`ica-history-item ${activeReportId === report.id ? "ica-history-item-active" : ""}`}
                onClick={() => setActiveReportId(report.id)}
                type="button"
              >
                <div className="ica-history-top">
                  <strong>@{report.instagram_handle}</strong>
                  <span className={`ica-badge ica-badge-${report.status}`}>
                    {report.status}
                  </span>
                </div>
                <div className="ica-history-meta">
                  <span>{report.source_tab}</span>
                  <span>{compactTime(report.created_at)}</span>
                </div>
              </button>
            ))}

            {!loadingReports && reports.length === 0 && (
              <div className="ica-empty-history">
                Report pertama yang kamu jalankan akan muncul di sini.
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="ica-main">
        {!reportDetail && (
          <div className="ica-empty-stage">
            <span className="ica-kicker">Phase 1 + 2 live</span>
            <h2>Run pertama akan membangun workspace ini secara otomatis</h2>
            <p>
              Setelah run dimulai, kamu bisa pantau stage progress, top content,
              comment intelligence, dan download workbook langsung dari sini.
            </p>
          </div>
        )}

        {reportDetail && (
          <>
            <section className="ica-command">
              <div>
                <span className="ica-kicker">Report Workspace</span>
                <h2>@{reportDetail.report.instagram_handle}</h2>
                <p>
                  {reportDetail.report.source_tab} · {dateFormat(reportDetail.report.date_from)} sampai{" "}
                  {dateFormat(reportDetail.report.date_to)}
                </p>
              </div>
              <div className="ica-command-actions">
                <span className={`ica-badge ica-badge-${status}`}>{status}</span>
                <button
                  className="ica-secondary"
                  onClick={downloadReport}
                  type="button"
                  disabled={!reportDetail.report.excel_artifact_id}
                >
                  Download Excel
                </button>
              </div>
            </section>

            <section className="ica-signals">
              <article className="ica-signal-card">
                <span>Total media</span>
                <strong>{numberFormat(summary.totalMediaAnalyzed || reportDetail.items?.length)}</strong>
              </article>
              <article className="ica-signal-card">
                <span>Avg engagement rate</span>
                <strong>{percentFormat(summary.averageEngagementRate)}</strong>
              </article>
              <article className="ica-signal-card">
                <span>Top comment theme</span>
                <strong>{summary.strongestCommentTheme || commentThemes[0]?.[0] || "-"}</strong>
              </article>
              <article className="ica-signal-card">
                <span>Last update</span>
                <strong>{compactTime(reportDetail.report.updated_at)}</strong>
              </article>
            </section>

            <section className="ica-grid-main">
              <div className="ica-panel">
                <div className="ica-panel-head">
                  <h3>Progress run</h3>
                  <span>{loadingDetail ? "refreshing" : `${reportDetail.events?.length || 0} events`}</span>
                </div>
                <div className="ica-stage-list">
                  {(reportDetail.events || []).map((event, index) => (
                    <div className="ica-stage-item" key={`${event.stage}-${index}`}>
                      <div className={`ica-stage-dot ica-stage-dot-${event.status}`} />
                      <div>
                        <strong>{STAGE_LABELS[event.stage] || event.stage}</strong>
                        <p>{event.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ica-panel">
                <div className="ica-panel-head">
                  <h3>Executive summary</h3>
                </div>
                <p className="ica-summary-callout">
                  {summary.executiveSummary ||
                    "Summary AI akan muncul setelah report selesai diproses."}
                </p>
                <div className="ica-chip-group">
                  {(summary.winningPatterns || []).map((item) => (
                    <span className="ica-chip" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="ica-board">
              <div className="ica-panel-head">
                <h3>Top 5 content</h3>
                <span>{topItems.length} insight card</span>
              </div>
              <div className="ica-top-grid">
                {topItems.map((item) => (
                  <article className="ica-top-card" key={item.id}>
                    <div className="ica-top-rank">#{item.rank_position}</div>
                    <div className="ica-top-meta">
                      <span>{item.media_type}</span>
                      <span>{dateFormat(item.published_at)}</span>
                    </div>
                    <h4>{item.ai_enrichment?.summary || "Konten prioritas"}</h4>
                    <p>{item.caption || "Caption tidak tersedia."}</p>
                    <div className="ica-stat-row">
                      <span>{numberFormat(item.like_count)} likes</span>
                      <span>{numberFormat(item.comment_count)} comments</span>
                      <span>{percentFormat(item.engagement_rate)}</span>
                    </div>
                    <div className="ica-chip-group">
                      {[
                        item.ai_enrichment?.hookStyle,
                        item.ai_enrichment?.contentFormat,
                        item.ai_enrichment?.ctaStyle,
                      ]
                        .filter(Boolean)
                        .map((chip) => (
                          <span className="ica-chip" key={chip}>
                            {chip}
                          </span>
                        ))}
                    </div>
                    <ul className="ica-reasons">
                      {(item.ai_enrichment?.reasonsItWorked || []).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section className="ica-grid-main">
              <div className="ica-panel">
                <div className="ica-panel-head">
                  <h3>Audience signals</h3>
                </div>
                <div className="ica-theme-list">
                  {commentThemes.map(([theme, count]) => (
                    <div className="ica-theme-row" key={theme}>
                      <span>{theme}</span>
                      <strong>{numberFormat(count)}</strong>
                    </div>
                  ))}
                </div>
                <div className="ica-chip-group">
                  {(summary.audienceSignals || []).map((signal) => (
                    <span className="ica-chip" key={signal}>
                      {signal}
                    </span>
                  ))}
                </div>
              </div>

              <div className="ica-panel">
                <div className="ica-panel-head">
                  <h3>Recommended actions</h3>
                </div>
                <ul className="ica-reasons">
                  {(summary.recommendations || []).map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="ica-panel">
              <div className="ica-panel-head">
                <h3>Raw media explorer</h3>
                <span>{reportDetail.items?.length || 0} rows</span>
              </div>
              <div className="ica-table-wrap">
                <table className="ica-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Tipe</th>
                      <th>Caption</th>
                      <th>Likes</th>
                      <th>Comments</th>
                      <th>ER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportDetail.items || []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.rank_position || "-"}</td>
                        <td>{item.media_type}</td>
                        <td>{item.caption || "-"}</td>
                        <td>{numberFormat(item.like_count)}</td>
                        <td>{numberFormat(item.comment_count)}</td>
                        <td>{percentFormat(item.engagement_rate)}</td>
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
