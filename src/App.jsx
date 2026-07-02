import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import AuthModal from "./components/AuthModal.jsx";
import ToolPopover from "./components/ToolPopover.jsx";
import Header from "./components/Header.jsx";
import {
  AUTOMATION_CARDS,
  AUTOMATION_CATEGORY_COUNTS,
  AUTOMATION_TOTAL,
} from "./lib/automationCards";
import {
  MODULE_CARDS,
  MODULE_CATEGORY_COUNTS,
  MODULE_TOTAL,
} from "./lib/moduleCards";
import { MASCOT_SCENES } from "./lib/mascots";

const tabs = [
  {
    id: "business",
    label: "For Business",
    accent: "#377cf6",
    image: "/tab-analytics.png",
    title:
      "Riset pasar, analisis kompetitor, dan insight pelanggan — semua otomatis",
    description:
      "aikit membantu pemilik bisnis dan tim marketing mengambil keputusan lebih cepat dengan data nyata dari sosmed, marketplace, dan maps — tanpa harus hire analis.",
    stat: "10x lebih cepat dari riset manual",
    eyebrow: "Business intelligence",
    primaryLinks: [
      "Riset pasar",
      "Analisis kompetitor",
      "Review scraper",
      "Price tracker",
    ],
    secondaryLinks: [
      "Lead generation",
      "Sentimen pelanggan",
      "Trend monitoring",
      "Laporan otomatis",
    ],
    bulletGroups: [
      {
        heading: "Riset",
        items: [
          "Data kompetitor real-time",
          "Review & sentimen pasar",
          "Price benchmarking",
        ],
      },
      {
        heading: "Analisis",
        items: [
          "Ringkasan AI otomatis",
          "Identifikasi peluang",
          "Pola keluhan pelanggan",
        ],
      },
      {
        heading: "Aksi",
        items: [
          "Ekspor Excel siap lapor",
          "Share ke tim langsung",
          "Rekomendasi strategi",
        ],
      },
    ],
  },
  {
    id: "jobseeker",
    label: "For Job Seeker",
    accent: "#37d7c8",
    image: "/tab-onboarding.png",
    title:
      "Tingkatkan peluang lolos interview dengan bantuan AI dari CV sampai offer",
    description:
      "aikit membantu job seeker tampil lebih profesional — dari review CV, riset perusahaan, sampai simulasi interview — supaya kamu masuk dengan persiapan terbaik.",
    stat: "3x lebih siap masuk interview",
    eyebrow: "Career toolkit",
    primaryLinks: [
      "CV Reviewer",
      "Cover Letter",
      "Riset Perusahaan",
      "Simulasi Interview",
    ],
    secondaryLinks: [
      "Optimasi LinkedIn",
      "Salary benchmark",
      "Job desc analyzer",
      "Portfolio reviewer",
    ],
    bulletGroups: [
      {
        heading: "Persiapan",
        items: [
          "Review CV dengan skor AI",
          "Tulis cover letter otomatis",
          "Riset budaya perusahaan",
        ],
      },
      {
        heading: "Latihan",
        items: [
          "Simulasi pertanyaan HR",
          "Feedback jawaban kamu",
          "Tips negosiasi gaji",
        ],
      },
      {
        heading: "Optimasi",
        items: [
          "ATS score checker",
          "Keyword dari job desc",
          "Saran perbaikan per section",
        ],
      },
    ],
  },
  {
    id: "creator",
    label: "For Creator",
    accent: "#f3ba3f",
    image: "/tab-debug.png",
    title:
      "Buat konten lebih cepat, temukan tren lebih awal, grow lebih konsisten",
    description:
      "aikit adalah toolkit wajib creator — generate caption, analisis kompetitor, cari hashtag trending, dan ringkas video panjang jadi skrip siap pakai.",
    stat: "5x lebih cepat produksi konten",
    eyebrow: "Creator toolkit",
    primaryLinks: [
      "Caption generator",
      "Hashtag spy",
      "TikTok analyzer",
      "YouTube summarizer",
    ],
    secondaryLinks: [
      "Hook writer",
      "Thread generator",
      "Konten kalender",
      "Repurpose konten",
    ],
    bulletGroups: [
      {
        heading: "Ideasi",
        items: [
          "Tren & topik viral",
          "Angle konten baru",
          "Analisis kompetitor creator",
        ],
      },
      {
        heading: "Produksi",
        items: [
          "Caption & hook otomatis",
          "Skrip video siap pakai",
          "Thread & carousel copy",
        ],
      },
      {
        heading: "Distribusi",
        items: [
          "Hashtag optimal per platform",
          "Waktu posting terbaik",
          "Repurpose ke multi-platform",
        ],
      },
    ],
  },
  {
    id: "personal",
    label: "For Personal",
    accent: "#b461f3",
    image: "/tab-rollout.png",
    title:
      "AI tools untuk kehidupan sehari-hari yang lebih produktif dan efisien",
    description:
      "aikit bukan cuma untuk bisnis — ada ratusan tools untuk bantu kamu belajar, menulis, merencanakan, dan menyelesaikan pekerjaan sehari-hari lebih cepat.",
    stat: "Hemat 2–3 jam kerja per hari",
    eyebrow: "Personal productivity",
    primaryLinks: ["Summarizer", "Email writer", "Translator", "Study helper"],
    secondaryLinks: [
      "Grammar checker",
      "Meeting notes",
      "To-do planner",
      "Idea generator",
    ],
    bulletGroups: [
      {
        heading: "Belajar",
        items: [
          "Rangkum artikel & video",
          "Jelaskan konsep rumit",
          "Buat flashcard otomatis",
        ],
      },
      {
        heading: "Kerja",
        items: [
          "Tulis email & laporan",
          "Ringkas meeting notes",
          "Terjemahan akurat",
        ],
      },
      {
        heading: "Harian",
        items: [
          "Rencanakan hari kamu",
          "Generate ide kreatif",
          "Cek grammar & ejaan",
        ],
      },
    ],
  },
];

