import { Link } from "react-router-dom";

const DOCS = {
  privacy: {
    title: "Kebijakan Privasi",
    updated: "Diperbarui 29 Juni 2026",
    sections: [
      {
        h: "Data yang kami kumpulkan",
        p: "Kami mengumpulkan data yang kamu berikan saat mendaftar (nama, email) serta data penggunaan tool, riwayat run, dan transaksi kredit. Kami tidak menjual data pribadi kamu.",
      },
      {
        h: "Cara kami menggunakan data",
        p: "Data digunakan untuk menyediakan layanan, memproses pembayaran, meningkatkan kualitas tool, serta mengirim notifikasi penting terkait akun kamu.",
      },
      {
        h: "Penyimpanan dan keamanan",
        p: "Data disimpan pada infrastruktur Supabase dengan kontrol akses baris (row level security). Kunci rahasia hanya berada di sisi server dan tidak pernah diekspos ke browser.",
      },
      {
        h: "Layanan pihak ketiga",
        p: "Kami menggunakan penyedia seperti Supabase, Cloudflare, dan layanan AI untuk menjalankan fitur tertentu. Mereka memproses data sesuai kebijakan masing-masing.",
      },
      {
        h: "Hak kamu",
        p: "Kamu dapat mengakses, memperbarui, atau meminta penghapusan data kamu kapan saja melalui halaman Pengaturan atau dengan menghubungi dukungan.",
      },
      {
        h: "Kontak",
        p: "Pertanyaan tentang privasi bisa dikirim ke support@aikit.id.",
      },
    ],
  },
  terms: {
    title: "Syarat dan Ketentuan",
    updated: "Diperbarui 29 Juni 2026",
    sections: [
      {
        h: "Penerimaan ketentuan",
        p: "Dengan membuat akun dan menggunakan Aispy, kamu menyetujui syarat dan ketentuan ini serta Kebijakan Privasi kami.",
      },
      {
        h: "Penggunaan layanan",
        p: "Aispy menyediakan AI tools dengan model bayar per penggunaan. Kamu bertanggung jawab atas data yang kamu masukkan dan cara kamu menggunakan hasilnya.",
      },
      {
        h: "Kredit dan pembayaran",
        p: "Saldo kredit digunakan untuk menjalankan tool berbayar. Kredit yang sudah terpakai tidak dapat dikembalikan kecuali terjadi kesalahan sistem dari pihak kami.",
      },
      {
        h: "Batasan",
        p: "Kamu setuju untuk tidak menyalahgunakan layanan, melanggar hukum yang berlaku, atau mengganggu operasional platform.",
      },
      {
        h: "Perubahan layanan",
        p: "Kami dapat memperbarui, menambah, atau menghentikan fitur dari waktu ke waktu. Perubahan penting akan kami informasikan.",
      },
      {
        h: "Kontak",
        p: "Pertanyaan tentang ketentuan bisa dikirim ke support@aikit.id.",
      },
    ],
  },
};

export default function LegalPage({ doc }) {
  const data = DOCS[doc] || DOCS.privacy;

  return (
    <div className="min-h-screen bg-sand text-ink-mid">
      <header className="mx-auto flex max-w-[760px] items-center justify-between px-[clamp(20px,5vw,56px)] py-[18px]">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight-md text-ink-dark no-underline"
        >
          Aispy
        </Link>
        <Link
          to="/"
          className="text-sm font-semibold text-ink-soft no-underline hover:text-ink-dark"
        >
          ← Beranda
        </Link>
      </header>

      <main className="mx-auto max-w-[760px] px-[clamp(20px,5vw,56px)] pb-[72px] pt-3">
        <h1 className="mb-1.5 text-[clamp(26px,4vw,34px)] font-bold tracking-tight-lg text-ink-dark">
          {data.title}
        </h1>
        <p className="mb-7 text-[13px] font-medium text-ink-muted">
          {data.updated}
        </p>

        {data.sections.map((section) => (
          <section key={section.h} className="mb-6">
            <h2 className="mb-2 text-lg font-bold text-ink-dark">
              {section.h}
            </h2>
            <p className="m-0 text-[15px] font-medium leading-relaxed text-ink-mid">
              {section.p}
            </p>
          </section>
        ))}

        <div className="mt-9 flex items-center gap-2.5 border-t border-border-muted pt-5 text-sm font-semibold">
          <Link to="/privacy" className="text-amber no-underline hover:underline">
            Kebijakan Privasi
          </Link>
          <span className="text-ink-faint">·</span>
          <Link to="/terms" className="text-amber no-underline hover:underline">
            Syarat dan Ketentuan
          </Link>
        </div>
      </main>
    </div>
  );
}
