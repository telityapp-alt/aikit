import { useState, useRef, useEffect } from "react";
import "./Dashboard.css";

/* ── Inline SVG icons ──────────────────────────────────────── */
function IconGrid() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" />
      <path d="M19 17l.9 2.7L22 21l-2.1.3L19 24l-.9-2.7L16 21l2.1-.3L19 17z" />
      <path d="M5 3l.6 1.8L7 6l-1.4.2L5 8l-.6-1.8L3 6l1.4-.2L5 3z" />
    </svg>
  );
}
function IconZap() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2-3-2z" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconHeadset() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}
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
function IconActivity() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconPlay() {
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
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

/* ── Nav items ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <IconGrid /> },
  { id: "ai-agent", label: "AI Agent", icon: <IconSparkle /> },
  { id: "automasi", label: "Automasi", icon: <IconZap /> },
  { id: "module", label: "Module", icon: <IconLayers /> },
  { id: "file", label: "File", icon: <IconFile /> },
  { id: "tagihan", label: "Tagihan", icon: <IconReceipt /> },
  { id: "pengaturan", label: "Pengaturan", icon: <IconGear /> },
  { id: "dukungan", label: "Dukungan", icon: <IconHeadset /> },
];

/* ── Data: Automasi (product per-run) ──────────────────────── */
const AUTOMASI_CARDS = [
  {
    id: "ats-cv",
    title: "ATS-Friendly CV Converter",
    desc: "Ubah CV lama berbasis teks menjadi format ATS-Friendly secara instan.",
    type: "Automation",
    pricing: "Free",
    costPerRun: 0,
    users: 4,
    image:
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "invoice-gen",
    title: "Invoice Generator",
    desc: "Generate invoice profesional dari data sederhana dalam hitungan detik.",
    type: "Automation",
    pricing: "Free",
    costPerRun: 0,
    users: 12,
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "email-blast",
    title: "Email Blast Personalizer",
    desc: "Personalisasi ratusan email marketing secara otomatis dengan AI.",
    type: "Automation",
    pricing: "Paid",
    costPerRun: 150,
    users: 31,
    image:
      "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "social-caption",
    title: "Social Media Caption AI",
    desc: "Generate caption Instagram, Twitter, dan LinkedIn dari brief singkat.",
    type: "Automation",
    pricing: "Free",
    costPerRun: 0,
    users: 58,
    image:
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "pdf-summarizer",
    title: "PDF Summarizer",
    desc: "Rangkum dokumen PDF panjang menjadi poin-poin penting dalam menit.",
    type: "Automation",
    pricing: "Paid",
    costPerRun: 100,
    users: 19,
    image:
      "https://images.unsplash.com/photo-1568667256549-094345857637?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "data-cleaner",
    title: "Data Cleaner & Formatter",
    desc: "Bersihkan dan format data spreadsheet kotor secara otomatis.",
    type: "Automation",
    pricing: "Paid",
    costPerRun: 200,
    users: 7,
    image:
      "https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=400&h=200&fit=crop&auto=format",
  },
];

/* ── Data: Module (fitur besar / produk penuh) ─────────────── */
const MODULE_CARDS = [
  {
    id: "keuangan-pribadi",
    title: "Manajer Keuangan Pribadi",
    desc: "Lacak pengeluaran, buat anggaran, dan analisis pola keuangan bulanan kamu secara otomatis.",
    category: "Keuangan",
    pricing: "Free",
    users: 143,
    image:
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "crm-lite",
    title: "CRM Lite",
    desc: "Kelola kontak, pipeline penjualan, dan follow-up klien dalam satu tempat yang sederhana.",
    category: "Bisnis",
    pricing: "Pro",
    users: 67,
    image:
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "hr-attendance",
    title: "HR Attendance Tracker",
    desc: "Catat kehadiran karyawan, kelola izin, dan generate laporan bulanan otomatis.",
    category: "HR",
    pricing: "Pro",
    users: 34,
    image:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "content-planner",
    title: "Content Planner",
    desc: "Rencanakan kalender konten, schedule posting, dan pantau performa konten kamu.",
    category: "Marketing",
    pricing: "Free",
    users: 211,
    image:
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "inventory-manager",
    title: "Inventory Manager",
    desc: "Pantau stok barang, kelola supplier, dan dapatkan notifikasi restock otomatis.",
    category: "Operasional",
    pricing: "Pro",
    users: 88,
    image:
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&h=200&fit=crop&auto=format",
  },
  {
    id: "project-tracker",
    title: "Project Tracker",
    desc: "Kelola proyek tim dengan task board, deadline, dan laporan progres mingguan.",
    category: "Produktivitas",
    pricing: "Free",
    users: 176,
    image:
      "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop&auto=format",
  },
];

/* ── Reusable card component ───────────────────────────────── */
function ProductCard({
  title,
  desc,
  typeBadge,
  pricingBadge,
  users,
  ctaLabel,
  image,
  costPerRun,
}) {
  return (
    <article className="db-product-card">
      {image && (
        <div className="db-product-card-img-wrap">
          <img src={image} alt={title} className="db-product-card-img" />
          <div className="db-product-card-img-chips">
            <span className="db-chip db-chip-amber">{typeBadge}</span>
            <span
              className={`db-chip ${pricingBadge === "Free" || pricingBadge === "0" ? "db-chip-green" : "db-chip-blue"}`}
            >
              {pricingBadge}
            </span>
          </div>
        </div>
      )}
      {!image && (
        <div className="db-product-card-header">
          <div className="db-product-card-chips">
            <span className="db-chip db-chip-amber">{typeBadge}</span>
            <span
              className={`db-chip ${pricingBadge === "Free" ? "db-chip-green" : "db-chip-blue"}`}
            >
              {pricingBadge}
            </span>
          </div>
        </div>
      )}
      <div className="db-product-card-body">
        <h3 className="db-product-card-title">{title}</h3>
        <p className="db-product-card-desc">{desc}</p>
        {costPerRun !== undefined && (
          <div className="db-product-card-cost">
            <span className="db-cost-label">Biaya per run</span>
            <span className="db-cost-value">
              {costPerRun === 0 ? (
                <span className="db-cost-free">Gratis</span>
              ) : (
                <span>{costPerRun} kredit</span>
              )}
            </span>
          </div>
        )}
        <div className="db-product-card-footer">
          <span className="db-usage-count">
            <IconPeople />
            {users} pengguna
          </span>
          <button
            className="ghost-button"
            style={{ fontSize: "13px", height: "32px", padding: "0 14px" }}
          >
            <IconPlay /> {ctaLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── View: Dashboard (home) ────────────────────────────────── */
function ViewDashboard() {
  return (
    <>
      <div className="db-welcome">
        <h1 className="db-welcome-heading">Selamat Datang, Grou App! 👋</h1>
        <p className="db-welcome-sub">
          Siap mengotomasi proses bisnis Anda hari ini?
        </p>
      </div>

      <div className="db-stats-row">
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">0</span>
            <span className="db-stat-label">Saldo</span>
          </div>
          <button
            className="cta-button"
            style={{
              alignSelf: "flex-start",
              fontSize: "13px",
              height: "34px",
              padding: "0 16px",
            }}
          >
            Isi Saldo
          </button>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">0</span>
            <span className="db-stat-label">Automasi Aktif</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">0</span>
            <span className="db-stat-label">Total Penggunaan bulan ini</span>
          </div>
        </div>
      </div>

      <section aria-labelledby="mulai-cepat-heading">
        <div className="db-section-header">
          <h2 className="db-section-title" id="mulai-cepat-heading">
            Mulai Cepat
          </h2>
          <button className="db-section-link">Lihat Semua</button>
        </div>
        <div className="db-product-grid db-product-grid-1">
          <ProductCard
            title="ATS-Friendly CV Converter"
            desc="Automasi berbasis AI untuk mengubah CV lama berbasis teks (bukan JPG) menjadi format yang ramah ATS secara instan dan gratis."
            typeBadge="Automation"
            pricingBadge="Free"
            users={4}
            ctaLabel="Jalankan"
          />
        </div>
      </section>

      <section aria-labelledby="aktivitas-heading">
        <div className="db-section-header">
          <h2 className="db-section-title" id="aktivitas-heading">
            Aktivitas Terbaru
          </h2>
          <button className="db-section-link">Lihat Semua</button>
        </div>
        <div className="db-activity-list">
          <div className="db-activity-item">
            <div className="db-activity-icon" aria-hidden="true">
              <IconActivity />
            </div>
            <div className="db-activity-body">
              <div className="db-activity-row">
                <span className="db-activity-title">
                  ATS-Friendly CV Converter
                </span>
                <div className="db-activity-meta">
                  <span className="db-chip db-chip-green">Completed</span>
                  <span className="db-activity-time">2 hours ago</span>
                </div>
              </div>
              <p className="db-activity-snippet">CV telah siap...</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── View: Automasi ────────────────────────────────────────── */
function ViewAutomasi() {
  return (
    <>
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">Automasi</h1>
          <p className="db-view-sub">
            Jalankan automasi sekali klik — setiap kartu adalah satu pekerjaan
            spesifik.
          </p>
        </div>
      </div>
      <div className="db-product-grid">
        {AUTOMASI_CARDS.map((item) => (
          <ProductCard
            key={item.id}
            title={item.title}
            desc={item.desc}
            typeBadge={item.type}
            pricingBadge={item.pricing}
            users={item.users}
            ctaLabel="Jalankan"
            image={item.image}
            costPerRun={item.costPerRun}
          />
        ))}
      </div>
    </>
  );
}

/* ── View: Module ──────────────────────────────────────────── */
function ViewModule() {
  return (
    <>
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">Module</h1>
          <p className="db-view-sub">
            Sistem lengkap yang bisa kamu aktifkan — bukan satu tugas, tapi satu
            solusi penuh.
          </p>
        </div>
      </div>
      <div className="db-product-grid">
        {MODULE_CARDS.map((item) => (
          <ProductCard
            key={item.id}
            title={item.title}
            desc={item.desc}
            typeBadge={item.category}
            pricingBadge={item.pricing}
            users={item.users}
            ctaLabel="Buka"
            image={item.image}
          />
        ))}
      </div>
    </>
  );
}

/* ── AI Agent icons ───────────────────────────────────────── */
function IconPencil() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconChartBar() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconCode() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const AI_SKILLS = [
  {
    id: "tulis",
    title: "Tulis & Edit",
    desc: "Bantu menulis email, laporan, konten, atau dokumen apapun",
    icon: <IconPencil />,
  },
  {
    id: "analisis",
    title: "Analisis Data",
    desc: "Interpretasi data, buat ringkasan, atau temukan insight",
    icon: <IconChartBar />,
  },
  {
    id: "riset",
    title: "Riset & Rangkum",
    desc: "Cari informasi, rangkum artikel, atau jelaskan topik kompleks",
    icon: <IconSearch />,
  },
  {
    id: "kode",
    title: "Automasi & Kode",
    desc: "Bantu coding, debugging, atau buat skrip otomasi",
    icon: <IconCode />,
  },
];

/* ── View: AI Agent Home ───────────────────────────────────── */
function ViewAIAgentHome({
  setAiChatActive,
  setMessages,
  setActiveChatId,
  setChatHistory,
  chatHistory,
}) {
  const [localInput, setLocalInput] = useState("");

  function startChat(text) {
    if (!text.trim()) return;
    const newId = Date.now();
    const newMsg = { id: Date.now(), role: "user", text: text.trim() };
    const newHistoryItem = {
      id: newId,
      title: text.trim().slice(0, 40) + (text.trim().length > 40 ? "..." : ""),
      time: "Baru saja",
      preview: text.trim().slice(0, 32) + "...",
    };
    setChatHistory((prev) => [newHistoryItem, ...prev]);
    setActiveChatId(newId);
    setMessages([newMsg]);
    setAiChatActive(true);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startChat(localInput);
    }
  }

  return (
    <div className="ai-home">
      <div className="ai-home-center">
        {/* Greeting */}
        <div className="ai-home-greeting">
          <span className="ai-eyebrow">AI Agent</span>
          <h1 className="ai-home-heading">Halo, Grou App</h1>
          <p className="ai-home-sub">
            Saya siap membantu. Mau mulai dari mana?
          </p>
        </div>

        {/* Skill cards */}
        <div className="ai-skill-grid">
          {AI_SKILLS.map((skill) => (
            <button
              key={skill.id}
              className="ai-skill-card"
              onClick={() => startChat(skill.title + " — ")}
            >
              <div className="ai-skill-icon-wrap" aria-hidden="true">
                {skill.icon}
              </div>
              <div className="ai-skill-text">
                <span className="ai-skill-title">{skill.title}</span>
                <span className="ai-skill-desc">{skill.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="ai-home-input-wrap">
          <div className="ai-input-bar">
            <input
              className="ai-input-field"
              type="text"
              placeholder="Ketik pesan atau pilih skill di atas..."
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Pesan ke AI Agent"
            />
            <button
              className="cta-button ai-send-btn"
              onClick={() => startChat(localInput)}
              aria-label="Kirim pesan"
            >
              <IconSend /> Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── View: AI Agent Chat ───────────────────────────────────── */
function ViewAIAgentChat({
  chatHistory,
  activeChatId,
  setActiveChatId,
  messages,
  setMessages,
  inputValue,
  setInputValue,
  setAiChatActive,
  setActiveNav,
  setChatHistory,
}) {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [inputValue]);

  // Simulate AI response after user sends
  function sendMessage() {
    const text = inputValue.trim();
    if (!text) return;
    const userMsg = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: "Saya sedang memproses permintaan Anda. Ini adalah respons simulasi — integrasi AI nyata bisa ditambahkan nanti.",
        },
      ]);
    }, 800);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleNewChat() {
    const newId = Date.now();
    const newHistoryItem = {
      id: newId,
      title: "Obrolan Baru",
      time: "Baru saja",
      preview: "Mulai percakapan...",
    };
    setChatHistory((prev) => [newHistoryItem, ...prev]);
    setActiveChatId(newId);
    setMessages([]);
    setInputValue("");
  }

  return (
    <div className="ai-chat-shell">
      {/* Left sidebar */}
      <aside className="ai-chat-sidebar">
        <div className="ai-chat-sidebar-top">
          <button
            className="ai-back-btn"
            onClick={() => {
              setAiChatActive(false);
              setActiveNav("dashboard");
            }}
          >
            <IconArrowLeft /> Kembali
          </button>

          <span className="ai-eyebrow ai-history-label">Riwayat Chat</span>

          <ul className="ai-history-list" role="list">
            {chatHistory.map((chat) => (
              <li key={chat.id}>
                <button
                  className={`ai-history-item${chat.id === activeChatId ? " ai-history-active" : ""}`}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setMessages([]);
                  }}
                >
                  <span className="ai-history-title">{chat.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="ai-chat-sidebar-foot">
          <button
            className="cta-button ai-new-chat-btn"
            onClick={handleNewChat}
          >
            <IconPlus /> Obrolan Baru
          </button>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="ai-chat-main">
        {/* Top bar */}
        <div className="ai-chat-topbar">
          <span className="ai-chat-status-dot" aria-hidden="true" />
          <span className="ai-chat-model-label">SiapPakai AI</span>
        </div>

        {/* Messages */}
        <div className="ai-messages" role="log" aria-live="polite">
          <div className="ai-messages-inner">
            {messages.length === 0 ? (
              <div className="ai-messages-empty">
                <div>
                  <p className="ai-messages-empty-heading">Halo, Grou App 👋</p>
                  <p className="ai-messages-empty-sub">Mau mulai dari mana?</p>
                </div>
                <div className="ai-messages-empty-skills">
                  {AI_SKILLS.map((skill) => (
                    <button
                      key={skill.id}
                      className="ai-messages-empty-skill-btn"
                      onClick={() => {
                        setInputValue(skill.title + " — ");
                        textareaRef.current?.focus();
                      }}
                    >
                      <span className="ai-messages-empty-skill-icon">
                        {skill.icon}
                      </span>
                      <span className="ai-messages-empty-skill-title">
                        {skill.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="ai-msg-row ai-msg-row--user">
                    <div className="ai-bubble ai-bubble--user">{msg.text}</div>
                  </div>
                ) : (
                  <div key={msg.id} className="ai-msg-row ai-msg-row--ai">
                    <div className="ai-avatar-sp" aria-label="SiapPakai AI">
                      SP
                    </div>
                    <div className="ai-bubble ai-bubble--ai">{msg.text}</div>
                  </div>
                ),
              )
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="ai-chat-input-area">
          <div className="ai-chat-input-inner">
            <div className="ai-chat-input-bar">
              <textarea
                ref={textareaRef}
                className="ai-chat-textarea"
                placeholder="Ketik pesan..."
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Pesan ke SiapPakai AI"
              />
              <button
                className="cta-button ai-chat-send-btn"
                onClick={sendMessage}
                aria-label="Kirim pesan"
              >
                <IconSend />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── View: placeholder for other nav items ─────────────────── */
function ViewPlaceholder({ label }) {
  return (
    <div className="db-placeholder">
      <span className="db-placeholder-label">{label}</span>
      <p className="db-placeholder-sub">
        Halaman ini sedang dalam pengembangan.
      </p>
    </div>
  );
}

/* ── Main Dashboard component ──────────────────────────────── */
export default function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [aiChatActive, setAiChatActive] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      title: "Analisis CV untuk posisi PM",
      time: "2 hours ago",
      preview: "Bantu saya...",
    },
    {
      id: 2,
      title: "Buat email follow-up klien",
      time: "Yesterday",
      preview: "Tulis email...",
    },
    {
      id: 3,
      title: "Ringkas dokumen proposal",
      time: "3 days ago",
      preview: "Rangkum...",
    },
  ]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  function handleNavClick(id) {
    setActiveNav(id);
    if (id !== "ai-agent") setAiChatActive(false);
    window.history.pushState({}, "", "/dashboard");
  }

  function renderView() {
    switch (activeNav) {
      case "dashboard":
        return <ViewDashboard />;
      case "automasi":
        return <ViewAutomasi />;
      case "module":
        return <ViewModule />;
      case "ai-agent":
        return (
          <ViewAIAgentHome
            setAiChatActive={setAiChatActive}
            setMessages={setMessages}
            setActiveChatId={setActiveChatId}
            setChatHistory={setChatHistory}
            chatHistory={chatHistory}
          />
        );
      default:
        return (
          <ViewPlaceholder
            label={
              NAV_ITEMS.find((n) => n.id === activeNav)?.label ?? activeNav
            }
          />
        );
    }
  }

  // Fullscreen chat — replaces the entire db-shell
  if (aiChatActive) {
    return (
      <ViewAIAgentChat
        chatHistory={chatHistory}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        messages={messages}
        setMessages={setMessages}
        inputValue={inputValue}
        setInputValue={setInputValue}
        setAiChatActive={setAiChatActive}
        setActiveNav={setActiveNav}
        setChatHistory={setChatHistory}
      />
    );
  }

  return (
    <div className="db-shell">
      <aside className="db-sidebar">
        <div className="db-sidebar-logo">
          <span className="db-wordmark">SiapPakai</span>
        </div>

        <nav aria-label="Main navigation">
          <ul className="db-nav" role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.id} className="db-nav-item">
                <button
                  className={`db-nav-link${activeNav === item.id ? " db-nav-active" : ""}`}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={activeNav === item.id ? "page" : undefined}
                >
                  <span className="db-nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="db-sidebar-footer">
          <div className="db-avatar" aria-hidden="true">
            GA
          </div>
          <div>
            <div className="db-sidebar-user-name">Grou App</div>
            <div className="db-sidebar-user-role">Workspace</div>
          </div>
        </div>
      </aside>

      <main className="db-main">
        <div className="db-main-inner">{renderView()}</div>
      </main>
    </div>
  );
}
