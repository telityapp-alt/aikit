import { useState, useRef, useEffect, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MODULE_CARDS, MODULE_CARD_MAP } from "../lib/moduleCards";
import { AUTOMATION_CARDS } from "../lib/automationCards";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../lib/ToastContext";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";
import { fmt } from "../lib/format";
import { getModuleComponent, getModuleEntry } from "../modules/registry";
import { MASCOT_SCENES } from "../lib/mascots";
import AIAgentsHome from "../features/ai/pages/AIAgentsHome";
import AgentWorkspace from "../features/ai/pages/AgentWorkspace";

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

function IconSignOut() {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/* ── Nav items ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <IconGrid /> },
  { id: "ai-agent", label: "AI Agents", icon: <IconSparkle /> },
  { id: "automasi", label: "Automasi", icon: <IconZap /> },
  { id: "module", label: "Module", icon: <IconLayers /> },
  { id: "file", label: "File", icon: <IconFile /> },
  { id: "tagihan", label: "Tagihan", icon: <IconReceipt /> },
  { id: "pengaturan", label: "Pengaturan", icon: <IconGear /> },
  { id: "dukungan", label: "Dukungan", icon: <IconHeadset /> },
];

/* ── Data: Automasi (product per-run) ──────────────────────── */
const AUTOMASI_CARDS = AUTOMATION_CARDS;

const AUTOMATION_IMAGE_OVERRIDES = Object.fromEntries(
  AUTOMASI_CARDS.filter((card) => card.id && card.image).map((card) => [
    card.id,
    card.image,
  ]),
);

/* MODULE_CARDS and MODULE_CARD_MAP imported from src/lib/moduleCards.js */
const MARKETING_CORE_SLUGS = [
  "contact-manager",
  "campaign-manager",
  "content-calendar",
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
  onCta,
  busy,
}) {
  return (
    <article className="db-product-card">
      {image && (
        <div className="db-product-card-img-wrap">
          <img src={image} alt={title} className="db-product-card-img" />
          <div className="db-product-card-img-chips">
            <span className="db-chip db-chip-amber">{typeBadge}</span>
            <span
              className={`db-chip ${pricingBadge === "Free" || pricingBadge === "Gratis" || pricingBadge === "0" ? "db-chip-green" : "db-chip-amber"}`}
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
              className={`db-chip ${pricingBadge === "Free" || pricingBadge === "Gratis" ? "db-chip-green" : "db-chip-amber"}`}
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
            onClick={onCta}
            disabled={busy}
          >
            <IconPlay /> {busy ? "Menjalankan..." : ctaLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

// Poll a run row until it reaches a terminal status or times out.
async function pollRun(runId, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await api.getAutomationRunStatus(runId);
    const status = result?.run?.status;
    if (status && (status === "completed" || status === "failed")) {
      return status;
    }
    await new Promise((r) => setTimeout(r, 1400));
  }
  return "running";
}

/* ── View: Dashboard (home) ────────────────────────────────── */
function relativeTime(iso) {
  return fmt.relativeTime(iso);
}

function ViewDashboard({ onNavigate, onOpenModule, onTopUp }) {
  const { user, profile } = useAuth();
  const isSuperAdmin = profile?.is_super_admin === true;
  const [recent, setRecent] = useState([]);
  const [usageMonth, setUsageMonth] = useState(0);

  useEffect(() => {
    api
      .getRecentAutomationRuns()
      .then(({ runs }) => {
        const nextRuns = runs || [];
        setRecent(nextRuns.slice(0, 5));

        const startMonth = new Date();
        startMonth.setDate(1);
        startMonth.setHours(0, 0, 0, 0);
        setUsageMonth(
          nextRuns.filter((run) => new Date(run.created_at) >= startMonth).length,
        );
      })
      .catch(() => {
        setRecent([]);
        setUsageMonth(0);
      });
  }, []);

  const balance = profile?.credits_balance ?? 0;
  const balanceLabel = isSuperAdmin ? "Unlimited" : balance;

  return (
    <>
      <div className="db-welcome">
        <div className="db-welcome-copy">
          <h1 className="db-welcome-heading">
            Selamat Datang,{" "}
            {profile?.full_name ||
              profile?.username ||
              user?.email?.split("@")[0] ||
              "kamu"}
            ! 👋
          </h1>
          <p className="db-welcome-sub">
            Siap mengotomasi proses bisnis Anda hari ini?
          </p>
        </div>
        <img
          src={MASCOT_SCENES.dashboardWelcome}
          alt=""
          aria-hidden="true"
          className="db-welcome-mascot"
        />
      </div>

      <div className="db-stats-row">
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{balanceLabel}</span>
            <span className="db-stat-label">{isSuperAdmin ? "Super Admin" : "Saldo"}</span>
          </div>
          <button
            className="cta-button"
            style={{
              alignSelf: "flex-start",
              fontSize: "13px",
              height: "34px",
              padding: "0 16px",
            }}
            onClick={onTopUp}
          >
            Isi Saldo
          </button>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">
              {recent.filter((r) => r.status === "running").length}
            </span>
            <span className="db-stat-label">Automasi Aktif</span>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">{usageMonth}</span>
            <span className="db-stat-label">Total Penggunaan bulan ini</span>
          </div>
        </div>
      </div>

      <section aria-labelledby="marketing-core-heading">
        <div className="db-section-header">
          <h2 className="db-section-title" id="marketing-core-heading">
            Marketing Core
          </h2>
          <button
            className="db-section-link"
            onClick={() => onNavigate("module")}
          >
            Lihat Semua
          </button>
        </div>
        <div className="db-product-grid">
          {MARKETING_CORE_SLUGS.map((slug) => {
            const card = MODULE_CARD_MAP[slug];
            return (
              <ProductCard
                key={slug}
                title={card.title}
                desc={card.desc}
                typeBadge={card.category}
                pricingBadge={card.pricing}
                users={card.users}
                ctaLabel="Buka"
                image={card.image}
                onCta={() => onOpenModule(slug)}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="aktivitas-heading">
        <div className="db-section-header">
          <h2 className="db-section-title" id="aktivitas-heading">
            Aktivitas Terbaru
          </h2>
          <button
            className="db-section-link"
            onClick={() => onNavigate("automasi")}
          >
            Lihat Semua
          </button>
        </div>
        <div className="db-activity-list">
          {recent.length === 0 ? (
            <div className="db-activity-item">
              <div className="db-activity-icon" aria-hidden="true">
                <IconActivity />
              </div>
              <div className="db-activity-body">
                <div className="db-activity-row">
                  <span className="db-activity-title">Belum ada aktivitas</span>
                </div>
                <p className="db-activity-snippet">
                  Jalankan automasi pertama kamu untuk melihatnya di sini.
                </p>
              </div>
            </div>
          ) : (
            recent.map((r) => (
              <div className="db-activity-item" key={r.id}>
                <div className="db-activity-icon" aria-hidden="true">
                  <IconActivity />
                </div>
                <div className="db-activity-body">
                  <div className="db-activity-row">
                    <span className="db-activity-title">{r.title}</span>
                    <div className="db-activity-meta">
                      <span
                        className={`db-chip ${r.status === "completed" ? "db-chip-green" : r.status === "failed" ? "db-chip-amber" : "db-chip-amber"}`}
                      >
                        {r.status}
                      </span>
                      <span className="db-activity-time">
                        {relativeTime(r.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

/* ── View: Automasi ────────────────────────────────────────── */
function ViewAutomasi({ onOpenApp }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api
      .getAutomationCatalog()
      .then(({ automations }) => {
        setItems(
          ((dbList) => {
            const appCards = AUTOMASI_CARDS.filter((c) => c.type === "App");
            const dbIds = new Set(dbList.map((d) => d.id));
            const missing = appCards.filter((c) => !dbIds.has(c.id));
            return [...missing, ...dbList];
          })(
            automations && automations.length
              ? automations.map((d) => ({
                  id: d.slug,
                  title: d.title,
                  desc: d.description,
                  type: d.type,
                  pricing: d.pricing,
                  costPerRun: d.cost_per_run,
                  users: 0,
                  image: AUTOMATION_IMAGE_OVERRIDES[d.slug] || d.image,
                }))
              : AUTOMASI_CARDS,
          ),
        );
      })
      .catch(() => setItems(AUTOMASI_CARDS));
  }, []);

  async function run(slug, title) {
    setBusyId(slug);
    try {
      const { run: started } = await api.runAutomation(slug, {});
      toast.info(`"${title}" sedang diproses...`);
      const finalStatus = await pollRun(started.id, 30000);
      if (finalStatus === "completed") {
        toast.success(`"${title}" selesai. Lihat hasilnya di menu File.`);
      } else if (finalStatus === "failed") {
        toast.error(`"${title}" gagal. Kredit dikembalikan.`);
      } else {
        toast.info(`"${title}" masih diproses di latar belakang.`);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">Automasi</h1>
          <p className="db-view-sub">
            Sekali klik untuk menjalankan automasi yang kamu butuhkan.
          </p>
        </div>
      </div>

      <div className="db-product-grid">
        {(items ?? AUTOMASI_CARDS).map((item) => {
          const isApp = item.type === "App";
          const isBusy = busyId === item.id;

          return (
            <ProductCard
              key={item.id || item.title}
              title={item.title}
              desc={item.desc}
              typeBadge={item.type}
              pricingBadge={item.pricing}
              users={item.users ?? 0}
              ctaLabel={isApp ? "Buka" : "Jalankan"}
              image={item.image}
              costPerRun={item.costPerRun}
              busy={isBusy}
              onCta={() =>
                isApp ? onOpenApp(item.id) : run(item.id, item.title)
              }
            />
          );
        })}
      </div>
    </>
  );
}
/* ── View: Module ──────────────────────────────────────────── */
function ViewModule({ onOpen }) {
  const [items, setItems] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    supabase
      .from("modules")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setItems(
          data && data.length
            ? data
                .filter((d) => getModuleEntry(d.slug))
                .map((d) => ({
                  id: d.slug,
                  title: d.title,
                  desc: d.description,
                  category: d.category,
                  pricing: d.pricing,
                  users: MODULE_CARD_MAP[d.slug]?.users ?? 0,
                  image: d.image || MODULE_CARD_MAP[d.slug]?.image,
                }))
            : MODULE_CARDS,
        );
      });
  }, []);

  const list = items ?? MODULE_CARDS;
  const categories = [
    "All",
    ...new Set(list.map((i) => i.category).filter(Boolean)),
  ];

  const filteredList = list.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.desc &&
        item.desc.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      activeCategory === "All" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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

      <div
        className="db-filters"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <input
          type="text"
          placeholder="Cari module..."
          className="text-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: "400px" }}
        />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={activeCategory === cat ? "cta-button" : "ghost-button"}
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                height: "auto",
                borderRadius: "16px",
              }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="db-product-grid">
        {filteredList.map((item) => (
          <ProductCard
            key={item.id}
            title={item.title}
            desc={item.desc}
            typeBadge={item.category}
            pricingBadge={item.pricing}
            users={item.users}
            ctaLabel="Buka"
            image={item.image}
            onCta={() => onOpen(item.id)}
          />
        ))}
      </div>
    </>
  );
}

/* ── View: Module host (renders a specific mini-app) ───────── */
function ViewModuleHost({ slug, onBack }) {
  const Comp = getModuleComponent(slug);
  if (!Comp) {
    return (
      <div className="db-placeholder">
        <span className="db-placeholder-label">Module belum tersedia</span>
        <p className="db-placeholder-sub">
          Mini-app untuk "{slug}" sedang dalam pengembangan.
        </p>
        <button
          className="ghost-button"
          style={{ marginTop: "14px" }}
          onClick={onBack}
        >
          Kembali ke daftar Module
        </button>
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="db-placeholder">
          <span className="db-placeholder-label">Memuat module...</span>
        </div>
      }
    >
      <Comp />
    </Suspense>
  );
}

/* ── AI Agent icons ───────────────────────────────────────── */

/* ── View: AI Agent Home ───────────────────────────────────── */
function IconSend() {
  return null;
}

function IconArrowLeft() {
  return null;
}

function IconPlus() {
  return null;
}

function ViewAIAgentHome() {
  return null;
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
  serverChatId,
  setServerChatId,
  openChat,
  reloadChats,
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

  // If we arrived from the home view with a single seed message, send it.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!serverChatId && messages.length === 1 && messages[0].role === "user") {
      seededRef.current = true;
      const seed = messages[0].text;
      api
        .sendChat(null, seed)
        .then((res) => {
          if (res?.chatId) setServerChatId(res.chatId);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "ai",
              text: res?.reply || "(tidak ada respons)",
            },
          ]);
          reloadChats?.();
        })
        .catch((e) =>
          setMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, role: "ai", text: `⚠️ ${e.message}` },
          ]),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send to the AI Agent backend (/api/chat) and append the real reply.
  async function sendMessage() {
    const text = inputValue.trim();
    if (!text) return;
    const userMsg = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    try {
      const wasNew = !serverChatId;
      const res = await api.sendChat(serverChatId, text);
      if (res?.chatId) setServerChatId(res.chatId);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: res?.reply || "(tidak ada respons)",
        },
      ]);
      if (wasNew) reloadChats?.();
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "ai", text: `⚠️ ${e.message}` },
      ]);
    }
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
    setServerChatId(null);
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
                  onClick={() => openChat(chat.id)}
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

/* ── View: Pengaturan (profile settings) ───────────────────── */

void ViewAIAgentHome;
void ViewAIAgentChat;

function ViewPengaturan() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setWorkspace(profile?.workspace_name || "");
  }, [profile]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const initials = (fullName.replace(/[^a-zA-Z]/g, "") + "A")
      .slice(0, 2)
      .toUpperCase();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        workspace_name: workspace,
        avatar_initials: initials,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profil tersimpan.");
  }

  return (
    <>
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">Pengaturan</h1>
          <p className="db-view-sub">Kelola profil dan workspace kamu.</p>
        </div>
      </div>
      <div className="db-settings-card">
        <h2 className="db-settings-card-title">Profil</h2>
        <p className="db-settings-card-sub">Informasi dasar akun kamu.</p>
        <form className="db-settings-form" onSubmit={save}>
          <label className="db-field">
            <span>Nama lengkap</span>
            <input
              className="db-field-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama kamu"
            />
          </label>
          <label className="db-field">
            <span>Nama workspace</span>
            <input
              className="db-field-input"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder="Workspace"
            />
          </label>
          <label className="db-field">
            <span>Email</span>
            <input
              className="db-field-input"
              value={user?.email || ""}
              disabled
            />
          </label>
          <button
            type="submit"
            className="cta-button db-settings-save"
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </form>
      </div>

      <ChangePasswordCard />

      <div className="db-settings-card">
        <h2 className="db-settings-card-title">Akun</h2>
        <p className="db-settings-card-sub">
          Dokumen legal dan informasi akun.
        </p>
        <div className="db-settings-links">
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Kebijakan Privasi
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Syarat dan Ketentuan
          </a>
          <a href="mailto:support@aikit.id">Hubungi dukungan</a>
        </div>
      </div>
    </>
  );
}

