# Apphunt — Styling Guide

Reference lengkap design system. Setiap komponen baru harus mengikuti guide ini. Jangan improvisasi warna, shadow, atau spacing di luar yang terdefinisi di sini.

FATAL : NO EXTRABOLD, NO ALL UPPERCASE, NO ITALIC, WAJIB ALL PROPERLY NORMAL.

---


## 1. Design Tokens

### Color Palette

| Token | Value | Kegunaan |
|---|---|---|
| `--bg-page` | `#f5ecd9` | Background luar `.page-shell` |
| `--bg-surface` | `#fffdf8` | Background card, panel, body |
| `--bg-topbar` | `#f6f4ee → #f0ede6` | Header gradient |
| `--border` | `#d9d1c2` | Border default semua komponen |
| `--border-strong` | `#ddd4c4` | Border `.site-frame` |
| `--text-heading` | `#0d1d38` | H1, strong, label penting |
| `--text-body` | `#29405f` | Body text utama |
| `--text-muted` | `#55606d` | Secondary text, meta |
| `--text-faint` | `#7b8594` | Placeholder, label sidebar |
| `--amber` | `#f6a61e` | Accent utama, CTA background |
| `--amber-border` | `#c7820e` | Border CTA button |
| `--amber-shadow` | `#cf860d` | Inset shadow bawah CTA |
| `--nav-text` | `#2e3137` | Nav link warna default |

### Typography Rules

- Font weight yang dipakai: `600` (semibold), `700` (bold), `800` (extrabold)
- `font-weight: 500` hanya untuk body text panjang di dalam card
- `letter-spacing: -0.02em` sampai `-0.045em` untuk heading — makin besar font makin negatif
- Line height: `1` untuk H1 besar, `1.4–1.5` untuk body
- **NO `font-style: italic`** — tidak ada pemakaian italic di seluruh platform
- **NO `text-transform: uppercase`** kecuali eyebrow label kecil (`font-size: 11–12px`, `letter-spacing: 0.07–0.08em`) dan hanya di sidebar/section label
- **NO `text-transform: uppercase` pada button, nav, heading, atau body text**

---

## 2. Layout Shells

### Page Shell

```css
.page-shell        /* background: #f5ecd9, padding: 0 20px */
.site-frame        /* width: min(1500px, calc(100vw - 88px)), background: #fffdf8 */
```

### Content Wrappers

```css
.content           /* width: min(1040px, calc(100% - 108px)), padding: 44px 0 42px */
.content-wide      /* width: min(1400px, calc(100% - 64px)) */
```

Gunakan `.content` untuk halaman narasi/detail. Gunakan `.content-wide` untuk halaman dengan grid (Apps, Marketplace, Bursa).

---

## 3. Buttons

### Dua tipe saja — tidak ada variasi lain

**CTA Button** (primary action)

```css
.cta-button {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #111;
  border: 1px solid #c7820e;
  background: #f6a61e;
  box-shadow: inset 0 -2px 0 #cf860d, 0 1px 0 rgba(129,79,2,.32);
}
```

**Ghost Button** (secondary action)

```css
.ghost-button {
  /* sama shape dengan .cta-button */
  color: #374352;
  border: 1px solid #c48a28;
  background: linear-gradient(180deg, #fffefb 0%, #f7f5f0 100%);
  box-shadow: inset 0 -2px 0 rgba(196,138,40,.24);
}
```

### Hover & Active (universal)

```
hover  → translateY(1px) scale(0.995)
active → translateY(2px) scale(0.99)
```

Selalu pakai press-down effect. **Tidak ada floating shadow on hover.**

### Size variants via inline style

```jsx
// Topbar CTA
style={{ height: 38, borderRadius: 9 }}

// Card compact
style={{ height: 30, fontSize: 11, padding: "0 8px" }}

// Section CTA
style={{ height: 34, fontSize: 13 }}

// Full-width card footer
style={{ width: "100%", fontSize: 13, height: 34 }}
```

### Rules
- Selalu `type="button"` pada semua `<button>`
- Label button: sentence case, tidak uppercase, tidak ada ikon di dalam button hero/banner
- Dua button berdampingan: `cta-button` kiri, `ghost-button` kanan
- Button di dalam card footer selalu `marginTop: "auto"` (lihat section Card)

---

