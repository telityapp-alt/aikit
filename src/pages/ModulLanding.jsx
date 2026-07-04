import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../lib/AuthContext";
import { MODULE_CARDS } from "../lib/moduleCards";
import { MASCOT_SCENES } from "../lib/mascots";

const CATEGORY_LABELS = [
  "Semua",
  ...new Set(MODULE_CARDS.map((card) => card.category)),
];

const ZIGZAG_ROWS = [
  {
    eyebrow: "Gratis selamanya",
    title: "Tidak ada biaya tersembunyi, tidak ada masa trial",
    desc: "Semua modul di Aispy tersedia gratis. Buka, pakai, dan simpan datamu — tanpa harus memasukkan kartu kredit atau menunggu periode uji coba habis.",
    bullets: [
      "Akses penuh tanpa batas waktu",
      "Data tersimpan di akunmu",
      "Tidak ada upgrade yang dipaksakan",
    ],
    image: "/tab-onboarding.png",
    imageAlt: "Modul tersedia gratis langsung aktif",
  },
  {
    eyebrow: "Saling terhubung",
    title: "Modul dirancang untuk bekerja bersama",
    desc: "Contact Manager terhubung ke Campaign Manager. Campaign Manager mengisi Content Calendar. Satu input, banyak output. Bukan aplikasi terpisah yang harus diintegrasikan manual.",
    bullets: [
      "Data mengalir antar modul otomatis",
      "Satu database untuk semua operasi",
      "Tambah modul kapan saja tanpa kehilangan data",
    ],
    image: "/tab-analytics.png",
    imageAlt: "Modul yang saling terhubung dalam satu sistem",
  },
  {
    eyebrow: "Langsung aktif",
    title: "Tidak perlu setup, tidak perlu konfigurasi",
    desc: "Buka modul, mulai isi data. Tidak ada onboarding panjang, tidak ada integrasi yang harus dikonfigurasi. Sistem sudah siap dari hari pertama.",
    bullets: [
      "Antarmuka yang familiar dan intuitif",
      "Mulai dalam hitungan detik",
      "Panduan built-in di setiap modul",
    ],
    image: "/tab-rollout.png",
    imageAlt: "Langsung pakai tanpa setup",
  },
];


