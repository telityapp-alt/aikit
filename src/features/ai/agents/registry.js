export const AI_AGENTS = [
  {
    slug: "spark",
    name: "Spark",
    tagline: "General AI assistant untuk founder dan tim inti.",
    description:
      "Mitra kerja serbaguna untuk berpikir, menulis, merangkum, dan memecah problem bisnis sehari-hari.",
    mascot: "/mascots/flash-chat.webp",
    accent: "#ff9f1c",
    modelLabel: "Balanced generalist",
    capabilities: [
      "Brainstorm strategi dan ide cepat",
      "Ringkas dokumen, brief, atau meeting",
      "Tulis draft email, memo, dan presentasi",
      "Jadi command center lintas fungsi",
    ],
    starters: [
      "Bantu breakdown prioritas bisnis minggu ini",
      "Ringkas brief ini jadi action plan",
      "Bikin draft email update untuk tim",
    ],
    workspaceTitle: "Business copilot utama untuk keputusan harian.",
    placeholder: "Tanya apa pun ke Spark tentang bisnis, ide, atau eksekusi...",
  },
  {
    slug: "finance",
    name: "Finance",
    tagline: "Cashflow, budgeting, dan insight keuangan bisnis.",
    description:
      "Partner khusus untuk membaca angka, merapikan laporan, dan menerjemahkan data keuangan jadi keputusan.",
    mascot: "/mascots/flash-laptop.webp",
    accent: "#2a9d8f",
    modelLabel: "Structured analyst",
    capabilities: [
      "Analisis cashflow dan burn",
      "Bantu budgeting dan unit economics",
      "Ubah angka jadi laporan manajemen",
      "Deteksi potensi kebocoran biaya",
    ],
    starters: [
      "Bantu review cashflow bulan ini",
      "Bikin template budgeting operasional",
      "Jelaskan metrik keuangan yang harus dipantau",
    ],
    workspaceTitle: "Analyst desk untuk arus kas, margin, dan reporting.",
    placeholder: "Masukkan pertanyaan finance, laporan, atau angka yang mau dibedah...",
  },
  {
    slug: "operations",
    name: "Operations",
    tagline: "SOP, workflow, dan efisiensi tim operasional.",
    description:
      "Agent untuk merapikan proses, membuat SOP, dan mengubah pekerjaan manual jadi alur yang bisa diulang.",
    mascot: "/mascots/hedgehog-point.webp",
    accent: "#3a86ff",
    modelLabel: "Execution planner",
    capabilities: [
      "Bikin SOP dan checklist operasional",
      "Pecah workflow jadi langkah yang jelas",
      "Rapikan handoff antar tim",
      "Optimasi proses yang bottleneck",
    ],
    starters: [
      "Bantu bikin SOP onboarding karyawan",
      "Pecah workflow order fulfilment",
      "Cari bottleneck operasional dari proses ini",
    ],
    workspaceTitle: "Ops room untuk SOP, cadence, dan process design.",
    placeholder: "Jelaskan proses operasional yang ingin dirapikan atau diotomasi...",
  },
  {
    slug: "ecommerce",
    name: "Ecommerce",
    tagline: "Catalog, merchandising, listing, dan campaign jualan.",
    description:
      "Agent spesialis jualan digital untuk copy katalog, promo, bundling, dan optimasi conversion di storefront.",
    mascot: "/mascots/flash-wave.webp",
    accent: "#e76f51",
    modelLabel: "Commerce operator",
    capabilities: [
      "Tulis listing dan deskripsi produk",
      "Bantu promo, bundling, dan merchandising",
      "Analisis SKU dan positioning produk",
      "Siapkan campaign untuk momen penjualan",
    ],
    starters: [
      "Bantu optimasi deskripsi produk ini",
      "Ide promo bundle untuk katalog saya",
      "Bandingkan positioning 3 SKU utama",
    ],
    workspaceTitle: "Commerce desk untuk katalog, conversion, dan promo.",
    placeholder: "Tulis kebutuhan ecommerce, produk, atau campaign yang ingin dioptimasi...",
  },
  {
    slug: "knowledge",
    name: "Knowledge",
    tagline: "Central brain untuk docs, notes, dan institutional memory.",
    description:
      "Agent yang fokus menyimpan konteks bisnis, merangkum informasi, dan menjawab dari dokumen internal.",
    mascot: "/mascots/hedgehog-peek.webp",
    accent: "#6c5ce7",
    modelLabel: "Memory keeper",
    capabilities: [
      "Rangkum dokumen dan catatan internal",
      "Jadi pusat Q&A knowledge tim",
      "Rapikan insight dari banyak sumber",
      "Bangun memory yang reusable",
    ],
    starters: [
      "Bantu bikin knowledge base dari notes ini",
      "Ringkas meeting jadi keputusan penting",
      "Susun FAQ internal dari dokumen ini",
    ],
    workspaceTitle: "Knowledge hub untuk memory, docs, dan retrieval.",
    placeholder: "Masukkan pertanyaan dokumen, insight, atau knowledge yang mau diarsipkan...",
  },
  {
    slug: "growth",
    name: "Growth",
    tagline: "Positioning, experiments, campaign planning, dan opportunity scan.",
    description:
      "Agent pertumbuhan yang membantu riset pasar, angle campaign, eksperimen channel, dan peluang revenue baru.",
    mascot: "/mascots/hedgehog-celebrate.png",
    accent: "#9c6644",
    modelLabel: "Growth strategist",
    capabilities: [
      "Cari angle campaign dan positioning",
      "Bantu design eksperimen growth",
      "Petakan peluang channel baru",
      "Susun prioritas testing yang realistis",
    ],
    starters: [
      "Bantu susun eksperimen growth bulan ini",
      "Cari angle positioning baru untuk produk",
      "Bikin plan campaign launch yang lean",
    ],
    workspaceTitle: "Growth lab untuk eksperimen, messaging, dan expansion.",
    placeholder: "Tulis objective growth, campaign, atau peluang yang ingin dieksplor...",
  },
];

export const AI_AGENT_MAP = Object.fromEntries(
  AI_AGENTS.map((agent) => [agent.slug, agent]),
);

export function getAgentBySlug(slug) {
  return AI_AGENT_MAP[slug] || AI_AGENTS[0];
}
