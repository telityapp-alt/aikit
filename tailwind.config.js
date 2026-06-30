/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // ── Brand colors (dari styling-guide.md / token yang ada di CSS) ──
      colors: {
        // Backgrounds
        sand: "#ffffff", // page background
        "sand-light": "#ffffff", // root bg
        cream: "#ffffff", // card / sidebar bg
        "frame-bg": "#ffffff",

        // Borders
        "border-warm": "#dce8f8",
        "border-sand": "#dce8f8",
        "border-muted": "#dce8f8",

        // Text
        ink: "#111318", // default text
        "ink-dark": "#0d1d38", // headings
        "ink-mid": "#29405f", // body text
        "ink-soft": "#55606d", // secondary text
        "ink-muted": "#7b8594", // tertiary text
        "ink-faint": "#b8b0a0", // disabled / dividers

        // Brand accents
        amber: "#1cb0f6", // primary CTA color
        "amber-dark": "#0e8fd4",
        "amber-border": "#0e8fd4",
        "amber-border2": "#0e8fd4",

        // Blue accents (tabs, links)
        "blue-brand": "#377cf6",
        "blue-vivid": "#2c67f5",
        "blue-light": "#4f8bff",

        // Status
        "green-brand": "#2e9e55",
        "teal-brand": "#37d7c8",

        // Topbar
        "topbar-from": "#f0f6ff",
        "topbar-to": "#e8f2ff",
        "topbar-border": "#dce8f8",

        // Nav text
        "nav-text": "#2e3137",
        "logo-text": "#292721",
        caret: "#786f60",
      },

      fontFamily: {
        sans: ["'Source Sans 3'", "'Segoe UI'", "sans-serif"],
      },

      fontSize: {
        // Tailwind default + custom sizes yang sering muncul
        11: "11px",
        13: "13px",
        15: "15px",
        17: "17px",
        28: "28px",
      },

      letterSpacing: {
        "tight-logo": "-0.5px",
        "tight-sm": "-0.01em",
        "tight-md": "-0.02em",
        "tight-lg": "-0.03em",
        "tight-xl": "-0.035em",
        "tight-2xl": "-0.045em",
        "wide-chip": "0.02em",
      },

      borderRadius: {
        xl2: "12px",
        xl3: "18px",
      },

      boxShadow: {
        // CTA button shadow
        cta: "inset 0 -2px 0 #cf860d, 0 1px 0 rgba(129,79,2,0.32)",
        "cta-active": "inset 0 -1px 0 #cf860d, 0 0 0 rgba(129,79,2,0.16)",
        // Ghost button shadow
        ghost: "inset 0 -2px 0 rgba(196,138,40,0.24)",
        "ghost-active": "inset 0 -1px 0 rgba(14,143,212,0.2)",
        // Frame
        frame: "inset 0 1px 0 rgba(255,255,255,0.9)",
        // Auth modal
        modal: "0 24px 60px rgba(13,29,56,0.24)",
        // Stat card
        "card-hover": "0 4px 24px rgba(13,29,56,0.08)",
      },

      animation: {
        "auth-fade": "ak-auth-fade 160ms ease",
        "auth-pop": "ak-auth-pop 220ms cubic-bezier(0.22,1,0.36,1)",
      },

      keyframes: {
        "ak-auth-fade": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "ak-auth-pop": {
          from: { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },

      transitionProperty: {
        button: "transform, box-shadow, filter",
      },

      transitionDuration: {
        120: "120ms",
      },
    },
  },
  plugins: [],
};
