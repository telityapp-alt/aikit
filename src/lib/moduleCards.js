export const MODULE_CARDS = [
  {
    id: "tiktok-profile-intelligence",
    title: "TikTok Profile Intelligence",
    desc: "Bedah performa satu profil TikTok dengan signal deck, top movers, topic clusters, dan opportunity queue.",
    category: "Marketing",
    pricing: "Pro",
    users: 19,
    image: "/automation-covers/tiktok-profile-intelligence.webp",
    details: {
      category: "Marketing & Analitik",
      expectedOutput:
        "Dashboard interaktif dengan KPI virality, engagement rate, top video, topic clusters, dan opportunity queue konten.",
      howItWorks: [
        "Input username TikTok yang ingin dianalisis",
        "Sistem tarik data video via aikit API",
        "AI hitung KPI: virality score, engagement rate, view-to-follower ratio",
        "Clustering topik dari caption dan hashtag",
        "Generate signal deck + opportunity queue",
      ],
      useCases: [
        "Growth team yang ingin tahu tren konten di niche tertentu",
        "Brand yang mau benchmark performa TikTok-nya",
        "Agency yang butuh laporan performa kreator klien",
      ],
      requirements: "Username TikTok (akun publik)",
      estimatedTime: "3–7 menit tergantung jumlah video",
    },
  },
  {
    id: "instagram-profile-intelligence",
    title: "Instagram Profile Intelligence",
    desc: "Bedah performa satu profil Instagram: engagement KPI, format breakdown, reels vs statis, audience sentiment, dan top movers.",
    category: "Marketing",
    pricing: "Pro",
    users: 8,
    image: "/automation-covers/instagram-profile-intelligence.webp",
    details: {
      category: "Marketing & Analitik",
      expectedOutput:
        "Laporan engagement KPI, breakdown format konten, analisis Reels vs statis, sentiment komentar, dan daftar top post.",
      howItWorks: [
        "Input username Instagram yang ingin dianalisis",
        "Sistem tarik data posts dan reels via aikit API",
        "AI hitung engagement rate, reach estimate, dan format mix",
        "Sentiment analysis dari komentar terbaru",
        "Generate insight deck siap presentasi",
      ],
      useCases: [
        "Brand yang ingin audit akun Instagram sendiri",
        "Agency yang butuh benchmark kompetitor klien",
        "Kreator yang mau tahu format mana yang paling convert",
      ],
      requirements: "Username Instagram (akun publik)",
      estimatedTime: "3–6 menit",
    },
  },
  {
    id: "tiktok-ads-spy",
    title: "TikTok Ads Spy",
    desc: "Competitive ad intelligence TikTok: bedah kreatif, CTA, targeting usia/gender, dan share-of-voice kompetitor.",
    category: "Marketing",
    pricing: "Pro",
    users: 5,
    image:
      "https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=400&h=200&fit=crop&auto=format",
    details: {
      category: "Ads Intelligence",
      expectedOutput:
        "Swipe file kreatif TikTok Ads, breakdown CTA, targeting usia/gender, longevity iklan, dan share-of-voice kompetitor.",
      howItWorks: [
        "Input nama brand atau username TikTok kompetitor",
        "Sistem tarik data iklan aktif dari TikTok Ads Library",
        "AI parsing kreatif, CTA, format, dan estimasi targeting",
        "Hitung share-of-voice dan longevity per iklan",
        "Generate swipe file + insight dashboard",
      ],
      useCases: [
        "Performance marketer yang riset angle kreatif",
        "Media buyer yang mau tahu spending pattern kompetitor",
        "Founder yang ingin tahu strategi paid ads pesaing di TikTok",
      ],
      requirements: "Nama brand atau username TikTok kompetitor",
      estimatedTime: "2–5 menit",
    },
  },
  {
    id: "meta-ads-spy",
    title: "Meta Ads Spy",
    desc: "Competitive ad intelligence Facebook & Instagram: swipe creative, ad copy, format mix, longevity, dan influencer partnerships kompetitor.",
    category: "Marketing",
    pricing: "Pro",
    users: 4,
    image:
      "https://images.unsplash.com/photo-1633675254053-d96c7668c3b8?w=400&h=200&fit=crop&auto=format",
    details: {
      category: "Ads Intelligence",
      expectedOutput:
        "Swipe file creative, breakdown ad copy, format mix (video/image/carousel), longevity iklan, dan daftar influencer partnership yang dipakai kompetitor.",
      howItWorks: [
        "Input nama brand kompetitor",
        "Sistem tarik data dari Meta Ads Library (FB + IG)",
        "AI parsing ad copy, format, dan durasi iklan aktif",
        "Identifikasi influencer/kreator yang dipakai di iklan",
        "Generate swipe file + insight dashboard",
      ],
      useCases: [
        "Performance marketer yang riset creative angle kompetitor",
        "Copywriter yang butuh referensi ad copy yang proven",
        "Founder yang ingin tahu strategi paid ads pesaing",
      ],
      requirements: "Nama brand kompetitor (terdaftar di Meta Ads Library)",
      estimatedTime: "2–5 menit",
    },
  },
  {
    id: "keuangan-pribadi",
    title: "Manajer Keuangan Pribadi",
    desc: "Lacak pengeluaran, buat anggaran, dan analisis pola keuangan bulanan kamu secara otomatis.",
    category: "Keuangan",
    pricing: "Free",
    users: 143,
    image:
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=200&fit=crop&auto=format",
    details: {
      category: "Keuangan Pribadi",
      expectedOutput:
        "Dashboard keuangan bulanan: ringkasan pengeluaran per kategori, tren bulanan, insight penghematan, dan laporan siap export.",
      howItWorks: [
        "Input transaksi manual atau upload CSV rekening",
        "Sistem kategorisasi otomatis pengeluaran",
        "AI analisis pola dan deteksi anomali",
        "Generate laporan bulanan dengan rekomendasi",
      ],
      useCases: [
        "Individu yang ingin kontrol keuangan pribadi lebih baik",
        "Freelancer yang track pemasukan dan pengeluaran",
        "Pasangan yang ingin budgeting bersama",
      ],
      requirements: "Data transaksi (manual input atau file CSV)",
      estimatedTime: "Langsung — modul interaktif",
    },
  },
  {
    id: "contact-manager",
    title: "Contact Manager",
    desc: "Kelola kontak bisnis — customers, leads, creator, vendor, dan kompetitor dalam satu database terpusat.",
    category: "Marketing",
    pricing: "Free",
    users: 0,
    image:
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=200&fit=crop&auto=format",
    details: {
      category: "CRM & Kontak",
      expectedOutput:
        "Database kontak terpusat dengan segmentasi tipe, tag, dan histori interaksi. Filter dan export kapan saja.",
      howItWorks: [
        "Tambah kontak manual atau import CSV",
        "Kategorisasi: customer, lead, creator, vendor, kompetitor",
        "Tambah catatan, tag, dan status per kontak",
        "Filter, search, dan export sesuai kebutuhan",
      ],
      useCases: [
        "Founder yang kelola relasi bisnis dalam satu tempat",
        "Tim sales yang track leads dan follow-up",
        "Marketing yang kelola database kreator untuk kolaborasi",
      ],
      requirements: "Tidak ada — langsung mulai dari dashboard",
      estimatedTime: "Langsung — modul interaktif",
    },
  },
  {
    id: "campaign-manager",
    title: "Campaign Manager",
    desc: "Rencanakan dan kelola campaign marketing end-to-end: objective, budget, timeline, dan kontak terlibat.",
    category: "Marketing",
    pricing: "Free",
    users: 0,
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&auto=format",
    details: {
      category: "Campaign & Operasional",
      expectedOutput:
        "Ruang kerja campaign dengan objective, budget, timeline, dan daftar kontak/kreator terlibat. Status real-time per campaign.",
      howItWorks: [
        "Buat campaign baru dengan nama, objective, dan timeline",
        "Set budget dan assign kontak dari Contact Manager",
        "Track status dan milestone per campaign",
        "Lihat semua campaign aktif dalam satu tampilan",
      ],
      useCases: [
        "Tim marketing yang kelola banyak campaign sekaligus",
        "Founder yang ingin satu source of truth untuk semua inisiatif",
        "Agency yang koordinasi campaign lintas klien",
      ],
      requirements: "Tidak ada — langsung mulai dari dashboard",
      estimatedTime: "Langsung — modul interaktif",
    },
  },
  {
    id: "content-calendar",
    title: "Content Calendar",
    desc: "Rencanakan, jadwalkan, dan pantau konten dari semua platform dalam satu kalender visual.",
    category: "Marketing",
    pricing: "Free",
    users: 0,
    image:
      "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=400&h=200&fit=crop&auto=format",
    details: {
      category: "Konten & Jadwal",
      expectedOutput:
        "Kalender visual konten dengan status per post, platform tagging, dan filter per campaign atau kreator.",
      howItWorks: [
        "Tambah post baru dengan judul, platform, dan tanggal",
        "Assign ke campaign dari Campaign Manager",
        "Set status: draft, scheduled, published",
        "Lihat semua konten dalam kalender bulanan atau mingguan",
      ],
      useCases: [
        "Content team yang butuh visibilitas jadwal posting",
        "Kreator solo yang kelola konten multi-platform",
        "Agency yang plan content klien jauh-jauh hari",
      ],
      requirements: "Tidak ada — langsung mulai dari dashboard",
      estimatedTime: "Langsung — modul interaktif",
    },
  },
];

export const MODULE_CARD_MAP = Object.fromEntries(
  MODULE_CARDS.map((card) => [card.id, card]),
);

export const MODULE_TOTAL = MODULE_CARDS.length;
export const MODULE_CATEGORY_COUNTS = MODULE_CARDS.reduce((acc, c) => {
  acc[c.category] = (acc[c.category] || 0) + 1;
  return acc;
}, {});
export const MODULE_FREE_COUNT = MODULE_CARDS.filter(
  (c) => c.pricing === "Free",
).length;
