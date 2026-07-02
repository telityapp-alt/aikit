export const AUTOMATION_CARDS = [
  {
    id: "competitor-analyzer",
    title: "Generator Laporan Kompetitor Instagram",
    desc: "Ambil data Posts atau Reels kompetitor, analisis top content dan komentar, lalu download report Excel yang siap dipakai tim.",
    type: "App",
    pricing: "Pay per run",
    costPerRun: 0,
    users: 38,
    image: "/automation-covers/competitor-analyzer.webp",
    details: {
      category: "Marketing & Riset",
      expectedOutput:
        "File Excel (.xlsx) berisi top posts kompetitor, engagement rate per post, analisis komentar, dan ringkasan strategi konten.",
      howItWorks: [
        "Input username Instagram kompetitor",
        "Pilih tipe konten: Posts, Reels, atau keduanya",
        "Tentukan jumlah konten yang ingin diambil",
        "Jalankan — AI menganalisis pola, engagement, dan komentar",
        "Download laporan Excel siap pakai",
      ],
      useCases: [
        "Tim marketing yang ingin tahu strategi konten kompetitor",
        "Agency yang perlu laporan kompetitor untuk klien",
        "Founder yang riset sebelum buat konten baru",
      ],
      requirements: "Username Instagram kompetitor (akun publik)",
      estimatedTime: "2–5 menit tergantung jumlah konten",
    },
  },
  {
    id: "tiktok-profile-intelligence",
    title: "TikTok Profile Intelligence",
    desc: "Tarik video TikTok, hitung KPI virality dan intent, lalu baca dashboard insight yang siap dipakai tim growth.",
    type: "App",
    pricing: "Pay per run",
    costPerRun: 125,
    users: 12,
    image: "/automation-covers/tiktok-profile-intelligence.webp",
    details: {
      category: "Marketing & Analitik",
      expectedOutput:
        "Dashboard interaktif dengan KPI virality, engagement rate, top video, topic clusters, dan opportunity queue konten.",
      howItWorks: [
        "Input username TikTok yang ingin dianalisis",
        "Sistem tarik data video via aikit API",
        "AI hitung KPI: virality score, engagement rate, view-to-follower ratio",
        "Clustering otomatis berdasarkan topik konten",
        "Baca hasil di dashboard insight langsung di browser",
      ],
      useCases: [
        "Growth team yang analisis akun kompetitor di TikTok",
        "Creator yang ingin tahu format dan topik mana yang paling works",
        "Brand yang riset sebelum kolaborasi dengan kreator",
      ],
      requirements: "Username TikTok (akun publik)",
      estimatedTime: "3–8 menit tergantung jumlah video",
    },
  },
  {
    id: "instagram-profile-intelligence",
    title: "Instagram Profile Intelligence",
    desc: "Tarik data profil Instagram, hitung KPI engagement & format, lalu baca dashboard insight siap pakai tim growth.",
    type: "App",
    pricing: "Pay per run",
    costPerRun: 125,
    users: 8,
    image: "/automation-covers/instagram-profile-intelligence.webp",
    details: {
      category: "Marketing & Analitik",
      expectedOutput:
        "Dashboard dengan KPI engagement, format breakdown (Reels vs statis), audience sentiment, top movers, dan rekomendasi konten.",
      howItWorks: [
        "Input username Instagram yang ingin dianalisis",
        "Sistem tarik data posts dan reels via aikit API",
        "AI analisis engagement rate, format distribution, dan sentimen komentar",
        "Identifikasi top movers — konten yang overperform",
        "Baca hasil di dashboard interaktif",
      ],
      useCases: [
        "Tim konten yang riset format mana yang paling efektif",
        "Kompetitor intelligence untuk agency",
        "Benchmarking performa akun brand sendiri",
      ],
      requirements: "Username Instagram (akun publik)",
      estimatedTime: "3–7 menit",
    },
  },
  {
    id: "tiktok-ads-spy",
    title: "TikTok Ads Spy",
    desc: "Spy iklan kompetitor di TikTok Ads Library — creative gallery, share-of-voice, targeting & region intelligence.",
    type: "App",
    pricing: "Pay per run",
    costPerRun: 150,
    users: 5,
    image: "/automation-covers/tiktok-ads-spy.webp",
    details: {
      category: "Ads Intelligence",
      expectedOutput:
        "Gallery creative iklan kompetitor, analisis CTA, targeting usia/gender, share-of-voice, dan region breakdown dalam satu dashboard.",
      howItWorks: [
        "Input nama brand atau keyword yang ingin di-spy",
        "Sistem tarik data dari TikTok Ads Library",
        "AI kategorisasi iklan berdasarkan format, CTA, dan targeting",
        "Hitung share-of-voice dan identifikasi pattern iklan aktif",
        "Baca hasil di creative gallery + insights dashboard",
      ],
      useCases: [
        "Tim ads yang riset creative kompetitor sebelum buat campaign",
        "Media buyer yang ingin tahu angle iklan yang sedang jalan",
        "Brand yang benchmarking spend dan targeting kompetitor",
      ],
      requirements: "Nama brand kompetitor atau keyword kategori",
      estimatedTime: "2–4 menit",
    },
  },
  {
    id: "meta-ads-spy",
    title: "Meta Ads Spy",
    desc: "Spy iklan kompetitor di Meta Ads Library (Facebook + Instagram) — creative gallery, ad copy, format & platform mix, longevity & influencer partnerships.",
    type: "App",
    pricing: "Pay per run",
    costPerRun: 150,
    users: 4,
    image: "/automation-covers/meta-ads-spy.webp",
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
];

export function getAutomationCostLabel(card) {
  return card.costPerRun === 0 ? "Gratis" : `${card.costPerRun} kredit`;
}
