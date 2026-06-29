import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProduct } from "../data/products";
import { useAuth } from "../lib/AuthContext";
import AuthModal from "../components/AuthModal.jsx";
import "./ProductDetail.css";

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="pd-check">
      <circle cx="8" cy="8" r="6" />
      <path d="m5.2 8.1 1.8 1.9 3.8-4" />
    </svg>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const product = getProduct(slug);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");

  if (!product) {
    return (
      <div className="pd-shell">
        <div className="pd-notfound">
          <h1>Produk tidak ditemukan</h1>
          <Link to="/" className="ghost-button pd-back-link">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  function runAutomation() {
    if (user) {
      navigate("/dashboard/automasi");
    } else {
      setAuthMode("signup");
      setAuthOpen(true);
    }
  }

  return (
    <div className="pd-shell" style={{ "--pd-accent": product.accent }}>
      <header className="pd-topbar">
        <Link to="/" className="pd-brand">
          aikit
        </Link>
        <Link to="/" className="pd-back">
          ← Semua tools
        </Link>
      </header>

      <main className="pd-main">
        <div className="pd-content">
          <section className="pd-hero">
            <div className="pd-hero-media">
              <img src={product.image} alt={product.name} />
            </div>
            <div className="pd-hero-copy">
              <span className="pd-setup">{product.setup}</span>
              <h1 className="pd-title">{product.name}</h1>
              <p className="pd-tagline">{product.tagline}</p>
            </div>
          </section>

          <section className="pd-block">
            <h2 className="pd-h2">Fitur utama</h2>
            <ul className="pd-feature-list">
              {product.features.map((f) => (
                <li key={f}>
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="pd-block">
            <h2 className="pd-h2">Cara kerja</h2>
            <ol className="pd-steps">
              {product.steps.map((s, i) => (
                <li key={s.title} className="pd-step">
                  <span className="pd-step-num">{i + 1}</span>
                  <div>
                    <h3 className="pd-step-title">{s.title}</h3>
                    <p className="pd-step-desc">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="pd-block">
            <h2 className="pd-h2">Kasus penggunaan</h2>
            <ul className="pd-feature-list">
              {product.useCases.map((u) => (
                <li key={u}>
                  <Check />
                  <span>{u}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="pd-block">
            <h2 className="pd-h2">Video penjelasan</h2>
            <div className="pd-video">
              {product.video ? (
                <iframe
                  src={product.video}
                  title={`Video ${product.name}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="pd-video-placeholder">
                  <span>Video penjelasan segera hadir</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="pd-aside">
          <div className="pd-price-card">
            <div className="pd-price-row">
              <span className="pd-price">{product.price}</span>
              <span className="pd-price-unit">/run</span>
            </div>
            <p className="pd-price-note">Bayar per penggunaan, tanpa berlangganan</p>
            <button type="button" className="cta-button pd-run" onClick={runAutomation}>
              Jalankan automasi
            </button>
            <p className="pd-price-sub">
              {user ? "Lanjut ke dashboard untuk menjalankan." : "Daftar gratis untuk mulai."}
            </p>
          </div>
        </aside>
      </main>

      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onModeChange={setAuthMode}
      />
    </div>
  );
}