const trustLogos = [
  "Produktivitas",
  "Bisnis",
  "Marketing",
  "Riset",
  "Personal",
];

const heroHighlights = [
  "Ratusan AI tools, satu platform",
  "Pay-per-use, tanpa langganan paksa",
  "Untuk kerja, bisnis, dan kehidupan sehari-hari",
];

function IconPeople() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="icon-inline small-icon"
    >
      <path d="m5 3 7 5-7 5z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="icon-inline small-icon"
    >
      <path d="M6.2 10.2 4.5 12A2.5 2.5 0 0 1 1 8.5l1.8-1.8" />
      <path d="m9.8 5.8 1.7-1.8A2.5 2.5 0 1 1 15 7.5l-1.8 1.8" />
      <path d="m5.5 10.5 5-5" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="icon-inline small-icon"
    >
      <path d="M3 8a5 5 0 0 1 10 0" />
      <rect x="2" y="8" width="2.5" height="4" rx="1" />
      <rect x="11.5" y="8" width="2.5" height="4" rx="1" />
      <path d="M12 13c0 1.1-.9 2-2 2H8" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="icon-inline">
      <path d="M6 4.5h2.4v9H6zm3.6 0H12v9H9.6z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="icon-inline bullet-icon"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="m5.2 8.1 1.8 1.9 3.8-4" />
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="wordmark" aria-label="aikit wordmark">
      <span className="wordmark-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="wordmark-text">aikit</span>
    </div>
  );
}

function CardGlyphs() {
  return (
    <div className="library-glyphs" aria-hidden="true">
      <span>✦</span>
      <span>◎</span>
      <span>◌</span>
    </div>
  );
}

