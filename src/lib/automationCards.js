export const AUTOMATION_CARDS = [
  {
    id: "google-maps-leads-brightdata",
    title: "Google Maps Leads Scraper",
    desc: "Fresh-start automation untuk business leads Google Maps dengan fondasi baru yang dipisah dari stack lama.",
    type: "App",
    pricing: "Coming soon",
    costPerRun: 0,
    users: 0,
    image:
      "https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=900&h=560&fit=crop&auto=format",
    details: {
      category: "Lead Generation",
      expectedOutput:
        "Workflow baru untuk leads Google Maps dengan output terstruktur, siap dipakai setelah automation worker Bright Data selesai dihubungkan.",
      howItWorks: [
        "Input dan schema final sedang dipersiapkan di stack automation baru",
        "Data akan masuk ke automation database terpisah",
        "UI dashboard tetap memakai shell dan styling yang sama",
      ],
      useCases: [
        "Prospecting lokal",
        "Lead generation B2B",
        "Territory mapping sales",
      ],
      requirements: "Akan diaktifkan di fase rebuild automation",
      estimatedTime: "Segera hadir",
    },
  },
  {
    id: "tokopedia-search-brightdata",
    title: "Tokopedia Search Scraper",
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
