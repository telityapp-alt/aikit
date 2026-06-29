import { useState } from "react";
import "./App.css";

const tabs = [
  {
    id: "usage",
    label: "Understand product usage",
    accent: "#377cf6",
    image: "/tab-analytics.png",
    title: "See what customers do before they tell you what broke",
    description:
      "Builders records product behavior, maps every activation step, and makes it obvious where momentum gets lost so product, growth, and support can react in one loop.",
    stat: "42% faster onboarding insight",
    eyebrow: "Behavior intelligence",
    primaryLinks: ["Session replay", "Funnels", "Retention", "Heatmaps"],
    secondaryLinks: [
      "Audience cohorts",
      "Path analysis",
      "Journey alerts",
      "Insight boards",
    ],
    bulletGroups: [
      {
        heading: "Capture",
        items: [
          "Autocapture events",
          "Replay synced to issues",
          "Privacy-safe masking",
        ],
      },
      {
        heading: "Explain",
        items: [
          "Conversion drop reasons",
          "Power-user patterns",
          "Activation scoring",
        ],
      },
      {
        heading: "Act",
        items: [
          "Target segments",
          "Launch experiments",
          "Share one-click dashboards",
        ],
      },
    ],
  },
  {
    id: "data",
    label: "One place for product data",
    accent: "#37d7c8",
    image: "/tab-onboarding.png",
    title: "Turn fragmented product signals into one operating system",
    description:
      "Builders brings warehouse events, support context, billing data, and product usage into one compact workspace so teams can decide faster without stitching together five separate tools.",
    stat: "18 sources connected in under an hour",
    eyebrow: "Data platform for builders",
    primaryLinks: ["Postgres", "Snowflake", "Stripe", "Salesforce"],
    secondaryLinks: [
      "Data modeling",
      "SQL editor",
      "Managed warehouse",
      "Reverse ETL",
    ],
    bulletGroups: [
      {
        heading: "Import",
        items: [
          "Warehouse syncs",
          "Schema-aware connectors",
          "Backfill without downtime",
        ],
      },
      {
        heading: "Model",
        items: [
          "Product-ready SQL",
          "Reusable semantic layers",
          "AI-assisted exploration",
        ],
      },
      {
        heading: "Ship",
        items: [
          "Audience exports",
          "Webhook destinations",
          "Analytics for every team",
        ],
      },
    ],
  },
  {
    id: "issues",
    label: "Debug & fix issues",
    accent: "#f3ba3f",
    image: "/tab-debug.png",
    title: "Trace every issue from spike to root cause in minutes",
    description:
      "Link logs, traces, deploy markers, and affected sessions to the same incident timeline so engineering can move from panic to proof with less context switching.",
    stat: "63% less time spent triaging regressions",
    eyebrow: "Developer workflow",
    primaryLinks: ["Error groups", "Tracing", "Deploy markers", "Alerting"],
    secondaryLinks: [
      "Ownership rules",
      "Replay correlation",
      "Source maps",
      "Fix verification",
    ],
    bulletGroups: [
      {
        heading: "Detect",
        items: [
          "Frontend and backend coverage",
          "Noise-reduced grouping",
          "Threshold alerts",
        ],
      },
      {
        heading: "Investigate",
        items: [
          "Click-to-trace drilldown",
          "Logs with user context",
          "Replay attached automatically",
        ],
      },
      {
        heading: "Resolve",
        items: [
          "Assign ownership",
          "Track rollout impact",
          "Confirm issue disappearance",
        ],
      },
    ],
  },
  {
    id: "rollout",
    label: "Test & roll out changes",
    accent: "#b461f3",
    image: "/tab-rollout.png",
    title: "Experiment, release, and learn without slowing the team down",
    description:
      "Run controlled rollouts, measure outcomes in the same product surface, and keep every feature launch tied to the customer behavior it was meant to change.",
    stat: "2x more confident launches per quarter",
    eyebrow: "Release orchestration",
    primaryLinks: [
      "Feature flags",
      "A/B tests",
      "Progressive rollouts",
      "Goal metrics",
    ],
    secondaryLinks: [
      "Holdouts",
      "Kill switches",
      "Experiment templates",
      "Impact reports",
    ],
    bulletGroups: [
      {
        heading: "Launch",
        items: [
          "Ship behind flags",
          "Target users precisely",
          "Start with safe cohorts",
        ],
      },
      {
        heading: "Measure",
        items: [
          "Attach product metrics",
          "Read lift instantly",
          "See qualitative feedback",
        ],
      },
      {
        heading: "Scale",
        items: [
          "Ramp gradually",
          "Document learnings",
          "Reuse winning experiments",
        ],
      },
    ],
  },
];

