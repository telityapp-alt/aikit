/**
 * Shared formatter library — all modules must import from here.
 * No module should define its own local number/date/currency formatters.
 */
export const fmt = {
  /**
   * Full number with id-ID locale separators.
   * e.g. 1234567 → "1.234.567"
   */
  number(v) {
    return Number(v || 0).toLocaleString("id-ID");
  },

  /**
   * Compact notation with one decimal, trailing .0 stripped.
   * e.g. 1500 → "1.5K", 2300000 → "2.3M", 999 → "999"
   */
  compact(v) {
    const n = Number(v || 0);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return String(n);
  },

  /**
   * Percentage with 2 decimal places.
   * Pass the display value directly — fmt.percent(12.34) → "12.34%"
   */
  percent(v) {
    return `${Number(v || 0).toFixed(2)}%`;
  },

  /**
   * Indonesian Rupiah with a space after "Rp".
   * e.g. 1500000 → "Rp 1.500.000"
   */
  rupiah(v) {
    return "Rp " + Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });
  },

  /**
   * Relative time in Bahasa Indonesia, derived from a date value.
   * e.g. "baru saja", "5 menit lalu", "3 jam lalu", "2 hari lalu"
   * Returns "" for falsy input.
   */
  relativeTime(v) {
    if (!v) return "";
    const diff = Date.now() - new Date(v).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return `${Math.floor(hours / 24)} hari lalu`;
  },

  /**
   * Display date in id-ID locale.
   * e.g. "02 Jan 2025"
   * Returns "-" for falsy input.
   */
  date(v) {
    if (!v) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(v));
  },

  /**
   * Date string formatted for <input type="date"> value.
   * e.g. "2025-01-02"
   * Returns "" for falsy input.
   */
  dateInput(v) {
    if (!v) return "";
    const d = new Date(v);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  },
};
