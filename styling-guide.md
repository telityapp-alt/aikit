store this as a new MD bro styling guide : # Apphunt — Styling Guide

Reference lengkap design system. Setiap komponen baru harus mengikuti guide ini. Jangan improvisasi warna, shadow, atau spacing di luar yang terdefinisi di sini.

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

### CSS classes hero landing

```css
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 404px;
  gap: 34px;
  align-items: start;
  overflow: hidden;
}

.hero-copy { padding-top: 4px; }

/* Wordmark — kombinasi bar grafis + teks brand */
.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.wordmark-text {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: #111318;
}

/* H1 */
.hero h1 {
  max-width: 620px;
  font-size: 48px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.045em;
  color: #0d1d38;
  margin: 0 0 16px;
}

/* Body paragraph */
.hero p {
  max-width: 620px;
  font-size: 17px;
  line-height: 1.48;
  color: #29405f;
  margin: 0 0 14px;
}

/* Bullet list */
.hero-highlights {
  list-style: none;
  padding: 0;
  margin: 18px 0 0;
  display: grid;
  gap: 6px;
}
.hero-highlights li { display: flex; align-items: flex-start; gap: 10px; }
.hero-highlights span { font-size: 15px; line-height: 1.4; color: #32425b; }
.bullet-icon {
  width: 16px; height: 16px; margin-top: 4px; color: #1d6e61;
}
.bullet-icon circle { fill: #e5faf5; }

/* Actions row */
.hero-actions { display: flex; align-items: center; gap: 10px; margin-top: 20px; }

/* Quick links row */
.hero-links {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  color: #55606d;
  font-size: 15px;
  font-weight: 700;
}
.hero-links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.hero-dot { width: 4px; height: 4px; border-radius: 999px; background: #868277; }

/* Trust strip */
.trust-strip {
  display: flex;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid #e6ddd0;
}
.trust-label { font-size: 13px; font-weight: 600; color: #6c6d6b; }
.trust-logos { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.trust-logos span { font-size: 14px; font-weight: 700; letter-spacing: -0.02em; color: #40444c; }

/* Marquee visual (kanan) */
.hero-visual { display: flex; justify-content: flex-end; align-items: flex-start; }

.hero-marquee-container {
  width: 680px;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  padding: 32px 0;
  transform: rotate(-2deg) translateY(48px);
  transition: transform 300ms ease;
  /* fade mask kiri-kanan */
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}
.hero-marquee-container:hover { transform: rotate(0deg) translateY(48px); }

.hero-marquee-track {
  display: flex;
  gap: 24px;
  width: max-content;
  animation: marquee-slide 35s linear infinite;
}
.hero-marquee-track:hover { animation-play-state: paused; }

.hero-marquee-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 540px;
}

.hero-marquee-image {
  width: 100%;
  height: 340px;
  object-fit: cover;
  object-position: top center;
  border: 1px solid #d9d1c2;
  border-bottom-width: 2px;
  border-radius: 10px;
  background: #fffdf8;
  box-shadow:
    inset 0 -3px 0 rgba(21,19,16,.09),
    0 1px 3px rgba(21,19,16,.07),
    0 4px 12px rgba(21,19,16,.05);
}

.hero-marquee-btn { align-self: flex-start; } /* inherits .cta-button */
```

### Rules hero landing
- Layout selalu 2 kolom via `.hero` — jangan ubah `grid-template-columns`
- H1 max `48px`, `letter-spacing: -0.045em`, `line-height: 1`
- Bullet list pakai `.hero-highlights` + `CheckIcon` — jangan ganti dengan div/span biasa
- `.hero-actions` selalu `cta-button` kiri, `ghost-button` kanan
- Tidak ada ikon di dalam button CTA/ghost di hero
- Marquee diputar `rotate(-2deg)` — jangan hilangkan transform ini
- Marquee pause on hover via `animation-play-state: paused` sudah ada di CSS, tidak perlu JS
- Wordmark hanya untuk landing page — halaman lain tidak pakai `.wordmark`

