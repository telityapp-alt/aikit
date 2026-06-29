import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../lib/ToastContext";
import "../components/AuthModal.css";

// Landing page for the password-reset email link. Supabase establishes a
// recovery session from the URL (detectSessionInUrl), then the user sets a
// new password here.
export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password minimal 6 karakter.");
    if (pw !== pw2) return toast.error("Konfirmasi password tidak cocok.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password berhasil diubah. Silakan lanjut.");
    navigate("/dashboard");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5ecd9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div className="ak-auth-card" style={{ animation: "none" }}>
        <div className="ak-auth-head">
          <span className="ak-auth-eyebrow">aikit</span>
          <h2 className="ak-auth-title">Atur password baru</h2>
          <p className="ak-auth-sub">
            {ready
              ? "Masukkan password baru untuk akun kamu."
              : "Memverifikasi tautan reset..."}
          </p>
        </div>
        <form className="ak-auth-form" onSubmit={submit}>
          <label className="ak-auth-field">
            <span>Password baru</span>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
              required
              disabled={!ready}
            />
          </label>
          <label className="ak-auth-field">
            <span>Konfirmasi password baru</span>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              required
              disabled={!ready}
            />
          </label>
          <button
            type="submit"
            className="cta-button ak-auth-submit"
            disabled={busy || !ready}
          >
            {busy ? "Menyimpan..." : "Simpan password"}
          </button>
        </form>
      </div>
    </div>
  );
}
