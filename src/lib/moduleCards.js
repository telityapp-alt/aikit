export const MODULE_CARDS = [
  {
    id: "keuangan-pribadi",
    title: "Manajer Keuangan Pribadi",
    desc: "Lacak pengeluaran, buat anggaran, dan analisis pola keuangan bulanan kamu secara otomatis.",
    category: "Keuangan",
    pricing: "Free",
    users: 143,
    image: null,
    details: {
      category: "Keuangan Personal",
      expectedOutput:
        "Dashboard keuangan bulanan dengan ringkasan pemasukan/pengeluaran, kategori belanja terbesar, dan rekomendasi anggaran.",
      howItWorks: [
        "Input transaksi harian atau upload rekening koran",
        "Sistem kategorisasi otomatis pengeluaran",
        "AI analisis pola belanja bulanan",
        "Generate laporan dan rekomendasi anggaran",
      ],
      useCases: [
        "Karyawan yang ingin kontrol pengeluaran bulanan",
        "Freelancer yang butuh tracking cashflow sederhana",
        "Siapa saja yang mau mulai financial planning",
      ],
      requirements: "Tidak ada — langsung mulai dari dashboard",
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
    image: null,
    details: {
      category: "CRM & Relasi",
      expectedOutput:
        "Database kontak terorganisir dengan tag, catatan, dan riwayat interaksi per kontak.",
      howItWorks: [
        "Tambah kontak manual atau import dari CSV",
        "Tag kontak berdasarkan tipe: customer, lead, vendor, dll",
        "Catat interaksi dan follow-up",
        "Filter dan cari kontak berdasarkan tag atau kategori",
      ],
      useCases: [
        "Sales yang butuh CRM ringan tanpa biaya",
        "Founder yang kelola relasi bisnis sendiri",
        "Tim marketing yang track leads dan kreator",
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
    image: null,
    details: {
      category: "Marketing & Operasional",
      expectedOutput:
        "Campaign board dengan objective, timeline, budget tracker, dan daftar kontak/aset yang terlibat.",
      howItWorks: [
        "Buat campaign baru dengan objective dan tanggal",
        "Set budget dan breakdown per channel",
        "Assign kontak dari Contact Manager",
        "Track progress dan update status campaign",
      ],
      useCases: [
        "Marketing manager yang kelola banyak campaign sekaligus",
        "Agency yang butuh visibilitas campaign per klien",
        "Founder yang plan campaign launch produk baru",
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
    image: null,
    details: {
      category: "Content Planning",
      expectedOutput:
        "Kalender konten visual dengan status per post, platform, dan integrasi ke campaign.",
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
