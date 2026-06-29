import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./App.css";
import { useAuth } from "./lib/AuthContext";
import AuthModal from "./components/AuthModal.jsx";

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

const libraryCards = [
  {
    name: "Instagram Analyzer",
    slug: "instagram-analyzer",
    role: "Analisis profil & konten kompetitor Instagram secara otomatis",
    place: "Engagement, top content & waktu posting",
    team: "Rp15.000/run",
    accent: "#e1306c",
    surface: "#f7a1c4",
    image: "/lib-signal-board.png",
  },
  {
    name: "CV Reviewer",
    slug: "cv-reviewer",
    role: "Upload CV kamu, dapat feedback detail dari AI dalam 30 detik",
    place: "Skor, kelemahan & saran perbaikan per section",
    team: "Rp10.000/run",
    accent: "#37d7c8",
    surface: "#98f0e8",
    image: "/lib-flow-pilot.png",
  },
  {
    name: "Riset Pasar Instan",
    slug: "riset-pasar",
    role: "Ringkasan riset pasar untuk ide bisnis atau produk baru kamu",
    place: "Target market, kompetitor & peluang dalam 1 laporan",
    team: "Rp25.000/run",
    accent: "#f3ba3f",
    surface: "#fdd98a",
    image: "/lib-warehouse-one.png",
  },
  {
    name: "Email Writer",
    slug: "email-writer",
    role: "Tulis email profesional, pitching, atau follow-up dalam hitungan detik",
    place: "Cold email, proposal, negosiasi & customer support",
    team: "Rp5.000/run",
    accent: "#ff5c62",
    surface: "#f7a1a8",
    image: "/lib-issue-radar.png",
  },
  {
    name: "YouTube Summarizer",
    slug: "youtube-summarizer",
    role: "Rangkum video YouTube panjang jadi poin-poin penting",
    place: "Transkrip, insight utama & takeaway actionable",
    team: "Rp8.000/run",
    accent: "#ff0000",
    surface: "#ff8080",
    image: "/lib-launch-deck.png",
  },
  {
    name: "Price Tracker",
    slug: "price-tracker",
    role: "Pantau harga produk kompetitor di marketplace secara real-time",
    place: "Price range, siapa termurah & tren harga",
    team: "Rp20.000/run",
    accent: "#6f58ff",
    surface: "#afa2ff",
    image: "/lib-audience-lab.png",
  },
  {
    name: "Konten Sosmed",
    slug: "konten-sosmed",
    role: "Generate caption, thread, atau skrip konten siap posting",
    place: "Instagram, TikTok, Twitter & LinkedIn",
    team: "Rp8.000/run",
    accent: "#1da1f2",
    surface: "#90d4f7",
    image: "/lib-support-graph.png",
  },
  {
    name: "Lead Scraper",
    slug: "lead-scraper",
    role: "Temukan prospek potensial berdasarkan kriteria bisnis kamu",
    place: "Nama, jabatan, perusahaan & contact info publik",
    team: "Rp50.000/run",
    accent: "#0a66c2",
    surface: "#7ab5e8",
    image: "/lib-focus-room.png",
  },
];

function CaretIcon() {
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden="true"
      className="icon-inline caret-icon"
    >
      <path d="M2 3.5 5 6.5l3-3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-inline">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-inline">
      <path d="M5 6.5h14v9H11l-4 3v-3H5z" />
      <path d="M9 10.5h6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-inline">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 19c1.4-3 4-4.5 6.5-4.5S17.1 16 18.5 19" />
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

function HeaderLogo() {
  return <span className="header-logo-text">aikit</span>;
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

function App() {
  const [activeTab, setActiveTab] = useState("business");
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  const { user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

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
        <header className="topbar">
          <div className="topbar-left">
            <HeaderLogo />
            <nav className="topnav" aria-label="Primary">
              {[
                "Platform",
                "Solutions",
                "Docs",
                "Community",
                "Company",
                "More",
              ].map((item) => (
                <a
                  href="/"
                  key={item}
                  onClick={(event) => event.preventDefault()}
                >
                  {item}
                  <CaretIcon />
                </a>
              ))}
            </nav>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="cta-button topbar-cta"
              onClick={() => openAuth("signup")}
            >
              Start free
            </button>
            <button type="button" className="icon-button" aria-label="Search">
              <SearchIcon />
            </button>
            <button type="button" className="icon-button" aria-label="Messages">
              <MessageIcon />
            </button>
            <button
              type="button"
              className="icon-button avatar-button"
              aria-label="Account"
              onClick={() => openAuth("login")}
            >
              <UserIcon />
            </button>
          </div>
        </header>

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
                  src="/builders-hero.png"
                  alt="aikit hedgehog mascot working at a desk"
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
                  <h2>{currentTab.title}</h2>
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

          <section className="library-section" aria-labelledby="library-title">
            <div className="library-copy">
              <div>
                <span className="library-kicker">Library</span>
                <h2 id="library-title">
                  A colourful gallery of app UI systems
                </h2>
              </div>
              <p>
                Built in the spirit of collectible profile cards, but every card
                here showcases product interfaces instead of portraits. Think
                dashboards, rollout rooms, analytics cockpits, and ops surfaces.
              </p>
            </div>

            <div className="library-grid">
              {libraryCards.map((card) => (
                <article
                  key={card.name}
                  className="library-card"
                  role="link"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/product/${card.slug}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/product/${card.slug}`);
                    }
                  }}
                >
                  <div className="library-card-hero">
                    <div className="library-card-screenshot-wrap">
                      <img
                        src={card.image}
                        alt={`${card.name} interface screenshot`}
                        className="library-card-screenshot"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling.style.display =
                            "flex";
                        }}
                      />
                      <div
                        className="library-card-placeholder"
                        aria-hidden="true"
                      >
                        <span className="placeholder-label">{card.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="library-card-ribbon">
                    <strong>{card.name}</strong>
                  </div>

                  <div className="library-card-meta">
                    <p>{card.place}</p>
                    <div className="library-card-chip">{card.team}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <div className="site-footer-inner">
            <span className="site-footer-brand">aikit</span>
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
    </div>
  );
}

export default App;
