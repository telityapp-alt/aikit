import { Link } from "react-router-dom";
import "./LegalPage.css";

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
        p: "Dengan membuat akun dan menggunakan aikit, kamu menyetujui syarat dan ketentuan ini serta Kebijakan Privasi kami.",
      },
      {
        h: "Penggunaan layanan",
        p: "aikit menyediakan AI tools dengan model bayar per penggunaan. Kamu bertanggung jawab atas data yang kamu masukkan dan cara kamu menggunakan hasilnya.",
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
    <div className="legal-shell">
      <header className="legal-topbar">
        <Link to="/" className="legal-brand">
          aikit
        </Link>
        <Link to="/" className="legal-back">
          ← Beranda
        </Link>
      </header>
      <main className="legal-main">
        <h1 className="legal-title">{data.title}</h1>
        <p className="legal-updated">{data.updated}</p>
        {data.sections.map((s) => (
          <section key={s.h} className="legal-section">
            <h2 className="legal-h2">{s.h}</h2>
            <p className="legal-p">{s.p}</p>
          </section>
        ))}
        <div className="legal-links">
          <Link to="/privacy">Kebijakan Privasi</Link>
          <span>·</span>
          <Link to="/terms">Syarat dan Ketentuan</Link>
        </div>
      </main>
    </div>
  );
}