## 4. Cards

### Library Card (product card — grid view)

Struktur wajib:

```jsx
<article className="library-card" style={{ display:"flex", flexDirection:"column" }}>

  {/* 1. Hero image */}
  <div className="library-card-hero">
    <div className="library-card-screenshot-wrap">
      <img className="library-card-screenshot" src={...} alt={...} />
    </div>
    {/* Badge chip di atas image — absolute positioned */}
  </div>

  {/* 2. Title ribbon — SELALU ada */}
  <div className="library-card-ribbon">
    <strong>{name}</strong>   {/* 17px, 800, #0f172c */}
    <span>{category}</span>  {/* 13px, 600, #7a8699 */}
  </div>

  {/* 3. Meta body — flex column, flex:1 */}
  <div className="library-card-meta" style={{ display:"flex", flexDirection:"column", flex:1, padding:"10px 12px 12px" }}>

    {/* Desc — max 2 baris, truncate */}
    <p style={{ WebkitLineClamp:2, WebkitBoxOrient:"vertical", display:"-webkit-box", overflow:"hidden" }}>
      {desc}
    </p>

    {/* ... konten dinamis ... */}

    {/* Button SELALU di sini, marginTop auto */}
    <div style={{ marginTop:"auto" }}>
      <button className="cta-button" ...>...</button>
    </div>

  </div>
</article>
```

CSS card properties:

```css
.library-card {
  border: 1px solid #d9d1c2;
  border-bottom-width: 2px;
  border-radius: 10px;
  background: #fffdf8;
  box-shadow:
    inset 0 -3px 0 rgba(21,19,16,.09),
    0 1px 3px rgba(21,19,16,.07),
    0 4px 12px rgba(21,19,16,.05);
  transition: transform 260ms cubic-bezier(.22,1,.36,1), box-shadow 260ms ...;
}
.library-card:hover {
  transform: translateY(2px);
  box-shadow: inset 0 2px 4px rgba(21,19,16,.05), 0 1px 2px rgba(21,19,16,.04);
}
```

**Ribbon wajib di-rotate:**

```css
.library-card-ribbon {
  transform: rotate(-2deg);
  margin: -32px -6px 0;
  /* jangan hilangkan rotate ini */
}
```

**Hero image aspect ratio:** `16/10` — jangan diubah.

### Card Chip (badge di atas image)

```css
.library-card-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #ddd4c4;
  background: #f5f2ec;
  color: #4a5666;
  font-size: 13px;
  font-weight: 600;
}
```

Untuk badge kompak di atas card (absolute):

```jsx
style={{ position:"absolute", top:10, left:10, fontSize:11, padding:"2px 8px" }}
```

### App List Item (row view — di Apps page)

```css
.app-list-item.library-card-style {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid #d9d1c2;
  border-bottom-width: 2px;
  border-radius: 10px;
  background: #fffdf8;
  /* sama shadow dengan library-card */
}
```

---

## 5. Sidebar Kiri (Filter / Category)

Digunakan di: Apps, Marketplace, Bursa, Perks.

```jsx
<aside className="apps-left-sidebar">

  {/* Section label */}
  <p style={{ fontSize:11, fontWeight:700, color:"#7b8594", letterSpacing:"0.07em", textTransform:"uppercase", margin:"0 0 8px" }}>
    Kategori
  </p>

  {/* Tags */}
  <div className="tags-list">
    {items.map(item => (
      <button
        key={item}
        type="button"
        className={`mini-tag-btn${active === item ? " active" : ""}`}
        onClick={() => setActive(item)}
      >
        {item}
      </button>
    ))}
  </div>

</aside>
```

CSS mini-tag-btn:

```css
.mini-tag-btn         /* height:28px, border-radius:6px, font-size:12px, font-weight:600 */
.mini-tag-btn:hover   /* translateY(1px) */
.mini-tag-btn.active  /* bg:#f6a61e, border:#c7820e, color:#111, font-weight:800 */
```

Sidebar sticky: `position: sticky; top: 24px; align-self: start`

Layout 2 kolom dengan sidebar:

```jsx
<div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:28 }}>
  <aside className="apps-left-sidebar" style={{ alignSelf:"start", position:"sticky", top:20 }}>
    ...
  </aside>
  <main>...</main>
</div>
```

---