const trustLogos = ["Ramp", "Retool", "Linear", "Vercel", "Cursor"];

const heroHighlights = [
  "One shared source of product truth",
  "Built for product, growth, and engineering",
  "Fast enough to feel operational every day",
];

const libraryCards = [
  {
    name: "Signal board",
    role: "Product analytics cockpit",
    place: "Realtime funnels and cohort health",
    team: "Growth systems",
    accent: "#41b6e6",
    surface: "#98d9f0",
    image: "/lib-signal-board.png",
  },
  {
    name: "Flow pilot",
    role: "Onboarding command center",
    place: "Activation checkpoints and drop-offs",
    team: "Journey team",
    accent: "#ff5c62",
    surface: "#f7a1a8",
    image: "/lib-flow-pilot.png",
  },
  {
    name: "Warehouse one",
    role: "Data workspace",
    place: "Models, syncs, and warehouse QA",
    team: "Data tools",
    accent: "#b643ef",
    surface: "#d48df4",
    image: "/lib-warehouse-one.png",
  },
  {
    name: "Issue radar",
    role: "Debug investigation hub",
    place: "Alerts, traces, and replay context",
    team: "Reliability",
    accent: "#8fe0af",
    surface: "#c8efd3",
    image: "/lib-issue-radar.png",
  },
  {
    name: "Launch deck",
    role: "Feature rollout control",
    place: "Flags, segments, and impact reads",
    team: "Release team",
    accent: "#ff9f0d",
    surface: "#ffd37d",
    image: "/lib-launch-deck.png",
  },
  {
    name: "Audience lab",
    role: "Experiment workspace",
    place: "Hypotheses, test cells, and lift",
    team: "Experimentation",
    accent: "#6f58ff",
    surface: "#afa2ff",
    image: "/lib-audience-lab.png",
  },
  {
    name: "Support graph",
    role: "Customer operations panel",
    place: "Tickets linked to product behavior",
    team: "Ops intelligence",
    accent: "#ff6d74",
    surface: "#ffb0b4",
    image: "/lib-support-graph.png",
  },
  {
    name: "Focus room",
    role: "Weekly review dashboard",
    place: "Goals, blockers, and owner updates",
    team: "Exec rhythm",
    accent: "#8167ff",
    surface: "#bfaeff",
    image: "/lib-focus-room.png",
  },
];

function CaretIcon() {
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden="true"
      className="icon-inline caret-icon"
    >
      <path d="M2 3.5 5 6.5l3-3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-inline">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-inline">
      <path d="M5 6.5h14v9H11l-4 3v-3H5z" />
      <path d="M9 10.5h6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-inline">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 19c1.4-3 4-4.5 6.5-4.5S17.1 16 18.5 19" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="icon-inline small-icon"
    >
      <path d="m5 3 7 5-7 5z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="icon-inline small-icon"
    >
      <path d="M6.2 10.2 4.5 12A2.5 2.5 0 0 1 1 8.5l1.8-1.8" />
      <path d="m9.8 5.8 1.7-1.8A2.5 2.5 0 1 1 15 7.5l-1.8 1.8" />
      <path d="m5.5 10.5 5-5" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="icon-inline small-icon"
    >
      <path d="M3 8a5 5 0 0 1 10 0" />
      <rect x="2" y="8" width="2.5" height="4" rx="1" />
      <rect x="11.5" y="8" width="2.5" height="4" rx="1" />
      <path d="M12 13c0 1.1-.9 2-2 2H8" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="icon-inline">
      <path d="M6 4.5h2.4v9H6zm3.6 0H12v9H9.6z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="icon-inline bullet-icon"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="m5.2 8.1 1.8 1.9 3.8-4" />
    </svg>
  );
}

