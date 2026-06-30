import { useState, useEffect, useRef } from "react";
import "./CompetitorAnalyzer.css";

// ── Mock data ──────────────────────────────────────────────────
const MOCK_COMPETITORS = [
  {
    id: "tokopedia",
    domain: "tokopedia.com",
    color: "#2ecc71",
    da: 78,
    visits: "45.2M",
    visitRaw: 45200000,
    keywords: "312K",
    threat: 94,
    threatLevel: "Tinggi",
    since: "14 hari lalu",
    analyzed: "2 jam lalu",
    trafficTrend: [28, 31, 29, 34, 38, 41, 39, 44, 46, 43, 48, 45],
    sources: [
      { name: "Search", pct: 42, color: "#f6a61e" },
      { name: "Direct", pct: 35, color: "#3a9e6e" },
      { name: "Social", pct: 12, color: "#5a8fd4" },
      { name: "Referral", pct: 11, color: "#a07cd4" },
    ],
    countries: [
      { name: "Indonesia", pct: 78 },
      { name: "Malaysia", pct: 9 },
      { name: "Singapore", pct: 6 },
      { name: "Australia", pct: 4 },
      { name: "Lainnya", pct: 3 },
    ],
    bounceRate: "38%",
    avgSession: "4m 12s",
    organicKw: "312.400",
    organicTraffic: "18.4M",
    kwOverlap: "34%",
    keywords_table: [
      { kw: "belanja online", pos: 1, vol: "2.4M", diff: 88 },
      { kw: "jual beli online", pos: 2, vol: "1.8M", diff: 82 },
      { kw: "tokopedia promo", pos: 1, vol: "940K", diff: 54 },
      { kw: "flash sale hari ini", pos: 3, vol: "820K", diff: 61 },
      { kw: "beli hp murah", pos: 4, vol: "680K", diff: 70 },
      { kw: "toko online terpercaya", pos: 2, vol: "540K", diff: 76 },
      { kw: "dompet digital", pos: 5, vol: "430K", diff: 45 },
      { kw: "cicilan 0 persen", pos: 3, vol: "310K", diff: 38 },
    ],
    kwGap: [
      "e-commerce indonesia",
      "gratis ongkir",
      "top up gopay",
      "review produk",
      "perbandingan harga",
      "cashback shopback",
      "beli tiket online",
      "pinjaman online",
      "asuransi digital",
      "kartu kredit rewards",
    ],
    social: [
      {
        channel: "Instagram",
        followers: "4.2M",
        growth: "+12K bulan ini",
        bars: [40, 55, 48, 62, 58, 70, 65, 74, 80, 76, 84, 88],
        color: "#d63a8a",
      },
      {
        channel: "TikTok",
        followers: "8.1M",
        growth: "+48K bulan ini",
        bars: [50, 60, 55, 70, 75, 82, 78, 88, 92, 85, 94, 98],
        color: "#0d0d0d",
      },
      {
        channel: "Twitter/X",
        followers: "1.8M",
        growth: "+3K bulan ini",
        bars: [60, 58, 62, 60, 64, 62, 66, 64, 68, 66, 70, 68],
        color: "#1d9bf0",
      },
      {
        channel: "LinkedIn",
        followers: "340K",
        growth: "+1.2K bulan ini",
        bars: [30, 34, 32, 36, 38, 40, 42, 44, 46, 48, 50, 52],
        color: "#0a66c2",
      },
    ],
    engage: [
      { channel: "Instagram", val: "3.8%", pct: 76, color: "#d63a8a" },
      { channel: "TikTok", val: "6.2%", pct: 100, color: "#0d0d0d" },
      { channel: "Twitter/X", val: "1.4%", pct: 23, color: "#1d9bf0" },
      { channel: "LinkedIn", val: "2.1%", pct: 34, color: "#0a66c2" },
    ],
    tech: [
      {
        label: "Frontend",
        cls: "ca-tech-blue",
        items: ["React", "Next.js", "TypeScript"],
      },
      {
        label: "Analytics",
        cls: "ca-tech-green",
        items: ["Google Analytics 4", "Mixpanel", "Hotjar"],
      },
      {
        label: "Marketing",
        cls: "ca-tech-amber",
        items: ["HubSpot", "Mailchimp", "Clevertap"],
      },
      {
        label: "CDN",
        cls: "ca-tech-gray",
        items: ["Cloudflare", "AWS CloudFront"],
      },
      {
        label: "Support",
        cls: "ca-tech-purple",
        items: ["Zendesk", "Intercom"],
      },
      {
        label: "Pembayaran",
        cls: "ca-tech-red",
        items: ["Midtrans", "DOKU", "GoPay"],
      },
    ],
    changes: [
      { text: "Halaman pricing diperbarui", time: "3 hari lalu" },
      { text: "12 kata kunci baru masuk top 10", time: "1 minggu lalu" },
      { text: "Postingan LinkedIn viral (48K likes)", time: "1 minggu lalu" },
      { text: "Lowongan baru: Head of Growth", time: "2 minggu lalu" },
    ],
  },
  {
    id: "shopee",
    domain: "shopee.co.id",
    color: "#e05a2b",
    da: 82,
    visits: "61.8M",
    visitRaw: 61800000,
    keywords: "445K",
    threat: 97,
    threatLevel: "Tinggi",
    since: "14 hari lalu",
    analyzed: "3 jam lalu",
    trafficTrend: [42, 46, 44, 50, 54, 58, 55, 62, 66, 60, 70, 65],
    sources: [
      { name: "Search", pct: 38, color: "#f6a61e" },
      { name: "Direct", pct: 40, color: "#3a9e6e" },
      { name: "Social", pct: 14, color: "#5a8fd4" },
      { name: "Referral", pct: 8, color: "#a07cd4" },
    ],
    countries: [
      { name: "Indonesia", pct: 91 },
      { name: "Malaysia", pct: 4 },
      { name: "Singapore", pct: 3 },
      { name: "Thailand", pct: 1 },
      { name: "Lainnya", pct: 1 },
    ],
    bounceRate: "32%",
    avgSession: "5m 44s",
    organicKw: "445.200",
    organicTraffic: "24.1M",
    kwOverlap: "41%",
    keywords_table: [
      { kw: "shopee flash sale", pos: 1, vol: "3.1M", diff: 62 },
      { kw: "belanja murah", pos: 1, vol: "2.2M", diff: 84 },
      { kw: "shopee coins", pos: 1, vol: "1.4M", diff: 48 },
      { kw: "voucher shopee", pos: 1, vol: "1.1M", diff: 52 },
      { kw: "fashion wanita", pos: 2, vol: "890K", diff: 72 },
      { kw: "hp second murah", pos: 3, vol: "760K", diff: 68 },
      { kw: "free ongkir", pos: 2, vol: "640K", diff: 55 },
      { kw: "dompet kulit pria", pos: 4, vol: "280K", diff: 34 },
    ],
    kwGap: [
      "live streaming shop",
      "shopee affiliate",
      "seller center",
      "brand protection",
      "shopee pay later",
      "kategori elektronik",
      "sepatu sneakers",
      "review seller",
      "dropship",
      "cod tersedia",
    ],
    social: [
      {
        channel: "Instagram",
        followers: "6.8M",
        growth: "+22K bulan ini",
        bars: [55, 60, 58, 66, 70, 74, 72, 80, 84, 80, 88, 92],
        color: "#d63a8a",
      },
      {
        channel: "TikTok",
        followers: "12.4M",
        growth: "+84K bulan ini",
        bars: [60, 68, 64, 74, 78, 86, 82, 90, 94, 88, 96, 100],
        color: "#0d0d0d",
      },
      {
        channel: "Twitter/X",
        followers: "2.4M",
        growth: "+5K bulan ini",
        bars: [62, 60, 64, 62, 66, 64, 68, 66, 70, 68, 72, 70],
        color: "#1d9bf0",
      },
      {
        channel: "LinkedIn",
        followers: "480K",
        growth: "+1.8K bulan ini",
        bars: [32, 36, 34, 38, 40, 42, 44, 46, 48, 50, 52, 54],
        color: "#0a66c2",
      },
    ],
    engage: [
      { channel: "Instagram", val: "4.2%", pct: 68, color: "#d63a8a" },
      { channel: "TikTok", val: "7.8%", pct: 100, color: "#0d0d0d" },
      { channel: "Twitter/X", val: "1.8%", pct: 23, color: "#1d9bf0" },
      { channel: "LinkedIn", val: "2.4%", pct: 31, color: "#0a66c2" },
    ],
    tech: [
      {
        label: "Frontend",
        cls: "ca-tech-blue",
        items: ["React", "Redux", "PWA"],
      },
      {
        label: "Analytics",
        cls: "ca-tech-green",
        items: ["Google Analytics 4", "Amplitude", "Branch"],
      },
      {
        label: "Marketing",
        cls: "ca-tech-amber",
        items: ["Braze", "AppsFlyer", "Adjust"],
      },
      {
        label: "CDN",
        cls: "ca-tech-gray",
        items: ["Akamai", "AWS CloudFront"],
      },
      {
        label: "Support",
        cls: "ca-tech-purple",
        items: ["Freshdesk", "Kustomer"],
      },
      {
        label: "Pembayaran",
        cls: "ca-tech-red",
        items: ["ShopeePay", "Kredivo", "Akulaku"],
      },
    ],
    changes: [
      { text: "Fitur live shopping diperbarui", time: "1 hari lalu" },
      { text: "Kampanye 9.9 dimulai lebih awal", time: "4 hari lalu" },
      { text: "Program affiliate diluncurkan ulang", time: "1 minggu lalu" },
      { text: "Integrasi ShopeePay makin dalam", time: "3 minggu lalu" },
    ],
  },
  {
    id: "bukalapak",
    domain: "bukalapak.com",
    color: "#e84c3d",
    da: 71,
    visits: "18.4M",
    visitRaw: 18400000,
    keywords: "198K",
    threat: 76,
    threatLevel: "Sedang",
    since: "14 hari lalu",
    analyzed: "5 jam lalu",
    trafficTrend: [22, 20, 24, 22, 26, 24, 28, 26, 24, 28, 26, 30],
    sources: [
      { name: "Search", pct: 48, color: "#f6a61e" },
      { name: "Direct", pct: 28, color: "#3a9e6e" },
      { name: "Social", pct: 10, color: "#5a8fd4" },
      { name: "Referral", pct: 14, color: "#a07cd4" },
    ],
    countries: [
      { name: "Indonesia", pct: 94 },
      { name: "Malaysia", pct: 3 },
      { name: "Singapore", pct: 2 },
      { name: "Lainnya", pct: 1 },
    ],
    bounceRate: "44%",
    avgSession: "3m 08s",
    organicKw: "198.600",
    organicTraffic: "8.8M",
    kwOverlap: "22%",
    keywords_table: [
      { kw: "bukalapak mitra", pos: 1, vol: "820K", diff: 44 },
      { kw: "bayar tagihan", pos: 2, vol: "680K", diff: 58 },
      { kw: "pulsa murah", pos: 3, vol: "540K", diff: 64 },
      { kw: "marketplace lokal", pos: 4, vol: "410K", diff: 72 },
      { kw: "beli token listrik", pos: 2, vol: "380K", diff: 40 },
      { kw: "warung digital", pos: 1, vol: "260K", diff: 32 },
      { kw: "top up game murah", pos: 5, vol: "220K", diff: 48 },
      { kw: "cek harga barang", pos: 6, vol: "180K", diff: 36 },
    ],
    kwGap: [
      "fintech UMKM",
      "pinjaman usaha kecil",
      "mitra warung",
      "agen BRILink",
      "tagihan BPJS",
      "cicilan tanpa kartu",
      "belanja grosir",
      "sembako online",
      "komunitas seller",
      "iklan gratis",
    ],
    social: [
      {
        channel: "Instagram",
        followers: "1.4M",
        growth: "+2K bulan ini",
        bars: [40, 38, 42, 40, 44, 42, 46, 44, 48, 46, 50, 48],
        color: "#d63a8a",
      },
      {
        channel: "TikTok",
        followers: "980K",
        growth: "+8K bulan ini",
        bars: [20, 24, 22, 28, 30, 34, 32, 38, 40, 36, 42, 44],
        color: "#0d0d0d",
      },
      {
        channel: "Twitter/X",
        followers: "620K",
        growth: "+800 bulan ini",
        bars: [50, 48, 52, 50, 54, 52, 56, 54, 58, 56, 60, 58],
        color: "#1d9bf0",
      },
      {
        channel: "LinkedIn",
        followers: "120K",
        growth: "+400 bulan ini",
        bars: [22, 24, 22, 26, 28, 26, 30, 28, 32, 30, 34, 32],
        color: "#0a66c2",
      },
    ],
    engage: [
      { channel: "Instagram", val: "2.4%", pct: 39, color: "#d63a8a" },
      { channel: "TikTok", val: "4.8%", pct: 77, color: "#0d0d0d" },
      { channel: "Twitter/X", val: "0.9%", pct: 14, color: "#1d9bf0" },
      { channel: "LinkedIn", val: "1.6%", pct: 26, color: "#0a66c2" },
    ],
    tech: [
      {
        label: "Frontend",
        cls: "ca-tech-blue",
        items: ["Vue.js", "Nuxt", "PWA"],
      },
      {
        label: "Analytics",
        cls: "ca-tech-green",
        items: ["Google Analytics 4", "Firebase"],
      },
      {
        label: "Marketing",
        cls: "ca-tech-amber",
        items: ["Insider", "MoEngage"],
      },
      { label: "CDN", cls: "ca-tech-gray", items: ["Cloudflare"] },
      { label: "Support", cls: "ca-tech-purple", items: ["Freshdesk"] },
      {
        label: "Pembayaran",
        cls: "ca-tech-red",
        items: ["BukaDompet", "Midtrans", "OVO"],
      },
    ],
    changes: [
      { text: "Rebranding logo & warna diluncurkan", time: "5 hari lalu" },
      { text: "Fitur Mitra diperbarui besar-besaran", time: "1 minggu lalu" },
      { text: "Kemitraan baru dengan BRI diluncurkan", time: "2 minggu lalu" },
      { text: "18 kata kunci turun dari halaman 1", time: "3 minggu lalu" },
    ],
  },
];

