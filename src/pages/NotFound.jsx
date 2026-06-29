import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5ecd9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        color: "#29405f",
      }}
    >
      <div>
        <p style={{ fontSize: 48, fontWeight: 700, color: "#0d1d38", margin: 0 }}>
          404
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0d1d38" }}>
          Halaman tidak ditemukan
        </h1>
        <p style={{ fontSize: 15, fontWeight: 500, color: "#55606d" }}>
          Tautan mungkin salah atau halaman sudah dipindahkan.
        </p>
        <Link
          to="/"
          className="cta-button"
          style={{ marginTop: 16, textDecoration: "none" }}
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
