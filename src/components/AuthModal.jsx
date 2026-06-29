import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../lib/ToastContext";
import { supabase } from "../lib/supabase";
import "./AuthModal.css";

/**
 * Login / Sign-up popover. Controlled by parent via `open` + `mode`.
 * Reuses platform tokens — no change to existing UI elements.
 */
export default function AuthModal({ open, mode = "login", onClose, onModeChange }) {
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

  // Reset transient state whenever the modal opens or the mode flips.
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
    <div className="ak-auth-overlay" onMouseDown={onClose}>
      <div
        className="ak-auth-card"
        role="dialog"
        aria-modal="true"
        aria-label={isSignup ? "Daftar akun" : "Masuk"}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="ak-auth-x"
          aria-label="Tutup"
          onClick={onClose}
        >
          ×
        </button>

        <div className="ak-auth-head">
          <span className="ak-auth-eyebrow">aikit</span>
          <h2 className="ak-auth-title">
            {isForgot
              ? "Reset password"
              : isSignup
                ? "Buat akun gratis"
                : "Masuk ke aikit"}
          </h2>
          <p className="ak-auth-sub">
            {isForgot
              ? "Masukkan email kamu, kami kirim link untuk atur ulang password."
              : isSignup
                ? "Mulai pakai ratusan AI tools — bayar hanya saat dipakai."
                : "Lanjutkan ke dashboard dan tools kamu."}
          </p>
        </div>

        <form className="ak-auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="ak-auth-field">
              <span>Nama lengkap</span>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama kamu"
                required
              />
            </label>
          )}
          <label className="ak-auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              required
            />
          </label>
          {!isForgot && (
            <label className="ak-auth-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
              />
            </label>
          )}

          {!isSignup && !isForgot && (
            <button
              type="button"
              className="ak-auth-forgot"
              onClick={() => onModeChange?.("forgot")}
            >
              Lupa password?
            </button>
          )}

          {error && <div className="ak-auth-error">{error}</div>}

          <button type="submit" className="cta-button ak-auth-submit" disabled={busy}>
            {busy
              ? "Memproses..."
              : isForgot
                ? "Kirim link reset"
                : isSignup
                  ? "Daftar - gratis"
                  : "Masuk"}
          </button>

          {isSignup && (
            <p className="ak-auth-consent">
              Dengan mendaftar, kamu menyetujui{" "}
              <Link to="/terms" target="_blank">
                Syarat dan Ketentuan
              </Link>{" "}
              serta{" "}
              <Link to="/privacy" target="_blank">
                Kebijakan Privasi
              </Link>{" "}
              kami.
            </p>
          )}
        </form>

        <div className="ak-auth-foot">
          {isForgot ? (
            <span>
              Ingat password kamu?{" "}
              <button type="button" onClick={() => onModeChange?.("login")}>
                Masuk
              </button>
            </span>
          ) : isSignup ? (
            <span>
              Sudah punya akun?{" "}
              <button type="button" onClick={() => onModeChange?.("login")}>
                Masuk
              </button>
            </span>
          ) : (
            <>
              <span>
                Belum punya akun?{" "}
                <button type="button" onClick={() => onModeChange?.("signup")}>
                  Daftar gratis
                </button>
              </span>
              <span className="ak-auth-resend">
                Belum terima email konfirmasi?{" "}
                <button type="button" onClick={resendConfirmation}>
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