/* ── Change password (Keamanan) ────────────────────────────── */
function ChangePasswordCard() {
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password minimal 6 karakter.");
    if (pw !== pw2) return toast.error("Konfirmasi password tidak cocok.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPw("");
    setPw2("");
    toast.success("Password berhasil diubah.");
  }

  return (
    <div className="db-settings-card">
      <h2 className="db-settings-card-title">Keamanan</h2>
      <p className="db-settings-card-sub">Ganti password akun kamu.</p>
      <form className="db-settings-form" onSubmit={submit}>
        <label className="db-field">
          <span>Password baru</span>
          <input
            className="db-field-input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
          />
        </label>
        <label className="db-field">
          <span>Konfirmasi password baru</span>
          <input
            className="db-field-input"
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Ulangi password baru"
            autoComplete="new-password"
          />
        </label>
        <button
          type="submit"
          className="cta-button db-settings-save"
          disabled={saving}
        >
          {saving ? "Menyimpan..." : "Ganti password"}
        </button>
      </form>
    </div>
  );
}

/* ── View: Tagihan (credits + transactions) ────────────────── */
function ViewTagihan() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.is_super_admin === true;
  const toast = useToast();
  const [tx, setTx] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () =>
    supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setTx(data || []));

  useEffect(() => {
    load();
  }, []);

  async function topUp() {
    setBusy(true);
    try {
      const res = await api.topUp(50000);
      toast.info(res?.note || "Top-up dibuat (stub).");
      if (res?.invoiceUrl) window.open(res.invoiceUrl, "_blank", "noopener");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">Tagihan</h1>
          <p className="db-view-sub">
            Saldo kredit dan riwayat transaksi kamu.
          </p>
        </div>
      </div>
      <div className="db-stats-row">
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-value">
              {isSuperAdmin ? "Unlimited" : profile?.credits_balance ?? 0}
            </span>
            <span className="db-stat-label">Saldo kredit</span>
          </div>
          <button
            className="cta-button"
            style={{
              alignSelf: "flex-start",
              fontSize: "13px",
              height: "34px",
              padding: "0 16px",
            }}
            onClick={topUp}
            disabled={busy}
          >
            {busy ? "Memproses..." : "Isi Saldo"}
          </button>
        </div>
      </div>

      <section>
        <div className="db-section-header">
          <h2 className="db-section-title">Riwayat Transaksi</h2>
        </div>
        <div className="db-activity-list">
          {tx.length === 0 ? (
            <div className="db-activity-item">
              <div className="db-activity-icon" aria-hidden="true">
                <IconReceipt />
              </div>
              <div className="db-activity-body">
                <div className="db-activity-row">
                  <span className="db-activity-title">Belum ada transaksi</span>
                </div>
              </div>
            </div>
          ) : (
            tx.map((t) => (
              <div className="db-activity-item" key={t.id}>
                <div className="db-activity-icon" aria-hidden="true">
                  <IconReceipt />
                </div>
                <div className="db-activity-body">
                  <div className="db-activity-row">
                    <span className="db-activity-title">
                      {t.kind === "topup"
                        ? "Isi Saldo"
                        : t.kind === "spend"
                          ? "Penggunaan"
                          : "Penyesuaian"}{" "}
                      · {t.amount} kredit
                    </span>
                    <div className="db-activity-meta">
                      <span
                        className={`db-chip ${t.status === "completed" ? "db-chip-green" : t.status === "failed" ? "db-chip-blue" : "db-chip-amber"}`}
                      >
                        {t.status}
                      </span>
                      <span className="db-activity-time">
                        {relativeTime(t.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

/* ── View: File (run outputs) ──────────────────────────────── */
function ViewFile() {
  const toast = useToast();
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    api
      .getAutomationFiles()
      .then(({ runs: nextRuns }) => setRuns(nextRuns || []))
      .catch(() => setRuns([]));
  }, []);

  function download(run) {
    const blob = new Blob([JSON.stringify(run.output, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.title || "hasil"}-${run.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File diunduh.");
  }

  return (
    <>
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">File</h1>
          <p className="db-view-sub">
            Hasil dari automasi yang sudah kamu jalankan.
          </p>
        </div>
      </div>
      <div className="db-activity-list">
        {runs.length === 0 ? (
          <div className="db-activity-item">
            <div className="db-activity-icon" aria-hidden="true">
              <IconFile />
            </div>
            <div className="db-activity-body">
              <div className="db-activity-row">
                <span className="db-activity-title">Belum ada file</span>
              </div>
              <p className="db-activity-snippet">
                Jalankan automasi untuk menghasilkan file di sini.
              </p>
            </div>
          </div>
        ) : (
          runs.map((r) => (
            <div className="db-activity-item" key={r.id}>
              <div className="db-activity-icon" aria-hidden="true">
                <IconFile />
              </div>
              <div className="db-activity-body">
                <div className="db-activity-row">
                  <span className="db-activity-title">{r.title}</span>
                  <div className="db-activity-meta">
                    <span className="db-activity-time">
                      {relativeTime(r.created_at)}
                    </span>
                    <button
                      className="ghost-button"
                      style={{
                        fontSize: "12px",
                        height: "28px",
                        padding: "0 12px",
                      }}
                      onClick={() => download(r)}
                    >
                      Unduh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

/* ── View: Dukungan (support) ──────────────────────────────── */
function ViewDukungan() {
  return (
    <>
      <div className="db-view-header">
        <div>
          <h1 className="db-view-title">Dukungan</h1>
          <p className="db-view-sub">Butuh bantuan? Tim kami siap membantu.</p>
        </div>
      </div>
      <div className="db-product-grid">
        <article className="db-product-card">
          <div className="db-product-card-body">
            <h3 className="db-product-card-title">Email</h3>
            <p className="db-product-card-desc">
              Kirim pertanyaan kamu, kami balas secepatnya.
            </p>
            <div className="db-product-card-footer">
              <a
                className="ghost-button"
                style={{
                  fontSize: "13px",
                  height: "32px",
                  padding: "0 14px",
                  textDecoration: "none",
                }}
                href="mailto:support@aikit.id"
              >
                support@aikit.id
              </a>
            </div>
          </div>
        </article>
        <article className="db-product-card">
          <div className="db-product-card-body">
            <h3 className="db-product-card-title">WhatsApp</h3>
            <p className="db-product-card-desc">
              Chat langsung untuk respons lebih cepat di jam kerja.
            </p>
            <div className="db-product-card-footer">
              <a
                className="ghost-button"
                style={{
                  fontSize: "13px",
                  height: "32px",
                  padding: "0 14px",
                  textDecoration: "none",
                }}
                href="https://wa.me/6281234567890"
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka WhatsApp
              </a>
            </div>
          </div>
        </article>
      </div>
    </>
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
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  // Active nav + module slug are derived from the URL (deep-linkable).
  const segments = location.pathname
    .replace(/^\/dashboard\/?/, "")
    .split("/")
    .filter(Boolean);
  const activeNav = segments[0] || "dashboard";
  const moduleSlug = activeNav === "module" ? segments[1] : null;
  const aiAgentSlug = activeNav === "ai-agent" ? segments[1] : null;
  const aiThreadId = activeNav === "ai-agent" ? segments[2] : null;
  // Automasi = small tools that still live inside the Automasi dashboard tab
  // (App-type cards open here, NOT under /module which is reserved for kits).
  const automasiSlug = activeNav === "automasi" ? segments[1] : null;

  const setActiveNav = (id) =>
    navigate(id === "dashboard" ? "/dashboard" : `/dashboard/${id}`);

  function handleNavClick(id) {
    setActiveNav(id);
  }

  async function handleTopUp() {
    try {
      const res = await api.topUp(50000);
      if (res?.invoiceUrl) window.open(res.invoiceUrl, "_blank", "noopener");
    } catch {
      /* toast handled where available; top-up is a stub */
    }
  }

  function renderView() {
    switch (activeNav) {
      case "dashboard":
        return (
          <ViewDashboard
            onNavigate={handleNavClick}
            onOpenModule={(slug) => navigate(`/dashboard/module/${slug}`)}
            onTopUp={handleTopUp}
          />
        );
      case "automasi":
        return automasiSlug ? (
          <ViewModuleHost
            slug={automasiSlug}
            onBack={() => navigate("/dashboard/automasi")}
          />
        ) : (
          <ViewAutomasi
            onOpenApp={(slug) => navigate(`/dashboard/automasi/${slug}`)}
          />
        );
      case "module":
        return moduleSlug ? (
          <ViewModuleHost
            slug={moduleSlug}
            onBack={() => navigate("/dashboard/module")}
          />
        ) : (
          <ViewModule
            onOpen={(slug) => navigate(`/dashboard/module/${slug}`)}
          />
        );
      case "ai-agent":
        return aiAgentSlug ? (
          <AgentWorkspace
            agentSlug={aiAgentSlug}
            activeThreadId={aiThreadId}
            onOpenThread={(threadId) =>
              navigate(`/dashboard/ai-agent/${aiAgentSlug}/${threadId}`)
            }
            onBackHome={() => navigate("/dashboard/ai-agent")}
          />
        ) : (
          <AIAgentsHome
            onOpenAgent={(slug) => navigate(`/dashboard/ai-agent/${slug}`)}
          />
        );
      case "file":
        return <ViewFile />;
      case "tagihan":
        return <ViewTagihan />;
      case "pengaturan":
        return <ViewPengaturan />;
      case "dukungan":
        return <ViewDukungan />;
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

  return (
    <div className="db-shell">
      <aside className="db-sidebar">
        <div className="db-sidebar-logo">
          <span className="db-wordmark">aikit</span>
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
            {profile?.avatar_initials || "GA"}
          </div>
          <div>
            <div className="db-sidebar-user-name">
              {profile?.full_name || "Grou App"}
            </div>
            <div className="db-sidebar-user-role">
              {profile?.is_super_admin ? "Super Admin" : profile?.workspace_name || "Workspace"}
            </div>
          </div>
          <button
            type="button"
            className="db-sidebar-signout"
            aria-label="Keluar"
            title="Keluar"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            <IconSignOut />
          </button>
        </div>
      </aside>

      <main className="db-main">
        <div
          className={`db-main-inner${activeNav === "ai-agent" ? " db-main-inner--wide" : ""}`}
        >
          {renderView()}
        </div>
      </main>
    </div>
  );
}

