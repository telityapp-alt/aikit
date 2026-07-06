export const AUTOMATION_CARDS = [
  {
    id: "instagram-profile-intelligence",
    title: "Instagram Profile Intelligence",
    desc: "Ambil intel profil Instagram dari daftar URL dan simpan hasil lengkap yang siap dipakai tim riset atau sales.",
    type: "App",
    pricing: "Pay per run",
    costPerRun: 0,
    users: 0,
    image:
      "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=900&h=560&fit=crop&auto=format",
    details: {
      category: "Social Intelligence",
      expectedOutput:
        "Profil Instagram terstruktur lengkap dengan statistik utama, bio, external links, highlights, post ringkas, dan raw payload penuh.",
      howItWorks: [
        "Masukkan URL profil Instagram satu per baris atau upload CSV",
        "Worker memvalidasi input lalu menjalankan proses pengambilan data profil",
        "Hasil disimpan ke automation database dan bisa diunduh dari dashboard",
      ],
      useCases: [
        "Creator sourcing",
        "Competitive profile research",
        "Lead enrichment untuk social outreach",
      ],
      requirements: "Butuh API key provider data profil dan dataset Instagram Profiles aktif",
      estimatedTime: "Biasanya selesai dalam hitungan detik sampai menit",
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