function HeaderLogo() {
  return (
    <div className="header-logo" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <b />
    </div>
  );
}

function Wordmark() {
  return (
    <div className="wordmark" aria-label="Builders wordmark">
      <span className="wordmark-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="wordmark-text">Builders</span>
    </div>
  );
}

function CardGlyphs() {
  return (
    <div className="library-glyphs" aria-hidden="true">
      <span>✦</span>
      <span>◎</span>
      <span>◌</span>
    </div>
  );
}

function MiniAppWindow({ variant }) {
  return (
    <div className={`mini-app-window ${variant}`}>
      <div className="mini-toolbar">
        <span />
        <span />
        <span />
      </div>
      <div className="mini-canvas">
        {variant === "analytics" && (
          <>
            <div className="mini-chart-bars">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="mini-chart-line" />
            <div className="mini-kpi-row">
              <b />
              <b />
              <b />
            </div>
          </>
        )}
        {variant === "checklist" && (
          <>
            <div className="mini-sidebar" />
            <div className="mini-checklist">
              <i />
              <i />
              <i />
              <i />
            </div>
          </>
        )}
        {variant === "warehouse" && (
          <>
            <div className="mini-code-block">
              <i />
              <i />
              <i />
            </div>
            <div className="mini-table-grid" />
          </>
        )}
        {variant === "incidents" && (
          <>
            <div className="mini-alert-pill" />
            <div className="mini-timeline">
              <i />
              <i />
              <i />
            </div>
          </>
        )}
        {variant === "flags" && (
          <>
            <div className="mini-toggle-row">
              <i />
              <i />
              <i />
            </div>
            <div className="mini-segment-card" />
          </>
        )}
        {variant === "experiments" && (
          <>
            <div className="mini-split-panels">
              <i />
              <i />
            </div>
            <div className="mini-metric-strip" />
          </>
        )}
        {variant === "support" && (
          <>
            <div className="mini-ticket-stack">
              <i />
              <i />
              <i />
            </div>
            <div className="mini-avatar-dot" />
          </>
        )}
        {variant === "review" && (
          <>
            <div className="mini-review-grid">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="mini-footer-chart" />
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("data");
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[1];

  return (
    <div className="page-shell">
      <div className="texture-rail" aria-hidden="true" />
      <div className="site-frame">
        <header className="topbar">
          <div className="topbar-left">
            <HeaderLogo />
            <nav className="topnav" aria-label="Primary">
              {[
                "Platform",
                "Solutions",
                "Docs",
                "Community",
                "Company",
                "More",
              ].map((item) => (
                <a
                  href="/"
                  key={item}
                  onClick={(event) => event.preventDefault()}
                >
                  {item}
                  <CaretIcon />
                </a>
              ))}
            </nav>
          </div>
          <div className="topbar-right">
            <button type="button" className="cta-button topbar-cta">
              Start free
            </button>
            <button type="button" className="icon-button" aria-label="Search">
              <SearchIcon />
            </button>
            <button type="button" className="icon-button" aria-label="Messages">
              <MessageIcon />
            </button>
            <button
              type="button"
              className="icon-button avatar-button"
              aria-label="Account"
            >
              <UserIcon />
            </button>
          </div>
        </header>

        <main className="content">
          <section className="hero">
            <div className="hero-copy">
              <Wordmark />
              <h1>
                The operating system for teams that build and ship products
              </h1>
              <p>
                Builders combines product analytics, customer understanding,
                incident debugging, and release orchestration in one compact
                workspace designed to feel clear at a glance and powerful in
                motion.
              </p>
              <p>
                Instead of stitching together dashboards, replay tools, flags,
                and warehouse queries, your team gets one product surface that
                turns signals into decisions faster.
              </p>

              <ul className="hero-highlights" aria-label="Key benefits">
                {heroHighlights.map((item) => (
                  <li key={item}>
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="hero-actions">
                <button type="button" className="cta-button">
                  Get started - free
                </button>
                <button type="button" className="ghost-button">
                  Book a live walkthrough
                </button>
              </div>

              <div className="hero-links">
                <a href="/" onClick={(event) => event.preventDefault()}>
                  <LinkIcon />
                  MCP
                </a>
                <span className="hero-dot" />
                <a href="/" onClick={(event) => event.preventDefault()}>
                  <PlayIcon />
                  Watch a demo
                </a>
                <span className="hero-dot" />
                <a href="/" onClick={(event) => event.preventDefault()}>
                  <HeadsetIcon />
                  Talk to a human
                </a>
              </div>

              <div
                className="trust-strip"
                aria-label="Trusted by teams shipping weekly"
              >
                <span className="trust-label">Teams shipping weekly:</span>
                <div className="trust-logos">
                  {trustLogos.map((logo) => (
                    <span key={logo}>{logo}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-image-shell">
                <img
                  src="/builders-hero.png"
                  alt="Builders hedgehog mascot working at a desk"
                  className="hero-generated-image"
                />
              </div>
            </div>
          </section>

          <section
            className="product-panel"
            style={{ "--panel-accent": currentTab.accent }}
          >
            <div className="tabs" role="tablist" aria-label="Product areas">
              {tabs.map((tab) => {
                const isActive = tab.id === currentTab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`tab-button${isActive ? " active" : ""}`}
                    style={
                      isActive ? { "--tab-accent": tab.accent } : undefined
                    }
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="panel-card-wrap">
              <div className="panel-card">
                <button
                  type="button"
                  className="panel-pause"
                  aria-label="Pause carousel"
                >
                  <PauseIcon />
                </button>

                <div className="panel-copy">
                  <span className="panel-eyebrow">{currentTab.eyebrow}</span>
                  <h2>{currentTab.title}</h2>
                  <p>{currentTab.description}</p>

                  <div className="panel-chips" aria-label="Top modules">
                    {currentTab.primaryLinks.map((link) => (
                      <span key={link} className="panel-chip">
                        {link}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="panel-visual">
                  <img
                    src={currentTab.image}
                    alt={`${currentTab.label} visual`}
                    className="panel-generated-image"
                  />
                </div>

                <div className="panel-columns">
                  {currentTab.bulletGroups.map((group) => (
                    <section key={group.heading} className="link-column">
                      <h3>{group.heading}</h3>
                      <ul className="feature-list">
                        {group.items.map((item) => (
                          <li key={item}>
                            <CheckIcon />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>

                <div
                  className="panel-footer-links"
                  aria-label="Additional capabilities"
                >
                  {currentTab.secondaryLinks.map((link) => (
                    <a
                      href="/"
                      key={link}
                      onClick={(event) => event.preventDefault()}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="library-section" aria-labelledby="library-title">
            <div className="library-copy">
              <div>
                <span className="library-kicker">Library</span>
                <h2 id="library-title">
                  A colourful gallery of app UI systems
                </h2>
              </div>
              <p>
                Built in the spirit of collectible profile cards, but every card
                here showcases product interfaces instead of portraits. Think
                dashboards, rollout rooms, analytics cockpits, and ops surfaces.
              </p>
            </div>

            <div className="library-grid">
              {libraryCards.map((card) => (
                <article key={card.name} className="library-card">
                  <div className="library-card-hero">
                    <div className="library-card-screenshot-wrap">
                      <img
                        src={card.image}
                        alt={`${card.name} interface screenshot`}
                        className="library-card-screenshot"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling.style.display =
                            "flex";
                        }}
                      />
                      <div
                        className="library-card-placeholder"
                        aria-hidden="true"
                      >
                        <span className="placeholder-label">{card.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="library-card-ribbon">
                    <strong>{card.name}</strong>
                    <span>{card.role}</span>
                  </div>

                  <div className="library-card-meta">
                    <p>{card.place}</p>
                    <div className="library-card-chip">{card.team}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
