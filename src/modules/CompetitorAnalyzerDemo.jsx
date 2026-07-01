import { useMemo, useState } from "react";
import { useToast } from "../lib/ToastContext";
import "./CompetitorAnalyzer.css";

const DEFAULT_FORM = {
  instagramHandle: "somethincbeauty",
  sourceTab: "posts",
  dateFrom: "2023-01-01",
  dateTo: "2023-01-31",
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

const DEMO_REPORT = {
  report: {
    id: "demo-123",
    instagram_handle: "somethincbeauty",
    source_tab: "posts",
    date_from: "2023-01-01T00:00:00.000Z",
    date_to: "2023-01-31T00:00:00.000Z",
    status: "completed",
    excel_artifact_id: "excel-123",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    summary: {
      totalMediaAnalyzed: 45,
      averageEngagementRate: 4.52,
      strongestCommentTheme: "Product Pricing & Promos",
      executiveSummary: "Overall, Somethinc has built a massive engagement spike in late January due to their anniversary sale. Content featuring clear before-and-after results performed 3x better than static product shots.",
      winningPatterns: [
        "Before & After format",
        "Giveaway with tag 3 friends",
        "Fast-paced TikTok style reels"
      ],
      audienceSignals: [
        "Price sensitivity is high",
        "Questions about acne-prone skin",
        "Love the new packaging"
      ],
      recommendations: [
        "Double down on before-and-after reels",
        "Create more educational content on ingredients",
        "Address pricing concerns with bundle offers"
      ]
    }
  },
  items: [
    {
      id: "item-1",
      rank_position: 1,
      is_top_content: true,
      media_type: "VIDEO",
      published_at: "2023-01-15T00:00:00.000Z",
      caption: "Pecahkan rekor! Serum terbaru kita terjual 10.000 pcs dalam 1 jam! 😱🔥",
      like_count: 25400,
      comment_count: 1205,
      engagement_rate: 8.5,
      ai_enrichment: {
        summary: "Launch Announcement",
        hookStyle: "Social Proof",
        contentFormat: "Fast-paced Reel",
        ctaStyle: "Buy Now",
        reasonsItWorked: [
          "Creates FOMO with sold out numbers",
          "High energy music",
          "Clear visual of the product texture"
        ]
      }
    },
    {
      id: "item-2",
      rank_position: 2,
      is_top_content: true,
      media_type: "CAROUSEL_ALBUM",
      published_at: "2023-01-20T00:00:00.000Z",
      caption: "Cara pakai retinol buat pemula. Save post ini biar ga lupa! 📌",
      like_count: 18200,
      comment_count: 890,
      engagement_rate: 6.2,
      ai_enrichment: {
        summary: "Educational Guide",
        hookStyle: "Direct Value",
        contentFormat: "Infographic Carousel",
        ctaStyle: "Save for later",
        reasonsItWorked: [
          "Highly savable content",
          "Addresses a common pain point",
          "Easy to read format"
        ]
      }
    }
  ],
  comments: [
    { metrics: { theme: "Product Pricing & Promos" } },
    { metrics: { theme: "Product Pricing & Promos" } },
    { metrics: { theme: "Product Pricing & Promos" } },
    { metrics: { theme: "Acne Concerns" } },
    { metrics: { theme: "Acne Concerns" } },
    { metrics: { theme: "Shipping Issues" } }
  ],
  events: [
    { stage: "fetching_profile", status: "completed", message: "Fetched profile for somethincbeauty" },
    { stage: "fetching_media_index", status: "completed", message: "Indexed 45 posts" },
    { stage: "normalizing_metrics", status: "completed", message: "Calculated ER and benchmarks" },
    { stage: "ranking_top_content", status: "completed", message: "Identified top 5 outliers" },
    { stage: "fetching_comments", status: "completed", message: "Analyzed 500+ comments" },
    { stage: "building_workbook", status: "completed", message: "Generated Excel report" }
  ]
};

export default function CompetitorAnalyzerDemo() {
  const toast = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [reports] = useState([DEMO_REPORT.report]);
  const [activeReportId, setActiveReportId] = useState(DEMO_REPORT.report.id);
  
  // Since it's demo, the active report detail is ALWAYS the DEMO_REPORT
  const reportDetail = activeReportId === DEMO_REPORT.report.id ? DEMO_REPORT : null;
  const loadingReports = false;
  const loadingDetail = false;
  const [submitting, setSubmitting] = useState(false);

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
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Run dimulai. Ini hanya demo page.");
    }, 1000);
  }

  function downloadReport() {
    toast.success("File Excel berhasil diunduh (Simulasi Demo).");
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

          <button className="cta-button" type="submit" disabled={submitting} style={{ width: "100%", height: 40, marginTop: 10 }}>
            {submitting ? "Menjalankan..." : "Jalankan report (Demo)"}
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
                  className="ghost-button"
                  onClick={downloadReport}
                  type="button"
                  disabled={!reportDetail.report.excel_artifact_id}
                  style={{ height: 38 }}
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
