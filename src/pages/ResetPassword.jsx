import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../lib/ToastContext";

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
    <div className="flex min-h-screen items-center justify-center bg-sand p-5">
      <div className="relative w-[min(420px,100%)] rounded-[18px] border border-border-warm bg-cream px-7 pb-6 pt-[30px] shadow-modal">
        <div className="mb-5">
          <span className="mb-2 inline-block text-[13px] font-bold tracking-[0.01em] text-amber">
            aikit
          </span>
          <h2 className="m-0 mb-1.5 text-2xl font-bold leading-[1.15] tracking-tight-lg text-ink-dark">
            Atur password baru
          </h2>
          <p className="m-0 text-sm font-medium leading-[1.45] text-ink-soft">
            {ready
              ? "Masukkan password baru untuk akun kamu."
              : "Memverifikasi tautan reset..."}
          </p>
        </div>

        <form className="flex flex-col gap-3.5" onSubmit={submit}>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-mid">
              Password baru
            </span>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
              disabled={!ready}
              className="h-11 rounded-[10px] border border-border-warm bg-white px-[14px] text-[15px] text-ink-dark outline-none transition-[border-color,box-shadow] duration-120 placeholder:text-ink-muted focus:border-amber focus:shadow-[0_0_0_3px_rgba(246,166,30,0.18)] disabled:bg-[#f6f4ee] disabled:text-ink-muted"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-mid">
              Konfirmasi password baru
            </span>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              disabled={!ready}
              className="h-11 rounded-[10px] border border-border-warm bg-white px-[14px] text-[15px] text-ink-dark outline-none transition-[border-color,box-shadow] duration-120 placeholder:text-ink-muted focus:border-amber focus:shadow-[0_0_0_3px_rgba(246,166,30,0.18)] disabled:bg-[#f6f4ee] disabled:text-ink-muted"
            />
          </label>

          <button
            type="submit"
            className="cta-button mt-1 h-11 self-start"
            disabled={busy || !ready}
          >
            {busy ? "Menyimpan..." : "Simpan password"}
          </button>
        </form>
      </div>
    </div>
  );
}