---

## 6b. Hero Banner (Dark — Marketplace/Bursa)

Digunakan untuk halaman internal (Marketplace, Bursa) sebagai pengganti section hero landing. Bukan komponen `.hero` — ini div biasa di atas konten halaman.

```jsx
<div style={{
  background: "linear-gradient(135deg, #1a1208 0%, #2e1f06 60%, #3d2a08 100%)",
  borderRadius: "0 0 14px 14px",
  padding: "48px 48px 44px",
}}>
  {/* Eyebrow label */}
  <p style={{ fontSize:12, fontWeight:700, color:"#f6a61e", letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 10px" }}>
    Label Halaman
  </p>

  {/* H1 */}
  <h1 style={{ fontSize:36, fontWeight:800, color:"#fffdf8", letterSpacing:"-0.04em", lineHeight:1.1 }}>
    Judul Halaman
  </h1>

  {/* Desc */}
  <p style={{ fontSize:16, color:"#c9b99a", lineHeight:1.5 }}>
    Deskripsi singkat.
  </p>

  {/* Actions */}
  <div style={{ display:"flex", gap:10 }}>
    <button type="button" className="cta-button" style={{ fontSize:14, height:38 }}>
      Primary Action
    </button>
    <button type="button" className="ghost-button" style={{ fontSize:14, height:38, color:"#fffdf8", borderColor:"rgba(255,255,255,.2)", background:"rgba(255,255,255,.08)" }}>
      Secondary Action
    </button>
  </div>
</div>
```

Rules dark banner:
- Tidak ada ikon di dalam button
- Tidak ada `text-transform: uppercase` pada button
- Ghost button di dark background: override `color: #fffdf8`, `borderColor: rgba(255,255,255,.2)`, `background: rgba(255,255,255,.08)`
- Eyebrow boleh uppercase karena `font-size: 11–12px`

---

## 7. Landing Page Tabs

```css
/* Tab row */
.tabs { gap: 18px; padding: 0 10px; }

/* Individual tab button */
.tab-button {
  height: 48px;
  padding: 0 22px;
  border-radius: 10px 10px 0 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #666355;
  background: transparent;
}

/* Active tab — uses CSS var from data */
.tab-button.active {
  color: #fff;
  background: var(--tab-accent);
  box-shadow: 0 8px 0 var(--tab-accent), inset 0 -2px 0 rgba(17,34,43,.18);
}
.tab-button.active::after {
  /* underline bar di dalam tab */
  content: "";
  position: absolute;
  left: 12px; right: 12px; bottom: 9px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255,255,255,0.9);
}
```

Panel card (content di bawah tab):
```css
.panel-card {
  display: grid;
  grid-template-columns: minmax(0,1fr) 320px;
  border: 10px solid var(--panel-accent);
  border-radius: 16px;
  box-shadow: 0 8px 0 color-mix(in srgb, var(--panel-accent), black 25%);
}
```

---

## 8. Navigation

### Topbar nav link
```css
.topnav a {
  font-size: 16px;
  font-weight: 600;
  color: #2e3137;
  text-decoration: none;
}
.topnav a.active-nav {
  color: #0d1d38;
}
.topnav a.active-nav::after {
  /* amber underline */
  background: #f6a61e;
  height: 2px;
  bottom: -4px;
}
```

### Rules nav
- Label navigasi: sentence case. Tidak boleh uppercase
- Tidak ada ikon di nav link kecuali sudah ada sebelumnya
- Menu yang di-hide: simpan di kode tapi render `null` atau `display:none` — jangan dihapus permanen tanpa konfirmasi

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

| Element | Transition |
|---|---|
| Buttons hover/active | `transform 120ms ease, box-shadow 120ms ease` |
| Library card hover | `transform 260ms cubic-bezier(.22,1,.36,1)` |
| Screenshot on card hover | `transform 280ms cubic-bezier(.22,1,.36,1), filter 280ms ease` |
| Hero image shell | `transform 220ms cubic-bezier(.22,1,.36,1)` |