const MILESTONES = [
  "Memeriksa data traffic...",
  "Memindai kata kunci organik...",
  "Menganalisis profil backlink...",
  "Mengambil data media sosial...",
  "Menyusun laporan kompetitor...",
];

const SUGGESTIONS = ["shopee.co.id", "lazada.co.id", "bukalapak.com"];

// ── Helpers ───────────────────────────────────────────────────────────────
function threatClass(level) {
  if (level === "Tinggi") return "ca-threat-high";
  if (level === "Sedang") return "ca-threat-mid";
  return "ca-threat-low";
}

// Pure-SVG sparkline — no external lib
function Sparkline({ values, width = 400, height = 80, months }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 24) + 12;
    const y = height - 20 - ((v - min) / range) * (height - 36);
    return [x, y];
  });
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`)
    .join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0]},${height - 20} L${pts[0][0]},${height - 20} Z`;
  const MON = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id="ca-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6a61e" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f6a61e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#ca-grad)" />
      <path
        d={linePath}
        fill="none"
        stroke="#f6a61e"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {months &&
        pts
          .filter((_, i) => i % 3 === 0)
          .map(([x], i) => (
            <text
              key={i}
              x={x}
              y={height - 4}
              className="ca-axis-label"
              textAnchor="middle"
            >
              {MON[i * 3]}
            </text>
          ))}
      {pts.map(
        ([x, y], i) =>
          i === pts.length - 1 && (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill="#f6a61e"
              stroke="#fffdf8"
              strokeWidth="2"
            />
          ),
      )}
    </svg>
  );
}