function MiniAppWindow({ variant }) {
  return (
    <div className={`mini-app-window ${variant}`}>
      <div className="mini-toolbar">
        <span />
        <span />
        <span />
      </div>
      <div className="mini-canvas">
        {variant === "analytics" && (
          <>
            <div className="mini-chart-bars">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="mini-chart-line" />
            <div className="mini-kpi-row">
              <b />
              <b />
              <b />
            </div>
          </>
        )}
        {variant === "checklist" && (
          <>
            <div className="mini-sidebar" />
            <div className="mini-checklist">
              <i />
              <i />
              <i />
              <i />
            </div>
          </>
        )}
        {variant === "warehouse" && (
          <>
            <div className="mini-code-block">
              <i />
              <i />
              <i />
            </div>
            <div className="mini-table-grid" />
          </>
        )}
        {variant === "incidents" && (
          <>
            <div className="mini-alert-pill" />
            <div className="mini-timeline">
              <i />
              <i />
              <i />
            </div>
          </>
        )}
        {variant === "flags" && (
          <>
            <div className="mini-toggle-row">
              <i />
              <i />
              <i />
            </div>
            <div className="mini-segment-card" />
          </>
        )}
        {variant === "experiments" && (
          <>
            <div className="mini-split-panels">
              <i />
              <i />
            </div>
            <div className="mini-metric-strip" />
          </>
        )}
        {variant === "support" && (
          <>
            <div className="mini-ticket-stack">
              <i />
              <i />
              <i />
            </div>
            <div className="mini-avatar-dot" />
          </>
        )}
        {variant === "review" && (
          <>
            <div className="mini-review-grid">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="mini-footer-chart" />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Derived library stats (computed once, outside component) ── */

function App() {
  const [activeTab, setActiveTab] = useState("business");
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  const { user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [popoverCard, setPopoverCard] = useState(null);
  const [popoverCardSource, setPopoverCardSource] = useState("automasi");
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState("All");
  const [automationCategoryFilter, setAutomationCategoryFilter] =
    useState("All");

  // Existing CTAs/avatar route to dashboard when signed in, else open auth.
  const openAuth = (mode) => {
    if (user) {
      navigate("/dashboard");
      return;
    }
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="page-shell">
      <div className="texture-rail" aria-hidden="true" />
      <div className="site-frame">
        <Header onOpenAuth={openAuth} />

        <main className="content">
          <section className="hero">
            <div className="hero-copy">
              <Wordmark />
              <h1>Ratusan AI tools siap pakai, untuk semua kebutuhan kamu</h1>
              <p>
                aikit adalah platform pay-per-use dengan ratusan AI tools — dari
                produktivitas kerja, riset bisnis, analisis sosmed, sampai
                kebutuhan sehari-hari. Tinggal pilih tool, jalankan, dapat
                hasilnya.
              </p>
              <p>
                Tidak perlu langganan mahal atau setup teknis. Bayar hanya saat
                kamu pakai, ekspor hasilnya, langsung jalan.
              </p>

              <ul className="hero-highlights" aria-label="Key benefits">
                {heroHighlights.map((item) => (
                  <li key={item}>
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="hero-actions">
                <button
                  type="button"
                  className="cta-button"
                  onClick={() => openAuth("signup")}
                >
                  Get started - free
                </button>
                <button type="button" className="ghost-button">
                  Book a live walkthrough
                </button>
              </div>

              <div className="hero-links">
                <a href="/" onClick={(event) => event.preventDefault()}>
                  <LinkIcon />
                  MCP
                </a>
                <span className="hero-dot" />
                <a href="/" onClick={(event) => event.preventDefault()}>
                  <PlayIcon />
                  Watch a demo
                </a>
                <span className="hero-dot" />
                <a href="/" onClick={(event) => event.preventDefault()}>
                  <HeadsetIcon />
                  Talk to a human
                </a>
              </div>

              <div
                className="trust-strip"
                aria-label="Trusted by teams shipping weekly"
              >
                <span className="trust-label">Teams shipping weekly:</span>
                <div className="trust-logos">
                  {trustLogos.map((logo) => (
                    <span key={logo}>{logo}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-image-shell">
                <img
                  src={MASCOT_SCENES.landingHero}
                  alt="aikit lightning mascot working with a laptop"
                  className="hero-generated-image"
                />
              </div>
            </div>
          </section>

          <section
            className="product-panel"
            style={{ "--panel-accent": currentTab.accent }}
          >
            <div className="tabs" role="tablist" aria-label="Product areas">
              {tabs.map((tab) => {
                const isActive = tab.id === currentTab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`tab-button${isActive ? " active" : ""}`}
                    style={
                      isActive ? { "--tab-accent": tab.accent } : undefined
                    }
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="panel-card-wrap">
              <div className="panel-card">
                <button
                  type="button"
                  className="panel-pause"
                  aria-label="Pause carousel"
                >
                  <PauseIcon />
                </button>

                <div className="panel-copy">
                  <span className="panel-eyebrow">{currentTab.eyebrow}</span>
                  <h2>
                    <strong>{currentTab.title}</strong>
                  </h2>
                  <p>{currentTab.description}</p>

                  <div className="panel-chips" aria-label="Top modules">
                    {currentTab.primaryLinks.map((link) => (
                      <span key={link} className="panel-chip">
                        {link}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="panel-visual">
                  <img
                    src={currentTab.image}
                    alt={`${currentTab.label} visual`}
                    className="panel-generated-image"
                  />
                </div>

                <div className="panel-columns">
                  {currentTab.bulletGroups.map((group) => (
                    <section key={group.heading} className="link-column">
                      <h3>{group.heading}</h3>
                      <ul className="feature-list">
                        {group.items.map((item) => (
                          <li key={item}>
                            <CheckIcon />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>

                <div
                  className="panel-footer-links"
                  aria-label="Additional capabilities"
                >
                  {currentTab.secondaryLinks.map((link) => (
                    <a
                      href="/"
                      key={link}
                      onClick={(event) => event.preventDefault()}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="library-section" aria-labelledby="automasi-title">
            <div className="library-copy">
              <div>
                <span className="library-kicker">Automasi</span>
                <h2 id="automasi-title">
                  <strong>Tools otomasi siap jalankan</strong>
                </h2>
              </div>
              <div className="library-copy-right">
                <p>
                  <strong>{AUTOMATION_TOTAL} tools</strong> siap pakai —{" "}
                  {Object.entries(AUTOMATION_CATEGORY_COUNTS)
                    .map(([cat, count]) => `${count} ${cat}`)
                    .join(", ")}
                  .
                </p>
              </div>
            </div>
            {/* Category filter pills */}
            <div className="library-filter-pills">
              {["All", ...Object.keys(AUTOMATION_CATEGORY_COUNTS)].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={
                      automationCategoryFilter === cat
                        ? "cta-button"
                        : "ghost-button"
                    }
                    style={{
                      fontSize: "12px",
                      padding: "6px 14px",
                      height: "auto",
                      borderRadius: "16px",
                    }}
                    onClick={() => setAutomationCategoryFilter(cat)}
                  >
                    {cat === "All"
                      ? `Semua (${AUTOMATION_TOTAL})`
                      : `${cat} (${AUTOMATION_CATEGORY_COUNTS[cat]})`}
                  </button>
                ),
              )}
            </div>

            <div className="library-grid">
              {AUTOMATION_CARDS.filter(
                (card) =>
                  automationCategoryFilter === "All" ||
                  (card.details?.category || "Lainnya") ===
                    automationCategoryFilter,
              ).map((card) => {
                const slug = card.id || "automasi";
                const pricingBadge =
                  card.costPerRun === 0 ? "Gratis" : card.pricing;
                return (
                  <article
                    key={card.title}
                    className="db-product-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setPopoverCardSource("automasi");
                      setPopoverCard(card);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setPopoverCardSource("automasi");
                        setPopoverCard(card);
                      }
                    }}
                  >
                    {card.image && (
                      <div className="db-product-card-img-wrap">
                        <img
                          src={card.image}
                          alt={card.title}
                          className="db-product-card-img"
                        />
                        <div className="db-product-card-img-chips">
                          <span className="db-chip db-chip-amber">
                            {card.type}
                          </span>
                          <span
                            className={`db-chip ${
                              pricingBadge === "Gratis"
                                ? "db-chip-green"
                                : "db-chip-amber"
                            }`}
                          >
                            {pricingBadge}
                          </span>
                        </div>
                      </div>
                    )}
                    {!card.image && (
                      <div className="db-product-card-header">
                        <div className="db-product-card-chips">
                          <span className="db-chip db-chip-amber">
                            {card.type}
                          </span>
                          <span
                            className={`db-chip ${
                              pricingBadge === "Gratis"
                                ? "db-chip-green"
                                : "db-chip-amber"
                            }`}
                          >
                            {pricingBadge}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="db-product-card-body">
                      <h3 className="db-product-card-title">{card.title}</h3>
                      <p className="db-product-card-desc">{card.desc}</p>
                      <div className="db-product-card-cost">
                        <span className="db-cost-label">Biaya per run</span>
                        <span className="db-cost-value">
                          {card.costPerRun === 0 ? (
                            <span className="db-cost-free">Gratis</span>
                          ) : (
                            <span>{card.costPerRun} kredit</span>
                          )}
                        </span>
                      </div>
                      <div className="db-product-card-footer">
                        <span className="db-usage-count">
                          <IconPeople />
                          {card.users} pengguna
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* ── Module section ── */}
          <section className="library-section" aria-labelledby="module-title">
            <div className="library-copy">
              <div>
                <span className="library-kicker">Module</span>
                <h2 id="module-title">
                  <strong>Sistem lengkap siap pakai</strong>
                </h2>
              </div>
              <div className="library-copy-right">
                <p>
                  <strong>{MODULE_TOTAL} module</strong> tersedia —{" "}
                  {Object.entries(MODULE_CATEGORY_COUNTS)
                    .map(([cat, count]) => `${count} ${cat}`)
                    .join(", ")}
                  .
                </p>
              </div>
            </div>
            <div className="library-filter-pills">
              {["All", ...Object.keys(MODULE_CATEGORY_COUNTS)].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={
                    moduleCategoryFilter === cat ? "cta-button" : "ghost-button"
                  }
                  style={{
                    fontSize: "12px",
                    padding: "6px 14px",
                    height: "auto",
                    borderRadius: "16px",
                  }}
                  onClick={() => setModuleCategoryFilter(cat)}
                >
                  {cat === "All"
                    ? `Semua (${MODULE_TOTAL})`
                    : `${cat} (${MODULE_CATEGORY_COUNTS[cat]})`}
                </button>
              ))}
            </div>
            <div className="library-grid">
              {MODULE_CARDS.filter(
                (card) =>
                  moduleCategoryFilter === "All" ||
                  card.category === moduleCategoryFilter,
              ).map((card) => {
                const pricingBadge =
                  card.pricing === "Free" ? "Gratis" : card.pricing;
                return (
                  <article
                    key={card.id}
                    className="db-auto-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setPopoverCardSource("module");
                      setPopoverCard(card);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPopoverCardSource("module");
                        setPopoverCard(card);
                      }
                    }}
                  >
                    <div className="db-auto-card-header">
                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        <span className="db-chip db-chip-amber">
                          {card.category}
                        </span>
                        <span
                          className={`db-chip ${pricingBadge === "Gratis" ? "db-chip-green" : "db-chip-amber"}`}
                        >
                          {pricingBadge}
                        </span>
                      </div>
                    </div>
                    <p className="db-auto-card-title">{card.title}</p>
                    <p className="db-auto-card-desc">{card.desc}</p>
                    <div className="db-auto-card-footer">
                      <span className="db-usage-count">
                        <IconPeople />
                        {card.users} pengguna
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <div className="site-footer-inner">
            <div className="site-footer-brand-wrap">
              <img
                src={MASCOT_SCENES.footer}
                alt=""
                aria-hidden="true"
                className="site-footer-mascot"
              />
              <span className="site-footer-brand">aikit</span>
            </div>
            <nav className="site-footer-links" aria-label="Footer">
              <Link to="/privacy">Kebijakan Privasi</Link>
              <Link to="/terms">Syarat dan Ketentuan</Link>
              <a href="mailto:support@aikit.id">Dukungan</a>
            </nav>
            <span className="site-footer-copy">
              © 2026 aikit. Semua hak dilindungi.
            </span>
          </div>
        </footer>
      </div>

      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onModeChange={setAuthMode}
      />

      {popoverCard && (
        <ToolPopover
          card={popoverCard}
          onClose={() => setPopoverCard(null)}
          onGoToDashboard={() => {
            const slug = popoverCard.id || "automasi";
            setPopoverCard(null);
            if (popoverCardSource === "module") {
              navigate(`/dashboard/module/${slug}`);
            } else {
              navigate(
                slug === "automasi"
                  ? "/dashboard/automasi"
                  : `/dashboard/automasi/${slug}`,
              );
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
