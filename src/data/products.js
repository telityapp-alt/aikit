// Rich product detail for the landing "Library" grid. Each entry powers the
// /product/:slug detail page. Keep copy in normal case (no all-caps content).

export const PRODUCTS = [
  {
    slug: "instagram-analyzer",
    name: "Generator Laporan Kompetitor Instagram",
    accent: "#e1306c",
    image: "/lib-signal-board.png",
    price: "Rp15.000",
    setup: "~1 menit setup",
    automationSlug: "social-caption",
    tagline:
      "Automasi berbasis AI untuk mengambil data konten kompetitor Instagram dari tab Posts atau Reels, menganalisis engagement dan komentar, lalu menyusunnya ke file Excel yang siap diolah.",
    features: [
      "Analisis konten dari tab Posts atau Reels",
      "Data lengkap konten Instagram otomatis",
      "Analisis 5 konten terbaik",
      "Insight dari komentar dan engagement kompetitor",
      "File Excel dengan data raw dan clean",
    ],
    steps: [
      {
        title: "Pilih sumber konten dan akun",
        desc: "Masukkan akun Instagram kompetitor dan pilih tab Posts atau Reels yang ingin dianalisis.",
      },
      {
        title: "Tentukan periode dan proses AI",
        desc: "Pilih rentang tanggal, lalu sistem mengumpulkan data, menganalisis engagement, dan merangkum konten terbaik.",
      },
      {
        title: "Download laporan Excel",
        desc: "Dapatkan file Excel lengkap berisi raw data, clean data, dan insight dari konten kompetitor.",
      },
    ],
    useCases: [
      "Riset kompetitor Instagram dari tab Posts atau Reels",
      "Analisis performa konten kompetitor per periode tertentu",
      "Benchmark engagement dari konten terbaik kompetitor",
      "Identifikasi pola konten yang paling menarik audiens",
      "Bahan laporan dan perencanaan strategi konten",
    ],
    video: "",
  },
  {
    slug: "cv-reviewer",
    name: "CV Reviewer AI",
    accent: "#37d7c8",
    image: "/lib-flow-pilot.png",
    price: "Rp10.000",
    setup: "~30 detik setup",
    automationSlug: "ats-cv",
    tagline:
      "Unggah CV kamu dan dapatkan feedback detail dari AI dalam hitungan detik — skor, kelemahan per bagian, dan saran perbaikan yang konkret.",
    features: [
      "Skor keseluruhan dan per section",
      "Analisis keterbacaan untuk sistem ATS",
      "Saran perbaikan kata dan struktur",
      "Identifikasi kata kunci dari deskripsi pekerjaan",
      "Ringkasan kelebihan dan kelemahan",
    ],
    steps: [
      {
        title: "Unggah CV kamu",
        desc: "Tempel teks CV atau unggah file, lalu pilih posisi yang kamu tuju.",
      },
      {
        title: "AI menganalisis",
        desc: "Sistem menilai setiap bagian, mencocokkan dengan standar ATS, dan menyiapkan saran.",
      },
      {
        title: "Terima laporan",
        desc: "Dapatkan skor, daftar perbaikan, dan versi rekomendasi yang lebih kuat.",
      },
    ],
    useCases: [
      "Persiapan melamar kerja dengan CV yang lolos ATS",
      "Perbaikan CV sebelum interview",
      "Menyesuaikan CV dengan posisi spesifik",
      "Membandingkan beberapa versi CV",
    ],
    video: "",
  },
  {
    slug: "riset-pasar",
    name: "Riset Pasar Instan",
    accent: "#f3ba3f",
    image: "/lib-warehouse-one.png",
    price: "Rp25.000",
    setup: "~2 menit setup",
    automationSlug: "data-cleaner",
    tagline:
      "Ringkasan riset pasar untuk ide bisnis atau produk baru — target market, kompetitor, dan peluang, semua dalam satu laporan siap pakai.",
    features: [
      "Profil target market dan segmentasi",
      "Pemetaan kompetitor utama",
      "Estimasi ukuran dan tren pasar",
      "Peluang dan risiko ringkas",
      "Rekomendasi langkah awal",
    ],
    steps: [
      {
        title: "Jelaskan ide kamu",
        desc: "Masukkan deskripsi produk atau bisnis dan target lokasi.",
      },
      {
        title: "AI menyusun riset",
        desc: "Sistem mengumpulkan sinyal pasar dan merangkum temuan penting.",
      },
      {
        title: "Baca laporan",
        desc: "Dapatkan laporan terstruktur yang bisa langsung dipakai presentasi.",
      },
    ],
    useCases: [
      "Validasi ide bisnis sebelum eksekusi",
      "Bahan pitch deck untuk investor",
      "Menentukan target market produk baru",
      "Memahami lanskap kompetitor",
    ],
    video: "",
  },
  {
    slug: "email-writer",
    name: "Email Writer",
    accent: "#ff5c62",
    image: "/lib-issue-radar.png",
    price: "Rp5.000",
    setup: "~30 detik setup",
    automationSlug: "email-blast",
    tagline:
      "Tulis email profesional, pitching, atau follow-up dalam hitungan detik dengan nada yang sesuai konteks.",
    features: [
      "Cold email dan proposal",
      "Follow-up dan negosiasi",
      "Balasan customer support",
      "Pilihan nada formal atau santai",
      "Versi singkat dan panjang",
    ],
    steps: [
      {
        title: "Beri konteks",
        desc: "Tulis tujuan email, penerima, dan poin penting yang ingin disampaikan.",
      },
      {
        title: "AI menyusun draft",
        desc: "Sistem membuat beberapa varian dengan nada yang kamu pilih.",
      },
      {
        title: "Salin dan kirim",
        desc: "Pilih versi terbaik, sesuaikan sedikit, lalu kirim.",
      },
    ],
    useCases: [
      "Outreach ke calon klien",
      "Follow-up setelah meeting",
      "Membalas pertanyaan pelanggan",
      "Menulis proposal kerja sama",
    ],
    video: "",
  },
  {
    slug: "youtube-summarizer",
    name: "YouTube Summarizer",
    accent: "#ff0000",
    image: "/lib-launch-deck.png",
    price: "Rp8.000",
    setup: "~30 detik setup",
    automationSlug: "pdf-summarizer",
    tagline:
      "Rangkum video YouTube panjang menjadi poin-poin penting — transkrip, insight utama, dan takeaway yang bisa langsung ditindaklanjuti.",
    features: [
      "Transkrip otomatis",
      "Ringkasan poin utama",
      "Takeaway actionable",
      "Daftar timestamp penting",
      "Versi ringkas untuk dibagikan",
    ],
    steps: [
      {
        title: "Tempel URL video",
        desc: "Masukkan tautan video YouTube yang ingin dirangkum.",
      },
      {
        title: "AI merangkum",
        desc: "Sistem membaca transkrip dan menyusun ringkasan terstruktur.",
      },
      {
        title: "Baca ringkasan",
        desc: "Dapatkan poin utama dan takeaway tanpa menonton penuh.",
      },
    ],
    useCases: [
      "Belajar cepat dari video edukasi",
      "Riset konten kompetitor",
      "Menyiapkan catatan dari webinar",
      "Mengubah video jadi artikel",
    ],
    video: "",
  },
  {
    slug: "price-tracker",
    name: "Marketplace Price Tracker",
    accent: "#6f58ff",
    image: "/lib-audience-lab.png",
    price: "Rp20.000",
    setup: "~1 menit setup",
    automationSlug: "data-cleaner",
    tagline:
      "Pantau harga produk kompetitor di marketplace secara real-time — rentang harga, siapa termurah, dan tren pergerakan harga.",
    features: [
      "Rentang harga kompetitor",
      "Penjual termurah dan termahal",
      "Tren harga per periode",
      "Perbandingan antar produk serupa",
      "Ekspor data ke Excel",
    ],
    steps: [
      {
        title: "Masukkan kata kunci produk",
        desc: "Ketik nama atau kategori produk yang ingin kamu pantau.",
      },
      {
        title: "AI mengumpulkan harga",
        desc: "Sistem mengambil data harga dan menyusun perbandingan.",
      },
      {
        title: "Lihat laporan",
        desc: "Dapatkan ringkasan harga dan tren yang mudah dibaca.",
      },
    ],
    useCases: [
      "Menentukan harga jual yang kompetitif",
      "Memantau promo kompetitor",
      "Analisis tren harga musiman",
      "Riset sebelum restock",
    ],
    video: "",
  },
  {
    slug: "konten-sosmed",
    name: "Generator Konten Sosmed",
    accent: "#1da1f2",
    image: "/lib-support-graph.png",
    price: "Rp8.000",
    setup: "~30 detik setup",
    automationSlug: "social-caption",
    tagline:
      "Buat caption, thread, atau skrip konten siap posting untuk Instagram, TikTok, Twitter, dan LinkedIn dari brief singkat.",
    features: [
      "Caption multi-platform",
      "Hook dan thread",
      "Skrip video pendek",
      "Variasi nada dan gaya",
      "Saran hashtag relevan",
    ],
    steps: [
      {
        title: "Tulis brief",
        desc: "Jelaskan topik, target audiens, dan platform tujuan.",
      },
      {
        title: "AI membuat konten",
        desc: "Sistem menghasilkan beberapa varian siap pakai.",
      },
      {
        title: "Pilih dan posting",
        desc: "Ambil versi terbaik, sesuaikan, lalu posting.",
      },
    ],
    useCases: [
      "Produksi konten harian lebih cepat",
      "Mengisi kalender konten",
      "Membuat variasi A/B caption",
      "Repurpose satu ide ke banyak platform",
    ],
    video: "",
  },
  {
    slug: "lead-scraper",
    name: "Lead Scraper",
    accent: "#0a66c2",
    image: "/lib-focus-room.png",
    price: "Rp50.000",
    setup: "~2 menit setup",
    automationSlug: "data-cleaner",
    tagline:
      "Temukan prospek potensial berdasarkan kriteria bisnis kamu — nama, jabatan, perusahaan, dan info kontak publik dalam satu daftar.",
    features: [
      "Pencarian berdasarkan industri dan jabatan",
      "Data nama, perusahaan, dan posisi",
      "Info kontak publik",
      "Skor relevansi prospek",
      "Ekspor ke Excel atau CSV",
    ],
    steps: [
      {
        title: "Tentukan kriteria",
        desc: "Pilih industri, jabatan, dan lokasi target prospek.",
      },
      {
        title: "AI mengumpulkan leads",
        desc: "Sistem menyusun daftar prospek yang sesuai kriteria.",
      },
      {
        title: "Unduh daftar",
        desc: "Dapatkan file siap dipakai untuk outreach.",
      },
    ],
    useCases: [
      "Membangun pipeline penjualan",
      "Riset prospek untuk outreach",
      "Mengisi database CRM",
      "Targeting kampanye B2B",
    ],
    video: "",
  },
];

export function getProduct(slug) {
  return PRODUCTS.find((p) => p.slug === slug) || null;
}