## 6. Hero — Landing Page

Hero landing page adalah layout **2 kolom**: kiri copy, kanan visual marquee. Gunakan class `.hero` yang sudah ada — jangan dibungkus div tambahan.

### Struktur

```jsx
<section className="hero">

  {/* Kiri — copy */}
  <div className="hero-copy">

    {/* Wordmark (opsional, hanya di landing) */}
    <div className="wordmark">
      <div className="wordmark-mark">
        <i /><i /><i /><i />
      </div>
      <span className="wordmark-text">Nama Brand</span>
    </div>

    {/* H1 */}
    <h1>Judul utama landing page</h1>

    {/* Deskripsi */}
    <p>Satu–dua kalimat ringkas tentang value proposition.</p>

    {/* Bullet highlights */}
    <ul className="hero-highlights" aria-label="Key benefits">
      {highlights.map(item => (
        <li key={item}>
          <CheckIcon />   {/* SVG 16×16, className="bullet-icon" */}
          <span>{item}</span>
        </li>
      ))}
    </ul>

    {/* CTA buttons */}
    <div className="hero-actions">
      <button type="button" className="cta-button">Primary Action</button>
      <button type="button" className="ghost-button">Secondary Action</button>
    </div>

    {/* Quick links */}
    <div className="hero-links">
      <a href="/"><LinkIcon /> Link satu</a>
      <span className="hero-dot" />
      <a href="/"><PlayIcon /> Link dua</a>
      <span className="hero-dot" />
      <a href="/"><HeadsetIcon /> Link tiga</a>
    </div>

    {/* Trust strip */}
    <div className="trust-strip" aria-label="Trusted by...">
      <span className="trust-label">Dipakai builder dari:</span>
      <div className="trust-logos">
        {logos.map(l => <span key={l}>{l}</span>)}
      </div>
    </div>

  </div>

  {/* Kanan — marquee visual */}
  <div className="hero-visual">
    <div className="hero-marquee-container">
      <div className="hero-marquee-track">
        {items.map((item, idx) => (
          <div key={idx} className="hero-marquee-card">
            <img src={item.img} alt={item.brand} className="hero-marquee-image" />
            <button type="button" className="cta-button hero-marquee-btn">
              Propose to {item.brand}
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>

</section>
```

Lihat versi lengkap CSS hero landing, hero banner (dark), tabs, navigation, typography scale, spacing, animations, anti-patterns, dan **Dark Mode** (`[data-theme="dark"]` + token `--dk-*`) di dokumen sumber. Aturan inti yang wajib dipegang:

- Layout hero selalu 2 kolom via `.hero`.
- H1 max `48px`, `letter-spacing: -0.045em`, `line-height: 1`.
- `.hero-actions` selalu `cta-button` kiri, `ghost-button` kanan; tidak ada ikon di dalam CTA/ghost hero.

---

## 6b. Hero Banner (Dark — Marketplace/Bursa)

```jsx
<div style={{
  background: "linear-gradient(135deg, #1a1208 0%, #2e1f06 60%, #3d2a08 100%)",
  borderRadius: "0 0 14px 14px",
  padding: "48px 48px 44px",
}}>
  <p style={{ fontSize:12, fontWeight:700, color:"#f6a61e", letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 10px" }}>Label Halaman</p>
  <h1 style={{ fontSize:36, fontWeight:800, color:"#fffdf8", letterSpacing:"-0.04em", lineHeight:1.1 }}>Judul Halaman</h1>
  <p style={{ fontSize:16, color:"#c9b99a", lineHeight:1.5 }}>Deskripsi singkat.</p>
  <div style={{ display:"flex", gap:10 }}>
    <button type="button" className="cta-button" style={{ fontSize:14, height:38 }}>Primary Action</button>
    <button type="button" className="ghost-button" style={{ fontSize:14, height:38, color:"#fffdf8", borderColor:"rgba(255,255,255,.2)", background:"rgba(255,255,255,.08)" }}>Secondary Action</button>
  </div>
</div>
```

Rules dark banner: tidak ada ikon dalam button, tidak ada uppercase pada button, ghost button di dark override `color:#fffdf8` + `borderColor:rgba(255,255,255,.2)` + `background:rgba(255,255,255,.08)`. Eyebrow boleh uppercase karena `font-size 11–12px`.

---

