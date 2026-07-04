import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../lib/AuthContext";
import { AUTOMATION_CARDS } from "../lib/automationCards";
import { MASCOT_SCENES } from "../lib/mascots";
import AuthModal from "../components/AuthModal";

/* ── Data ────────────────────────────────────────────────────── */
const AUTOMASI_CARDS = AUTOMATION_CARDS.map((card) => ({
  ...card,
  category: card.details?.category || "Lainnya",
}));

const CATEGORIES = ["Semua", ...new Set(AUTOMASI_CARDS.map((card) => card.category))];

/* Semua cover images untuk marquee strip — duplikat untuk seamless loop */
const MARQUEE_IMAGES = [...AUTOMASI_CARDS, ...AUTOMASI_CARDS];

/* Zigzag features — image kiri/kanan bergantian */
const FEATURES = [
  {
    eyebrow: "Output siap pakai",
    title: "Hasil langsung bisa diunduh dan dipakai",
    desc: "Setiap automasi menghasilkan output terstruktur — laporan Excel, data bersih, dashboard insight. Tidak perlu olah ulang, langsung masuk ke presentasi atau laporan kamu.",
    bullets: [
      "Format Excel, CSV, dan teks siap salin",
      "Data sudah dibersihkan dan dikelompokkan",
      "Bisa langsung lampirkan ke laporan",
    ],
    image: "/tab-analytics.png",
    imageAlt: "Contoh output laporan Excel dari automasi",
  },
  {
    eyebrow: "Marketplace, bukan software",
    title: "Pilih hanya yang kamu butuhkan, bayar saat dipakai",
    desc: "Tidak ada langganan bulanan yang menguras. Pilih automasi sesuai kebutuhan hari ini, jalankan, bayar per pemakaian. Seperti memesan jasa, bukan membeli software.",
    bullets: [
      "Tidak ada biaya bulanan tetap",
      "Bayar hanya saat menjalankan automasi",
      "Bebas pilih automasi mana saja",
    ],
    image: "/tab-onboarding.png",
    imageAlt: "Tampilan pilihan automasi di marketplace",
  },
  {
    eyebrow: "Tidak perlu koding",
    title: "Siap pakai tanpa setup teknis apapun",
    desc: "Semua automasi sudah dikonfigurasi penuh. Kamu hanya perlu isi form singkat — nama akun, kata kunci, atau URL — lalu tekan jalankan. Sistem yang bekerja di balik layar.",
    bullets: [
      "Tidak ada instalasi atau konfigurasi server",
      "Form sederhana, hasil kompleks",
      "Berjalan di semua browser dan perangkat",
    ],
    image: "/tab-rollout.png",
    imageAlt: "Form sederhana untuk menjalankan automasi",
  },
];

