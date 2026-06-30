import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProduct } from "../data/products";
import { useAuth } from "../lib/AuthContext";
import AuthModal from "../components/AuthModal.jsx";

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[18px] w-[18px] flex-none fill-none stroke-[var(--pd-accent,#2fa36b)] stroke-[1.5] mt-px">
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
      <div className="min-h-screen bg-sand text-ink-mid">
        <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,56px)] py-20 text-center">
          <h1 className="text-[26px] font-bold text-ink-dark">
            Produk tidak ditemukan
          </h1>
          <Link to="/" className="ghost-button mt-4 inline-flex no-underline">
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
    <div
      className="min-h-screen bg-sand text-ink-mid"
      style={{ "--pd-accent": product.accent }}
    >
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-[clamp(20px,5vw,56px)] py-[18px]">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight-md text-ink-dark no-underline"
        >
          aikit
        </Link>
        <Link
          to="/"
          className="text-sm font-semibold text-ink-soft no-underline hover:text-ink-dark"
        >
          ← Semua tools
        </Link>
      </header>

      <main className="mx-auto grid max-w-[1180px] grid-cols-1 items-start gap-9 px-[clamp(20px,5vw,56px)] pb-16 pt-2 min-[861px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section className="mb-9 flex flex-col gap-[22px]">
            <div className="aspect-[16/7] overflow-hidden rounded-[18px] border border-border-warm bg-cream">
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <span className="mb-2 inline-block text-[13px] font-semibold text-[var(--pd-accent)]">
                {product.setup}
              </span>
              <h1 className="mb-3 text-[clamp(26px,4vw,38px)] font-bold leading-[1.1] tracking-tight-lg text-ink-dark">
                {product.name}
              </h1>
              <p className="m-0 max-w-[640px] text-base font-medium leading-[1.55] text-ink-mid">
                {product.tagline}
              </p>
            </div>
          </section>

          <section className="border-t border-border-muted py-[26px]">
            <h2 className="mb-[18px] text-xl font-bold tracking-tight-md text-ink-dark">
              Fitur utama
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0">
              {product.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-[15px] font-medium leading-[1.45] text-ink-mid"
                >
                  <Check />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-border-muted py-[26px]">
            <h2 className="mb-[18px] text-xl font-bold tracking-tight-md text-ink-dark">
              Cara kerja
            </h2>
            <ol className="m-0 grid list-none gap-[18px] p-0">
              {product.steps.map((step, index) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--pd-accent,#f6a61e)_40%,#d9d1c2)] bg-[color-mix(in_srgb,var(--pd-accent,#f6a61e)_16%,#fff)] text-sm font-bold text-ink-dark">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="m-0 mb-1 mt-1 text-base font-bold text-ink-dark">
                      {step.title}
                    </h3>
                    <p className="m-0 text-[15px] font-medium leading-[1.5] text-ink-soft">
                      {step.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-t border-border-muted py-[26px]">
            <h2 className="mb-[18px] text-xl font-bold tracking-tight-md text-ink-dark">
              Kasus penggunaan
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0">
              {product.useCases.map((useCase) => (
                <li
                  key={useCase}
                  className="flex items-start gap-2.5 text-[15px] font-medium leading-[1.45] text-ink-mid"
                >
                  <Check />
                  <span>{useCase}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-border-muted py-[26px]">
            <h2 className="mb-[18px] text-xl font-bold tracking-tight-md text-ink-dark">
              Video penjelasan
            </h2>
            <div className="aspect-video overflow-hidden rounded-[14px] border border-border-warm bg-[#efe9dc]">
              {product.video ? (
                <iframe
                  src={product.video}
                  title={`Video ${product.name}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-muted">
                  <span>Video penjelasan segera hadir</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="sticky top-6 max-[860px]:order-[-1] max-[860px]:static">
          <div className="rounded-2xl border border-border-warm bg-cream p-[22px] shadow-[0_14px_26px_rgba(18,18,22,0.08)]">
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-bold tracking-tight-md text-ink-dark">
                {product.price}
              </span>
              <span className="text-[15px] font-semibold text-ink-soft">
                /run
              </span>
            </div>
            <p className="mb-4 mt-1.5 text-[13px] font-medium text-ink-soft">
              Bayar per penggunaan, tanpa berlangganan
            </p>
            <button
              type="button"
              className="cta-button flex h-[46px] w-full justify-center"
              onClick={runAutomation}
            >
              Jalankan automasi
            </button>
            <p className="mt-3 text-center text-[13px] font-medium text-ink-muted">
              {user
                ? "Lanjut ke dashboard untuk menjalankan."
                : "Daftar gratis untuk mulai."}
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