## 9. Typography Scale

| Element | Size | Weight | Letter-spacing | Color |
|---|---|---|---|---|
| H1 hero | 48px | 800 | -0.045em | #0d1d38 |
| H1 dark banner | 36px | 800 | -0.04em | #fffdf8 |
| H2 section | 22–26px | 800 | -0.03em | #0d1d38 |
| Card title (ribbon strong) | 17px | 800 | -0.03em | #0f172c |
| Body | 16–17px | 500–600 | 0 | #29405f |
| Secondary text | 13–15px | 600 | 0 | #55606d |
| Meta / tag | 12–13px | 600 | 0 | #7b8594 |
| Eyebrow label | 11–12px | 700 | 0.07–0.08em | #7b8594 atau #f6a61e |
| Chip / badge | 11–13px | 600 | 0 | #4a5666 |

---

## 10. Spacing & Radius

| Property | Value |
|---|---|
| Card border-radius | `10px` |
| Panel/hero border-radius | `14–16px` |
| Button border-radius | `10px` (normal), `6px` (chip/tag) |
| Gap grid cards | `20px` |
| Gap sidebar items | `6px` (tags), `16px` (sections) |
| Page bottom padding | `60px` |

---

## 11. Animations & Transitions

- Buttons hover/active: `transform 120ms ease, box-shadow 120ms ease`
- Library card hover: `transform 260ms cubic-bezier(.22,1,.36,1)`
- Hover card → `translateY(2px)` (press down); hover button → `translateY(1px) scale(0.995)`; active button → `translateY(2px) scale(0.99)`
- **Tidak ada `box-shadow` floating on hover** — shadow justru berkurang saat hover.

---

## 12. Anti-patterns — Jangan Dilakukan

```
✗ text-transform: uppercase   → pada button, heading, nav, body
✗ font-style: italic           → tidak dipakai di platform ini
✗ Warna baru di luar palette   → pakai token yang ada
✗ box-shadow floating on hover → hover = press down, bukan float up
✗ Ikon di dalam button hero/banner
✗ Button label ALL CAPS
✗ Floating sidebar kanan       → hanya sidebar kiri yang dipakai
✗ Inline style untuk warna yang sudah ada class-nya
✗ border-radius > 16px pada card/panel
✗ font-weight < 500 untuk teks yang visible
✗ Menghapus transform: rotate(-2deg) dari .library-card-ribbon
✗ Mengubah aspect-ratio 16/10 pada .library-card-hero
```

---

## 14. Dark Mode

Dark mode via `data-theme="dark"` pada `<html>` (ThemeContext, persist ke `localStorage`).

Token dark (`[data-theme="dark"]` root) — jangan hardcode hex, pakai token:

| Token | Value | Kegunaan |
|---|---|---|
| `--dk-bg-page` | `#18191c` | Background luar |
| `--dk-bg-frame` | `#1e1f23` | `.site-frame` |
| `--dk-bg-raise` | `#25272c` | Card, panel, sidebar |
| `--dk-bg-lift` | `#2c2e34` | Input, chip, nested |
| `--dk-bg-hover` | `#31343b` | Hover surface |
| `--dk-border` | `#383b43` | Border default |
| `--dk-border-lo` | `#2c2e34` | Divider subtle |
| `--dk-text-hi` | `#e8ecf0` | Heading |
| `--dk-text-md` | `#a3aab5` | Body / secondary |
| `--dk-text-lo` | `#636b78` | Muted / placeholder |
| `--dk-accent` | `#f6a61e` | Amber (sama dgn light) |
| `--dk-accent-lo` | `rgba(246,166,30,.14)` | Accent bg subtle |
| `--dk-accent-border` | `rgba(246,166,30,.32)` | Accent border |

Rules dark: komponen baru **wajib** tambah `[data-theme="dark"]` overrides (jangan inline); jangan hardcode hex (pakai `var(--dk-*)`); CTA amber tidak berubah; teal `#3ecfbc` hanya bullet icon & panel eyebrow. Surface hierarchy: page → `--dk-bg-page`, frame → `--dk-bg-frame`, card → `--dk-bg-raise`, input → `--dk-bg-lift`, hover → `--dk-bg-hover`.

FATAL rules tetap: no extrabold baru, no all-uppercase di luar eyebrow, no italic.