function CheckIcon() {
  return (
    <svg
      className="bullet-icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="8" fill="#f6a61e" opacity="0.15" />
      <path
        d="M5 8l2 2 4-4"
        stroke="#c7820e"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ marginRight: 4, opacity: 0.6 }}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function ModulLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [activeCategory, setActiveCategory] = useState("Semua");

  function openAuth(mode) {
    if (user) {
      navigate("/dashboard/module");
      return;
    }
    setAuthMode(mode);
    setAuthOpen(true);
  }

  const filteredCards = useMemo(() => {
    if (activeCategory === "Semua") return MODULE_CARDS;
    return MODULE_CARDS.filter((card) => card.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="page-shell">
      <div className="site-frame">
        <Header onOpenAuth={openAuth} />

        <main>
          {/* ── 1. Hero ──────────────────────────────────────── */}
          <section className="content">
            <div className="hero">
              <div className="hero-copy">
                <h1>Mini sistem intelligence yang langsung bisa dipakai hari ini</h1>
                <p>
                  Modul Aispy bukan sekadar form ? ini sistem kecil yang saling
                  terhubung untuk kelola kontak, kampanye, konten, dan operasi
                  intelligence dalam satu tempat, tanpa biaya apapun.
                </p>
                <ul className="hero-highlights" aria-label="Keunggulan modul">
                  {[
                    "Semua modul gratis, tidak ada trial",
                    "Data tersimpan dan saling terhubung antar modul",
                    "Mulai langsung tanpa setup atau konfigurasi",
                    "Dirancang untuk pemilik bisnis, bukan developer",
                  ].map((item) => (
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
                    Buka modul gratis
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => navigate("/dashboard/module")}
                  >
                    Lihat dashboard
                  </button>
                </div>
              </div>

              <div className="hero-visual">
                <div className="hero-image-shell">
                  <img
                    src={MASCOT_SCENES.dashboardWelcome}
                    alt="Aispy mascot"
                    className="hero-generated-image"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── 2. Social proof strip ────────────────────────── */}
          <div className="ml-social-strip">
            <div className="content" style={{ padding: "0" }}>
              <div className="ml-social-strip-inner">
                {[
                  { num: `${MODULE_CARDS.length}`, label: "modul aktif" },
                  { num: "100%", label: "gratis selamanya" },
                  { num: "1", label: "tempat semua data bisnis" },
                  { num: "0", label: "setup yang dibutuhkan" },
                ].map((item) => (
                  <div key={item.label} className="ml-strip-item">
                    <span className="ml-strip-num">{item.num}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 3. Gallery ───────────────────────────────────── */}
          <section className="ml-gallery-section">
            <div className="ml-gallery-banner">
              <div className="content" style={{ padding: "28px 0 24px" }}>
                <p className="ml-banner-eyebrow">Library Modul</p>
                <h2 className="ml-banner-title">
                  Pilih modul yang kamu butuhkan
                </h2>
                <p className="ml-banner-desc">
                  Setiap modul sudah siap pakai — buka, isi data, dan sistem
                  langsung bekerja untuk kamu.
                </p>
              </div>
            </div>

            <div className="content" style={{ padding: "24px 0 48px" }}>
              <div className="library-filter-pills">
                {CATEGORY_LABELS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`library-pill${activeCategory === cat ? " active" : ""}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat === "Semua"
                      ? `Semua (${MODULE_CARDS.length})`
                      : `${cat} (${MODULE_CARDS.filter((c) => c.category === cat).length})`}
                  </button>
                ))}
              </div>

              <div className="library-grid">
                {filteredCards.map((card) => (
                  <article
                    key={card.id}
                    className="db-product-card"
                    onClick={() =>
                      user
                        ? navigate(`/dashboard/module/${card.id}`)
                        : openAuth("signup")
                    }
                  >
                    {/* No image variant — chips in header outside body */}
                    <div className="db-product-card-header">
                      <div className="db-product-card-chips">
                        <span className="db-chip db-chip-amber">
                          {card.category}
                        </span>
                        <span className="db-chip db-chip-green">
                          {card.pricing}
                        </span>
                      </div>
                    </div>
                    <div className="db-product-card-body">
                      <h3 className="db-product-card-title">{card.title}</h3>
                      <p className="db-product-card-desc">{card.desc}</p>
                      <div className="db-product-card-footer">
                        <span className="db-usage-count">
                          <IconPeople />
                          {card.users > 0
                            ? `${card.users} pengguna`
                            : "Baru tersedia"}
                        </span>
                        <button
                          type="button"
                          className="ghost-button"
                          style={{
                            fontSize: "13px",
                            height: "32px",
                            padding: "0 14px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (user) {
                              navigate(`/dashboard/module/${card.id}`);
                              return;
                            }
                            openAuth("signup");
                          }}
                        >
                          Buka
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── 4. Zigzag why different ──────────────────────── */}
          <section className="ml-section ml-section-light">
            <div className="content">
              <div className="ml-section-header">
                <p className="ml-eyebrow">Kenapa modul Aispy berbeda</p>
                <h2 className="ml-section-heading">
                  Bukan aplikasi terpisah, ini satu sistem
                </h2>
                <p className="ml-section-sub">
                  Kebanyakan tools gratis itu terisolasi. Modul Aispy dirancang
                  dari awal buat saling terhubung — data mengalir, bukan
                  dipindah manual.
                </p>
              </div>

              <div className="ml-zigzag-list">
                {ZIGZAG_ROWS.map((row, i) => (
                  <div
                    key={row.eyebrow}
                    className={`ml-zigzag-row${i % 2 === 1 ? " ml-zigzag-row-reverse" : ""}`}
                  >
                    <div className="ml-zigzag-copy">
                      <p className="ml-eyebrow">{row.eyebrow}</p>
                      <h3 className="ml-zigzag-title">{row.title}</h3>
                      <p className="ml-zigzag-desc">{row.desc}</p>
                      <ul className="ml-bullet-list">
                        {row.bullets.map((b) => (
                          <li key={b}>
                            <CheckIcon />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="ml-zigzag-img-wrap">
                      <img
                        src={row.image}
                        alt={row.imageAlt}
                        className="ml-zigzag-img"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 5. Module showcase cards ─────────────────────── */}
          <section className="ml-section ml-section-warm">
            <div className="content">
              <div className="ml-section-header">
                <p className="ml-eyebrow">Modul tersedia sekarang</p>
                <h2 className="ml-section-heading">
                  Mulai dari yang paling kamu butuhkan
                </h2>
                <p className="ml-section-sub">
                  Tidak perlu aktifkan semua sekaligus. Mulai dari satu modul,
                  tambah yang lain saat kamu butuh.
                </p>
              </div>

              <div className="ml-showcase-grid">
                {MODULE_CARDS.map((card) => (
                  <div key={card.id} className="ml-showcase-card">
                    <div className="ml-showcase-card-top">
                      <div className="ml-showcase-chips">
                        <span className="db-chip db-chip-amber">
                          {card.category}
                        </span>
                        <span className="db-chip db-chip-green">
                          {card.pricing}
                        </span>
                      </div>
                      <h3 className="ml-showcase-title">{card.title}</h3>
                      <p className="ml-showcase-desc">{card.desc}</p>
                    </div>
                    {card.details?.howItWorks && (
                      <ul className="ml-showcase-steps">
                        {card.details.howItWorks.slice(0, 3).map((step) => (
                          <li key={step}>
                            <CheckIcon />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      className="cta-button"
                      style={{ width: "100%", marginTop: "auto" }}
                      onClick={() =>
                        user
                          ? navigate(`/dashboard/module/${card.id}`)
                          : openAuth("signup")
                      }
                    >
                      Buka modul
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 6. Bottom CTA ────────────────────────────────── */}
          <section className="al-cta-banner">
            <div className="content">
              <div className="al-cta-inner">
                <div className="al-cta-copy">
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.06em",
                      margin: "0 0 8px",
                    }}
                  >
                    Mulai sekarang
                  </p>
                  <h2
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#fff",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.15,
                      margin: "0 0 8px",
                    }}
                  >
                    Semua modul gratis, langsung aktif
                  </h2>
                  <p
                    style={{
                      fontSize: 15,
                      color: "rgba(255,255,255,0.6)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    Buat akun dan mulai pakai modul bisnis Aispy hari ini.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="cta-button"
                    onClick={() => openAuth("signup")}
                  >
                    Buat akun gratis
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => navigate("/dashboard/module")}
                    style={{
                      color: "rgba(255,255,255,0.75)",
                      borderColor: "rgba(255,255,255,0.2)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
                      boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.2)",
                    }}
                  >
                    Lihat modul
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        {authOpen && (
          <AuthModal mode={authMode} onClose={() => setAuthOpen(false)} />
        )}
      </div>
    </div>
  );
}