- Hover card → `translateY(2px)` (press down)
- Hover button → `translateY(1px) scale(0.995)`
- Active button → `translateY(2px) scale(0.99)`
- **Tidak ada `box-shadow` floating on hover** — shadow justru berkurang saat hover

---

## 12. Anti-patterns — Jangan Dilakukan

```
✗ text-transform: uppercase  →  pada button, heading, nav, body
✗ font-style: italic          →  tidak dipakai di platform ini
✗ Warna baru di luar palette  →  pakai token yang ada
✗ box-shadow floating on hover →  hover = press down, bukan float up
✗ Ikon di dalam button hero/banner
✗ Button label ALL CAPS
✗ Floating sidebar kanan       →  hanya sidebar kiri yang dipakai
✗ Inline style untuk warna yang sudah ada class-nya
✗ border-radius > 16px pada card/panel
✗ font-weight < 500 untuk teks yang visible
✗ gap > 6px pada .tags-list
✗ Menghapus transform: rotate(-2deg) dari .library-card-ribbon
✗ Mengubah aspect-ratio 16/10 pada .library-card-hero
```

---

## 13. Contoh Penggunaan Lengkap

### Halaman baru dengan sidebar + grid card
```jsx
export default function NewPage() {
  const [active, setActive] = useState("Semua");
  return (
    <div className="content-wide" style={{ margin:"0 auto", padding:"0 0 60px" }}>
      
      {/* Banner */}
      <div style={{ background:"linear-gradient(135deg,#1a1208,#2e1f06)", borderRadius:"0 0 14px 14px", padding:"48px 48px 44px", marginBottom:36 }}>
        <p style={{ fontSize:12, fontWeight:700, color:"#f6a61e", letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 10px" }}>Eyebrow</p>
        <h1 style={{ fontSize:36, fontWeight:800, color:"#fffdf8", letterSpacing:"-0.04em", lineHeight:1.1, margin:"0 0 12px" }}>Judul Halaman</h1>
        <p style={{ fontSize:16, color:"#c9b99a", margin:"0 0 24px" }}>Deskripsi halaman.</p>
        <div style={{ display:"flex", gap:10 }}>
          <button type="button" className="cta-button" style={{ fontSize:14, height:38 }}>Primary</button>
          <button type="button" className="ghost-button" style={{ fontSize:14, height:38, color:"#fffdf8", borderColor:"rgba(255,255,255,.2)", background:"rgba(255,255,255,.08)" }}>Secondary</button>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:28, padding:"0 24px" }}>
        
        {/* Sidebar */}
        <aside className="apps-left-sidebar" style={{ alignSelf:"start", position:"sticky", top:20 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#7b8594", letterSpacing:"0.07em", textTransform:"uppercase", margin:"0 0 8px" }}>Kategori</p>
          <div className="tags-list">
            {["Semua","TypeA","TypeB"].map(c => (
              <button key={c} type="button" className={`mini-tag-btn${active===c?" active":""}`} onClick={() => setActive(c)}>{c}</button>
            ))}
          </div>
        </aside>

        {/* Grid */}
        <main>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:20 }}>
            {items.map(item => (
              <article key={item.id} className="library-card" style={{ display:"flex", flexDirection:"column" }}>
                <div className="library-card-hero">
                  <div className="library-card-screenshot-wrap" style={{ background:"#f5f2ec", minHeight:120 }}>
                    <span style={{ fontSize:44 }}>{item.emoji}</span>
                  </div>
                </div>
                <div className="library-card-ribbon">
                  <strong>{item.name}</strong>
                  <span>{item.category}</span>
                </div>
                <div className="library-card-meta" style={{ display:"flex", flexDirection:"column", flex:1, padding:"10px 12px 12px" }}>
                  <p style={{ fontSize:12, color:"#55606d", margin:"0 0 8px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{item.desc}</p>
                  <div style={{ marginTop:"auto" }}>
                    <button type="button" className="cta-button" style={{ width:"100%", fontSize:13, height:34 }}>Lihat Detail</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
```