// Mini sparkline for roster cards (no axis labels, just the line)
function MiniSparkline({ values, color = "#f6a61e" }) {
  const w = 80,
    h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - ((v - min) / range) * h,
  ]);
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`)
    .join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${h} L0,${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: w, height: h, display: "block" }}
    >
      <defs>
        <linearGradient
          id={`mg-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#mg-${color.replace("#", "")})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PhaseInput({ tracked, onAnalyze }) {
  const [domain, setDomain] = useState("");
  function submit(e) {
    e.preventDefault();
    const d = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    if (d) onAnalyze(d);
  }
  return (
    <div className="ca-empty-shell">
      <div className="ca-empty-card">
        <div>
          <span className="ca-empty-eyebrow">Competitor Analyzer</span>
          <h2 className="ca-empty-title">
            Pantau kompetitor kamu secara real-time
          </h2>
          <p className="ca-empty-sub" style={{ marginTop: 6 }}>
            Masukkan domain kompetitor dan dapatkan analisis mendalam tentang
            traffic, SEO, sosial, dan teknologi mereka.
          </p>
        </div>
        <form className="ca-input-row" onSubmit={submit}>
          <input
            className="ca-domain-input"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="contoh: tokopedia.com"
            autoComplete="off"
          />
          <button
            type="submit"
            className="cta-button"
            style={{
              height: 40,
              fontSize: 14,
              padding: "0 18px",
              whiteSpace: "nowrap",
            }}
          >
            Analisis
          </button>
        </form>
        <div>
          <p className="ca-suggestions-label">Coba langsung:</p>
          <div className="ca-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="ca-suggestion-chip"
                onClick={() => {
                  setDomain(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tracked.length > 0 && (
        <div className="ca-tracked-section">
          <p className="ca-tracked-title">Kompetitor yang dipantau</p>
          <div className="ca-tracked-list">
            {tracked.map((c) => (
              <div key={c.id} className="ca-tracked-item">
                <div
                  className="ca-tracked-favicon"
                  style={{ background: c.color }}
                >
                  {c.domain[0]}
                </div>
                <div className="ca-tracked-info">
                  <div className="ca-tracked-domain">{c.domain}</div>
                  <div className="ca-tracked-meta">
                    Terakhir dianalisis {c.analyzed}
                  </div>
                </div>
                <button
                  className="ghost-button"
                  style={{ height: 32, fontSize: 13, padding: "0 14px" }}
                  onClick={() => onAnalyze(c.domain)}
                >
                  Lihat laporan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Phase 2: Analyzing — onDone stored in ref to avoid effect restarts
function PhaseAnalyzing({ domain, onDone }) {
  const [step, setStep] = useState(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let s = 0;
    const timers = [];
    function tick() {
      s += 1;
      setStep(s);
      if (s < MILESTONES.length) {
        timers.push(setTimeout(tick, 620));
      }
    }
    timers.push(setTimeout(tick, 400));
    timers.push(setTimeout(() => onDoneRef.current(), 3700));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ca-analyzing-shell">
      <div style={{ textAlign: "center" }}>
        <div className="ca-analyzing-domain">{domain}</div>
        <div className="ca-analyzing-label">Sedang dianalisis...</div>
      </div>
      <div
        className="ca-progress-track"
        style={{ width: "100%", maxWidth: 420 }}
      >
        <div key={domain} className="ca-progress-bar" />
      </div>
      <div className="ca-milestones">
        {MILESTONES.map((m, i) => {
          const done = i < step;
          const active = i === step;
          const pending = i > step;
          return (
            <div
              key={i}
              className={`ca-milestone ${done || active ? "ca-milestone-visible" : ""}`}
            >
              <div
                className={`ca-milestone-dot ${done ? "ca-dot-done" : active ? "ca-dot-active" : "ca-dot-pending"}`}
              />
              <span
                className={`ca-milestone-text ${done ? "ca-text-done" : pending ? "ca-text-pending" : ""}`}
              >
                {m}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Profile tab: Overview ─────────────────────────────────────────────────
function TabOverview({ c }) {
  return (
    <div className="ca-tab-content">
      <div className="ca-insight-callout">
        Traffic organik {c.domain} naik 18% kuartal ini, didorong oleh 2.400
        kata kunci baru di posisi 1–3. Sumber terbesar tetap pencarian organik (
        {c.sources[0].pct}% dari total traffic).
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {[
          { val: c.visits, label: "Kunjungan/bln" },
          { val: c.organicKw, label: "Kata kunci organik" },
          { val: c.da, label: "Domain authority" },
          { val: c.social[0].followers, label: "Followers Instagram" },
        ].map((s, i) => (
          <div key={i} className="ca-stat-card">
            <span className="ca-stat-value">{s.val}</span>
            <span className="ca-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="ca-card">
        <div className="ca-card-title">Traffic trend — 12 bulan terakhir</div>
        <div className="ca-sparkline-wrap">
          <Sparkline values={c.trafficTrend} height={100} months />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="ca-card">
          <div className="ca-card-title">Sumber traffic</div>
          <div className="ca-source-list">
            {c.sources.map((s, i) => (
              <div key={i} className="ca-source-row">
                <span className="ca-source-name">{s.name}</span>
                <div className="ca-source-bar-track">
                  <div
                    className="ca-source-bar-fill"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                </div>
                <span className="ca-source-pct">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ca-card">
          <div className="ca-card-title">Perubahan terkini</div>
          <div className="ca-changes-list">
            {c.changes.map((ch, i) => (
              <div key={i} className="ca-change-item">
                <div className="ca-change-dot" />
                <div className="ca-change-body">
                  <div className="ca-change-text">{ch.text}</div>
                  <div className="ca-change-time">{ch.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile tab: Traffic ──────────────────────────────────────────────────
function TabTraffic({ c }) {
  return (
    <div className="ca-tab-content">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {[
          { val: c.visits, label: "Kunjungan/bln" },
          { val: c.bounceRate, label: "Bounce rate" },
          { val: c.avgSession, label: "Avg. session" },
        ].map((s, i) => (
          <div key={i} className="ca-stat-card">
            <span className="ca-stat-value">{s.val}</span>
            <span className="ca-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="ca-card">
        <div className="ca-card-title">Traffic trend bulanan</div>
        <Sparkline values={c.trafficTrend} height={120} months />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="ca-card">
          <div className="ca-card-title">Sumber traffic</div>
          <div className="ca-source-list">
            {c.sources.map((s, i) => (
              <div key={i} className="ca-source-row">
                <span className="ca-source-name">{s.name}</span>
                <div className="ca-source-bar-track">
                  <div
                    className="ca-source-bar-fill"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                </div>
                <span className="ca-source-pct">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ca-card">
          <div className="ca-card-title">Traffic berdasarkan negara</div>
          <div className="ca-country-list">
            {c.countries.map((co, i) => (
              <div key={i} className="ca-country-row">
                <span className="ca-country-name">{co.name}</span>
                <div className="ca-country-bar-track">
                  <div
                    className="ca-country-bar-fill"
                    style={{ width: `${co.pct}%` }}
                  />
                </div>
                <span className="ca-country-pct">{co.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile tab: SEO ──────────────────────────────────────────────────────
function TabSEO({ c }) {
  return (
    <div className="ca-tab-content">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {[
          { val: c.organicKw, label: "Kata kunci organik" },
          { val: c.organicTraffic, label: "Est. traffic organik" },
          { val: c.kwOverlap, label: "Keyword overlap" },
        ].map((s, i) => (
          <div key={i} className="ca-stat-card">
            <span className="ca-stat-value">{s.val}</span>
            <span className="ca-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="ca-card">
        <div className="ca-card-title">Kata kunci teratas</div>
        <table className="ca-kw-table">
          <thead>
            <tr>
              <th>Kata Kunci</th>
              <th>Posisi</th>
              <th>Volume/bln</th>
              <th>Kesulitan</th>
            </tr>
          </thead>
          <tbody>
            {c.keywords_table.map((row, i) => {
              const diffCls =
                row.diff >= 70
                  ? "ca-diff-hard"
                  : row.diff >= 45
                    ? "ca-diff-medium"
                    : "ca-diff-easy";
              const posCls = row.pos <= 3 ? "ca-kw-pos-top" : "ca-kw-pos-mid";
              return (
                <tr key={i}>
                  <td>{row.kw}</td>
                  <td>
                    <span className={`ca-kw-pos ${posCls}`}>#{row.pos}</span>
                  </td>
                  <td style={{ color: "#0d1d38", fontWeight: 700 }}>
                    {row.vol}
                  </td>
                  <td>
                    <div className="ca-kw-diff-bar">
                      <div
                        className={`ca-kw-diff-fill ${diffCls}`}
                        style={{ width: `${row.diff}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ca-card">
        <div className="ca-card-title">
          Keyword gap — kompetitor punya, kamu belum
        </div>
        <div className="ca-gap-chips">
          {c.kwGap.map((kw, i) => (
            <span key={i} className="ca-gap-chip">
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Profile tab: Social ───────────────────────────────────────────────────
function TabSocial({ c }) {
  return (
    <div className="ca-tab-content">
      <div className="ca-social-grid">
        {c.social.map((s, i) => (
          <div
            key={i}
            className="ca-social-card"
            style={{ borderLeftColor: s.color }}
          >
            <div className="ca-social-channel">{s.channel}</div>
            <div className="ca-social-followers">{s.followers}</div>
            <div className="ca-social-growth">{s.growth}</div>
            <div className="ca-social-mini-bars">
              {s.bars.map((h, j) => (
                <div
                  key={j}
                  className="ca-mini-bar"
                  style={{
                    height: `${(h / 100) * 28}px`,
                    background: j === s.bars.length - 1 ? s.color : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="ca-card">
        <div className="ca-card-title">Engagement rate per channel</div>
        <div className="ca-engage-list">
          {c.engage.map((e, i) => (
            <div key={i} className="ca-engage-row">
              <span className="ca-engage-name">{e.channel}</span>
              <div className="ca-engage-bar-track">
                <div
                  className="ca-engage-bar-fill"
                  style={{ width: `${e.pct}%`, background: e.color }}
                />
              </div>
              <span className="ca-engage-val">{e.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Profile tab: Technology ───────────────────────────────────────────────
function TabTech({ c }) {
  return (
    <div className="ca-tab-content">
      <div className="ca-card">
        <div className="ca-card-title">Tech stack yang terdeteksi</div>
        <div className="ca-tech-groups">
          {c.tech.map((g, i) => (
            <div key={i} className="ca-tech-group">
              <span className="ca-tech-group-label">{g.label}</span>
              <div className="ca-tech-badges">
                {g.items.map((item, j) => (
                  <span key={j} className={`ca-tech-badge ${g.cls}`}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Competitor profile (sub-view B) ───────────────────────────────────────
const PROFILE_TABS = [
  "Overview",
  "Traffic",
  "SEO & Kata Kunci",
  "Sosial",
  "Teknologi",
];

function CompetitorProfile({ c, onBack }) {
  const [tab, setTab] = useState("Overview");
  const kpiChips = [
    { val: `DA ${c.da}`, label: "Domain Auth." },
    { val: c.visits, label: "Kunjungan/bln" },
    { val: c.keywords, label: "Keywords" },
  ];
  return (
    <div className="ca-wrap">
      <div className="ca-profile-header">
        <button className="ca-back-btn" onClick={onBack}>
          ← Kembali
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            className="ca-favicon"
            style={{
              background: c.color,
              width: 36,
              height: 36,
              borderRadius: 10,
              fontSize: 15,
            }}
          >
            {c.domain[0]}
          </div>
          <div className="ca-profile-domain-block">
            <div className="ca-profile-domain">{c.domain}</div>
            <div className="ca-profile-since">Dipantau sejak {c.since}</div>
          </div>
        </div>
        <div className="ca-profile-kpis">
          {kpiChips.map((k, i) => (
            <div key={i} className="ca-kpi-chip">
              <span className="ca-kpi-val">{k.val}</span>
              <span className="ca-kpi-label">{k.label}</span>
            </div>
          ))}
          <div className="ca-threat-score">
            <span className="ca-threat-score-val">{c.threat}/100</span>
            <span className="ca-threat-score-label">Threat score</span>
          </div>
        </div>
      </div>

      <div className="ca-tabs">
        {PROFILE_TABS.map((t) => (
          <button
            key={t}
            className={`ca-tab ${tab === t ? "ca-tab-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <TabOverview c={c} />}
      {tab === "Traffic" && <TabTraffic c={c} />}
      {tab === "SEO & Kata Kunci" && <TabSEO c={c} />}
      {tab === "Sosial" && <TabSocial c={c} />}
      {tab === "Teknologi" && <TabTech c={c} />}
    </div>
  );
}

// ── Roster (sub-view A) ───────────────────────────────────────────────────
function Roster({ competitors, onSelect, onAdd }) {
  return (
    <div className="ca-wrap">
      <div className="ca-roster-header">
        <div>
          <h1 className="db-view-title">Kompetitor</h1>
          <p className="db-view-sub">
            Analisis mendalam kompetitor yang kamu pantau.
          </p>
        </div>
        <button
          className="ghost-button"
          style={{ height: 36, fontSize: 13, padding: "0 16px" }}
          onClick={onAdd}
        >
          + Tambah
        </button>
      </div>

      <div className="ca-stats-row">
        {[
          { val: competitors.length, label: "Dipantau" },
          {
            val: Math.round(
              competitors.reduce((s, c) => s + c.da, 0) / competitors.length,
            ),
            label: "Rata-rata DA",
          },
          { val: "1.240", label: "Keyword overlap" },
        ].map((s, i) => (
          <div key={i} className="ca-stat-card">
            <span className="ca-stat-value">{s.val}</span>
            <span className="ca-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Compact table-style list */}
      <div className="ca-table-wrap">
        <div className="ca-table-head">
          <span style={{ flex: 3 }}>Domain</span>
          <span style={{ flex: 1, textAlign: "right" }}>DA</span>
          <span style={{ flex: 2, textAlign: "right" }}>Kunjungan</span>
          <span style={{ flex: 2, textAlign: "right" }}>Keywords</span>
          <span style={{ flex: 2, textAlign: "center" }}>Trend</span>
          <span style={{ flex: 2, textAlign: "center" }}>Threat</span>
          <span style={{ flex: 1 }} />
        </div>
        {competitors.map((c) => (
          <div key={c.id} className="ca-table-row" onClick={() => onSelect(c)}>
            <div
              style={{
                flex: 3,
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div className="ca-favicon-sm" style={{ background: c.color }}>
                {c.domain[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="ca-comp-domain" style={{ fontSize: 13 }}>
                  {c.domain}
                </div>
                <div className="ca-comp-meta">
                  DA {c.da} · {c.analyzed}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <span className="ca-tbl-val">{c.da}</span>
            </div>
            <div style={{ flex: 2, textAlign: "right" }}>
              <span className="ca-tbl-val">{c.visits}</span>
            </div>
            <div style={{ flex: 2, textAlign: "right" }}>
              <span className="ca-tbl-val">{c.keywords}</span>
            </div>
            <div
              style={{
                flex: 2,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MiniSparkline values={c.trafficTrend} color={c.color} />
            </div>
            <div
              style={{
                flex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span
                className={`ca-threat-badge ${threatClass(c.threatLevel)}`}
                style={{ fontSize: 11 }}
              >
                {c.threat}/100
              </span>
              <div
                className="ca-threat-meter"
                style={{ width: 60, marginTop: 0 }}
              >
                <div
                  className={`ca-threat-meter-fill ${c.threatLevel === "Tinggi" ? "ca-threat-fill-high" : c.threatLevel === "Sedang" ? "ca-threat-fill-mid" : "ca-threat-fill-low"}`}
                  style={{ width: `${c.threat}%` }}
                />
              </div>
            </div>
            <div
              style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}
            >
              <span className="ca-row-arrow">›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// ── Main export ───────────────────────────────────────────────────────────
export default function CompetitorAnalyzer() {
  // phase: "input" | "analyzing" | "dashboard"
  const [phase, setPhase] = useState("input");
  const [analyzingDomain, setAnalyzingDomain] = useState("");
  const [tracked, setTracked] = useState(MOCK_COMPETITORS);
  const [selected, setSelected] = useState(null); // null = roster

  function handleAnalyze(domain) {
    setAnalyzingDomain(domain);
    setPhase("analyzing");
  }

  function handleDone() {
    // Add to tracked if not already there (mock — just use existing list)
    setPhase("dashboard");
    setSelected(null);
  }

  if (phase === "input") {
    return <PhaseInput tracked={[]} onAnalyze={handleAnalyze} />;
  }

  if (phase === "analyzing") {
    return <PhaseAnalyzing domain={analyzingDomain} onDone={handleDone} />;
  }

  // dashboard
  if (selected) {
    return <CompetitorProfile c={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <Roster
      competitors={tracked}
      onSelect={setSelected}
      onAdd={() => setPhase("input")}
    />
  );
}