/* ── Icons ───────────────────────────────────────────────────── */
function CheckIcon() {
  return (
    <svg
      className="bullet-icon"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="8" />
      <path
        d="M5 8.5L7 10.5L11 6.5"
        stroke="#1d6e61"
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

/* ── Wordmark (sama persis dengan App.jsx) ───────────────────── */
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

/* ── Marquee strip component ─────────────────────────────────── */
function MarqueeStrip() {
  return (
    <div className="al-marquee-wrap" aria-hidden="true">
      <div className="al-marquee-track">
        {MARQUEE_IMAGES.map((card, i) => (
          <div key={`${card.id}-${i}`} className="al-marquee-card">
            <img
              src={card.image}
              alt={card.title}
              className="al-marquee-img"
              loading="lazy"
            />
            <div className="al-marquee-label">{card.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function AutomasiLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const galleryRef = useRef(null);

  function openAuth(mode) {
    if (user) {
      navigate("/dashboard");
      return;
    }
    setAuthMode(mode);
    setAuthOpen(true);
  }

  function handleGalleryScroll() {
    galleryRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const filtered =
    categoryFilter === "Semua"
      ? AUTOMASI_CARDS
      : AUTOMASI_CARDS.filter((c) => c.category === categoryFilter);

  return (
    <div className="page-shell">
      <div className="site-frame">
        <Header onOpenAuth={openAuth} />

        <main>
          {/* ── 1. Hero ────────────────────────────────────────── */}
          <section className="content">
            <div className="hero">
              {/* Left: copy */}
              <div className="hero-copy">
                <Wordmark />
                <h1>Semua pekerjaan berulang, selesai otomatis</h1>
                <p>
                  Pilih dari puluhan automasi siap pakai. Jalankan, dapat
                  hasilnya — laporan, data, konten — langsung bisa diunduh atau
                  diintegrasikan ke workflow kamu.
                </p>
                <ul className="hero-highlights" aria-label="Keunggulan utama">
                  {[
                    "Tidak perlu belajar koding apapun",
                    "Hasil berformat bisnis — Excel, laporan, insight",
                    "Bayar hanya saat dipakai, tidak ada biaya bulanan",
                    "Katalog terus bertambah setiap minggu",
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
                    Coba sekarang gratis
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleGalleryScroll}
                  >
                    Lihat semua automasi
                  </button>
                </div>
              </div>

              {/* Right: mascot */}
              <div className="hero-visual">
                <div className="hero-image-shell">
                  <img
                    src={MASCOT_SCENES.landingHero}
                    alt="aikit mascot bekerja dengan laptop"
                    className="hero-generated-image"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── 2. Marquee strip — output slideshow ────────────── */}
          <MarqueeStrip />

          {/* ── 3. Gallery ─────────────────────────────────────── */}
          <section ref={galleryRef} className="al-gallery-section">
            {/* Dark banner header */}
            <div className="al-gallery-banner">
              <div className="content">
                <p className="al-banner-eyebrow">Katalog Automasi</p>
                <h2 className="al-banner-title">Pilih dan jalankan sekarang</h2>
                <p className="al-banner-desc">
                  Setiap automasi sudah dikonfigurasi — tinggal pilih, isi
                  parameter, dan hasil siap dalam hitungan menit.
                </p>
              </div>
            </div>

            {/* Grid dengan filter pills */}
            <div className="content" style={{ padding: "32px 0 60px" }}>
              {/* Category filter pills — sama dengan landing utama */}
              <div className="library-filter-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`library-pill${categoryFilter === cat ? " active" : ""}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat === "Semua"
                      ? `Semua (${AUTOMASI_CARDS.length})`
                      : `${cat} (${AUTOMASI_CARDS.filter((c) => c.category === cat).length})`}
                  </button>
                ))}
              </div>

              {/* Cards grid */}
              <div className="library-grid">
                {filtered.map((card) => (
                  <article key={card.id} className="db-product-card">
                    <div className="db-product-card-img-wrap">
                      <img
                        className="db-product-card-img"
                        src={card.image}
                        alt={card.title}
                        loading="lazy"
                      />
                      <div className="db-product-card-img-chips">
                        <span className="db-chip db-chip-amber">
                          {card.type}
                        </span>
                      </div>
                    </div>
                    <div className="db-product-card-body">
                      <div className="db-product-card-header">
                        <div className="db-product-card-chips">
                          <span className="db-chip db-chip-green">
                            {card.pricing}
                          </span>
                        </div>
                      </div>
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
                        <button
                          type="button"
                          className="cta-button"
                          style={{
                            fontSize: "13px",
                            height: "32px",
                            padding: "0 14px",
                          }}
                          onClick={() =>
                            user
                              ? navigate(`/dashboard/automasi/${card.id}`)
                              : openAuth("signup")
                          }
                        >
                          Gunakan
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── 4. Cara kerja (zigzag) ─────────────────────────── */}
          <section className="al-section al-section-light">
            <div className="content">
              <div className="al-section-header">
                <p className="al-eyebrow">Cara kerja</p>
                <h2 className="al-section-heading">
                  Tiga langkah, hasil nyata
                </h2>
                <p className="al-section-sub">
                  Tidak ada kurva belajar. Kamu tidak perlu paham cara kerjanya
                  di balik layar — cukup isi, jalankan, terima hasilnya.
                </p>
              </div>

              <div className="al-zigzag-list">
                {[
                  {
                    num: "01",
                    title: "Pilih automasi yang kamu butuhkan",
                    desc: "Browse katalog dan pilih alat yang sesuai dengan pekerjaan kamu hari ini. Setiap automasi punya deskripsi jelas tentang apa yang dihasilkan.",
                    image: "/tab-onboarding.png",
                    imageAlt: "Memilih automasi dari katalog",
                  },
                  {
                    num: "02",
                    title: "Isi parameter dan jalankan",
                    desc: "Masukkan data yang dibutuhkan — nama akun, URL, kata kunci, atau pilihan lainnya. Lalu tekan jalankan. Sistem langsung bekerja.",
                    image: "/tab-rollout.png",
                    imageAlt: "Mengisi parameter automasi",
                  },
                  {
                    num: "03",
                    title: "Terima dan gunakan hasilnya",
                    desc: "Hasil muncul dalam hitungan menit. Unduh sebagai Excel atau CSV, salin langsung, atau hubungkan ke tools lain yang sudah kamu pakai.",
                    image: "/tab-analytics.png",
                    imageAlt: "Hasil automasi siap diunduh",
                  },
                ].map((step, i) => (
                  <div
                    key={step.num}
                    className={`al-zigzag-row${i % 2 === 1 ? " al-zigzag-row-reverse" : ""}`}
                  >
                    <div className="al-zigzag-copy">
                      <span className="al-step-badge">{step.num}</span>
                      <h3 className="al-zigzag-title">{step.title}</h3>
                      <p className="al-zigzag-desc">{step.desc}</p>
                    </div>
                    <div className="al-zigzag-img-wrap">
                      <img
                        src={step.image}
                        alt={step.imageAlt}
                        className="al-zigzag-img"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 5. Features (zigzag) ───────────────────────────── */}
          <section className="al-section al-section-warm">
            <div className="content">
              <div className="al-section-header">
                <p className="al-eyebrow">Kenapa aikit</p>
                <h2 className="al-section-heading">
                  Dirancang untuk langsung pakai
                </h2>
                <p className="al-section-sub">
                  Marketplace automasi pertama yang outputnya benar-benar siap
                  bisnis — bukan sekedar demo atau prototipe.
                </p>
              </div>

              <div className="al-zigzag-list">
                {FEATURES.map((feat, i) => (
                  <div
                    key={feat.eyebrow}
                    className={`al-zigzag-row${i % 2 === 1 ? " al-zigzag-row-reverse" : ""}`}
                  >
                    <div className="al-zigzag-copy">
                      <p className="al-eyebrow">{feat.eyebrow}</p>
                      <h3 className="al-zigzag-title">{feat.title}</h3>
                      <p className="al-zigzag-desc">{feat.desc}</p>
                      <ul className="al-bullet-list">
                        {feat.bullets.map((b) => (
                          <li key={b}>
                            <CheckIcon />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="al-zigzag-img-wrap">
                      <img
                        src={feat.image}
                        alt={feat.imageAlt}
                        className="al-zigzag-img"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 6. Apa itu Automasi ────────────────────────────── */}
          <section className="al-section al-section-light">
            <div className="content">
              <div className="al-section-header">
                <p className="al-eyebrow">Tentang automasi</p>
                <h2 className="al-section-heading">Apa itu Automasi?</h2>
                <p className="al-section-sub">
                  Automasi adalah alat kerja yang sudah dikonfigurasi sepenuhnya
                  — kamu tidak perlu tahu cara kerjanya di balik layar. Seperti
                  mesin kopi — kamu tekan tombol, kopi keluar.
                </p>
              </div>

              <div className="al-info-grid">
                {[
                  {
                    num: "01",
                    title: "Tinggal isi, langsung jalan",
                    desc: "Tidak ada setup rumit. Isi form singkat, klik jalankan, sistem yang bekerja di balik layar untuk menghasilkan output kamu.",
                  },
                  {
                    num: "02",
                    title: "Hasil yang bisa langsung dipakai",
                    desc: "Output dalam format yang familiar: Excel, laporan, dashboard data, atau teks siap salin. Tidak perlu diolah lagi.",
                  },
                  {
                    num: "03",
                    title: "Marketplace, bukan software",
                    desc: "Seperti belanja aplikasi — pilih yang kamu butuhkan, pakai saat dibutuhkan, bayar per pemakaian. Tidak ada komitmen jangka panjang.",
                  },
                ].map((item) => (
                  <div key={item.num} className="al-info-card">
                    <div className="al-info-card-num">{item.num}</div>
                    <h3 className="al-info-card-title">{item.title}</h3>
                    <p className="al-info-card-desc">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 7. Bottom CTA (dark banner) ────────────────────── */}
          <section className="al-cta-banner">
            <div className="content">
              <div className="al-cta-inner">
                <div className="al-cta-copy">
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.08em",
                      margin: "0 0 8px",
                    }}
                  >
                    Mulai sekarang
                  </p>
                  <h2
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: "#fff",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                      margin: "0 0 12px",
                    }}
                  >
                    Coba automasi pertama kamu gratis
                  </h2>
                  <p
                    style={{
                      fontSize: 16,
                      color: "rgba(255,255,255,0.65)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    Beberapa automasi tersedia gratis. Tidak perlu kartu kredit
                    untuk mulai.
                  </p>
                </div>
                <div className="hero-actions" style={{ flexShrink: 0 }}>
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
                    onClick={handleGalleryScroll}
                    style={{
                      color: "rgba(255,255,255,0.75)",
                      borderColor: "rgba(255,255,255,0.2)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
                      boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.2)",
                    }}
                  >
                    Lihat katalog
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

