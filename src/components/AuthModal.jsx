import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../lib/ToastContext";
import { supabase } from "../lib/supabase";

/**
 * Login / Sign-up popover. Controlled by parent via `open` + `mode`.
 * Reuses platform tokens with Tailwind.
 */
export default function AuthModal({
  open,
  mode = "login",
  onClose,
  onModeChange,
}) {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  useEffect(() => {
    if (open) {
      setError("");
      setBusy(false);
    }
  }, [open, mode]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function resendConfirmation() {
    if (!email) return toast.error("Masukkan email kamu dulu.");
    const { error: err } = await supabase.auth.resend({ type: "signup", email });
    if (err) return toast.error(err.message);
    toast.success("Email konfirmasi dikirim ulang.");
  }

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isForgot) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        toast.success("Link reset password dikirim ke email kamu.");
        onModeChange?.("login");
      } else if (isSignup) {
        const { error: err } = await signUp(email, password, fullName);
        if (err) throw err;
        toast.success("Akun dibuat. Cek email untuk konfirmasi, lalu login.");
        onModeChange?.("login");
      } else {
        const { error: err } = await signIn(email, password);
        if (err) throw err;
        toast.success("Berhasil masuk. Selamat datang kembali!");
        onClose?.();
        navigate("/dashboard");
      }
    } catch (err) {
      const msg = err?.message || "Terjadi kesalahan. Coba lagi.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-[rgba(13,29,56,0.32)] p-5 backdrop-blur-sm animate-auth-fade"
      onMouseDown={onClose}
    >
      <div
        className="relative w-[min(420px,100%)] rounded-[18px] border border-border-warm bg-cream px-7 pb-6 pt-[30px] shadow-modal animate-auth-pop"
        role="dialog"
        aria-modal="true"
        aria-label={isSignup ? "Daftar akun" : "Masuk"}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-3.5 cursor-pointer border-none bg-transparent text-[22px] leading-none text-ink-muted hover:text-ink-mid"
          aria-label="Tutup"
          onClick={onClose}
        >
          ×
        </button>

        <div className="mb-5">
          <span className="mb-2 inline-block text-[13px] font-bold tracking-[0.01em] text-amber">
            Aispy
          </span>
          <h2 className="mb-1.5 m-0 text-2xl font-bold leading-[1.15] tracking-tight-lg text-ink-dark">
            {isForgot
              ? "Reset password"
              : isSignup
                ? "Buat akun gratis"
                : "Masuk ke Aispy"}
          </h2>
          <p className="m-0 text-sm font-medium leading-[1.45] text-ink-soft">
            {isForgot
              ? "Masukkan email kamu, kami kirim link untuk atur ulang password."
              : isSignup
                ? "Mulai pakai ratusan AI tools — bayar hanya saat dipakai."
                : "Lanjutkan ke dashboard dan tools kamu."}
          </p>
        </div>

        <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-mid">
                Nama lengkap
              </span>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama kamu"
                required
                className="h-11 rounded-[10px] border border-border-warm bg-white px-[14px] text-[15px] text-ink-dark outline-none transition-[border-color,box-shadow] duration-120 placeholder:text-ink-muted focus:border-amber focus:shadow-[0_0_0_3px_rgba(246,166,30,0.18)]"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-mid">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              required
              className="h-11 rounded-[10px] border border-border-warm bg-white px-[14px] text-[15px] text-ink-dark outline-none transition-[border-color,box-shadow] duration-120 placeholder:text-ink-muted focus:border-amber focus:shadow-[0_0_0_3px_rgba(246,166,30,0.18)]"
            />
          </label>

          {!isForgot && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-mid">
                Password
              </span>
              <input
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
                className="h-11 rounded-[10px] border border-border-warm bg-white px-[14px] text-[15px] text-ink-dark outline-none transition-[border-color,box-shadow] duration-120 placeholder:text-ink-muted focus:border-amber focus:shadow-[0_0_0_3px_rgba(246,166,30,0.18)]"
              />
            </label>
          )}

          {!isSignup && !isForgot && (
            <button
              type="button"
              className="-mt-1 self-start border-none bg-transparent p-0 text-[13px] font-semibold text-ink-soft hover:text-ink-dark"
              onClick={() => onModeChange?.("forgot")}
            >
              Lupa password?
            </button>
          )}

          {error && (
            <div className="rounded-lg border border-[#f0cfcf] bg-[#fceeee] px-[10px] py-2 text-[13px] font-semibold text-[#b23b3b]">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="cta-button mt-1 flex h-[46px] w-full justify-center disabled:cursor-progress disabled:opacity-65"
            disabled={busy}
          >
            {busy
              ? "Memproses..."
              : isForgot
                ? "Kirim link reset"
                : isSignup
                  ? "Daftar - gratis"
                  : "Masuk"}
          </button>

          {isSignup && (
            <p className="mt-3 text-center text-xs font-medium leading-[1.45] text-ink-muted">
              Dengan mendaftar, kamu menyetujui{" "}
              <Link to="/terms" target="_blank" className="font-semibold text-amber no-underline hover:underline">
                Syarat dan Ketentuan
              </Link>{" "}
              serta{" "}
              <Link to="/privacy" target="_blank" className="font-semibold text-amber no-underline hover:underline">
                Kebijakan Privasi
              </Link>{" "}
              kami.
            </p>
          )}
        </form>

        <div className="mt-[18px] text-center text-sm font-medium text-ink-soft">
          {isForgot ? (
            <span>
              Ingat password kamu?{" "}
              <button
                type="button"
                className="border-none bg-transparent p-0 font-bold text-amber hover:underline"
                onClick={() => onModeChange?.("login")}
              >
                Masuk
              </button>
            </span>
          ) : isSignup ? (
            <span>
              Sudah punya akun?{" "}
              <button
                type="button"
                className="border-none bg-transparent p-0 font-bold text-amber hover:underline"
                onClick={() => onModeChange?.("login")}
              >
                Masuk
              </button>
            </span>
          ) : (
            <>
              <span>
                Belum punya akun?{" "}
                <button
                  type="button"
                  className="border-none bg-transparent p-0 font-bold text-amber hover:underline"
                  onClick={() => onModeChange?.("signup")}
                >
                  Daftar gratis
                </button>
              </span>
              <span className="mt-2 block text-[13px]">
                Belum terima email konfirmasi?{" "}
                <button
                  type="button"
                  className="border-none bg-transparent p-0 font-bold text-amber hover:underline"
                  onClick={resendConfirmation}
                >
                  Kirim ulang
                </button>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
