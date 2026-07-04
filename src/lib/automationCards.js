export const AUTOMATION_CARDS = [
  {
    id: "instagram-profiles-brightdata",
    title: "Instagram Profiles by URL",
    desc: "Scrape profile intelligence Instagram langsung dari daftar URL dengan Bright Data dan output JSON yang siap dipakai tim riset atau sales.",
    type: "App",
    pricing: "Pay per run",
    costPerRun: 0,
    users: 0,
    image:
      "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=900&h=560&fit=crop&auto=format",
    details: {
      category: "Social Intelligence",
      expectedOutput:
        "Profil Instagram terstruktur lengkap dengan statistik utama, bio, external links, highlights, post ringkas, dan raw payload Bright Data.",
      howItWorks: [
        "Masukkan URL profil Instagram satu per baris atau upload CSV",
        "Worker memvalidasi input lalu menjalankan Bright Data dataset scrape",
        "Hasil disimpan ke automation database dan bisa diunduh dari dashboard",
      ],
      useCases: [
        "Creator sourcing",
        "Competitive profile research",
        "Lead enrichment untuk social outreach",
      ],
      requirements: "Butuh BRIGHTDATA_API_KEY dan dataset ID Instagram Profiles aktif",
      estimatedTime: "Biasanya selesai dalam hitungan detik sampai menit",
    },
  },
  {
    id: "tokopedia-search-brightdata",
    title: "Tokopedia Search Bright Data",
    desc: "Fresh-start automation untuk shelf intelligence Tokopedia dengan provider baru dan penyimpanan automation terpisah.",
    type: "App",
    pricing: "Coming soon",
    costPerRun: 0,
    users: 0,
    image:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=900&h=560&fit=crop&auto=format",
    details: {
      category: "Commerce Intelligence",
      expectedOutput:
        "Workflow baru untuk Tokopedia search intelligence dengan output all-fields dan reporting yang siap production saat backend baru aktif.",
      howItWorks: [
        "Input dan schema final sedang dipersiapkan di stack automation baru",
        "Data akan masuk ke automation database terpisah",
        "Dashboard visual tetap mengikuti styling guide yang sekarang",
      ],
      useCases: [
        "Keyword shelf monitoring",
        "Seller landscape analysis",
        "Marketplace research",
      ],
      requirements: "Akan diaktifkan di fase rebuild automation",
      estimatedTime: "Segera hadir",
    },
  },
];

export function getAutomationCostLabel(card) {
  return card.costPerRun === 0 ? "Gratis" : `${card.costPerRun} kredit`;
}

export const AUTOMATION_TOTAL = AUTOMATION_CARDS.length;
export const AUTOMATION_CATEGORY_COUNTS = AUTOMATION_CARDS.reduce((acc, c) => {
  const cat = c.details?.category || "Lainnya";
  acc[cat] = (acc[cat] || 0) + 1;
  return acc;
}, {});
