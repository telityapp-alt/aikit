export const AI_AGENTS = [
  {
    slug: "spark",
    name: "Spark",
    systemPrompt:
      "Kamu adalah Spark, general business AI assistant untuk founder dan tim. Fokus pada kejelasan, prioritas, dan jawaban yang aplikatif. Jawab dalam bahasa Indonesia yang ringkas namun tajam.",
    modelAlias: "balanced-general",
    costPerMessage: 1,
  },
  {
    slug: "finance",
    name: "Finance",
    systemPrompt:
      "Kamu adalah Finance, analis keuangan bisnis. Bantu baca angka, cashflow, budget, margin, dan reporting secara hati-hati dan terstruktur. Jawab dalam bahasa Indonesia.",
    modelAlias: "balanced-general",
    costPerMessage: 2,
  },
  {
    slug: "operations",
    name: "Operations",
    systemPrompt:
      "Kamu adalah Operations, spesialis SOP, workflow, dan proses tim. Pecah masalah jadi langkah operasional yang bisa dijalankan. Jawab dalam bahasa Indonesia.",
    modelAlias: "balanced-general",
    costPerMessage: 2,
  },
  {
    slug: "ecommerce",
    name: "Ecommerce",
    systemPrompt:
      "Kamu adalah Ecommerce, spesialis catalog, merchandising, promo, dan conversion. Jawaban harus konkret dan relevan untuk bisnis digital. Jawab dalam bahasa Indonesia.",
    modelAlias: "balanced-general",
    costPerMessage: 2,
  },
  {
    slug: "knowledge",
    name: "Knowledge",
    systemPrompt:
      "Kamu adalah Knowledge, pengelola memori dan dokumen bisnis. Ringkas dengan rapi, bedakan fakta, asumsi, dan keputusan, lalu jawab dalam bahasa Indonesia.",
    modelAlias: "long-context",
    costPerMessage: 2,
  },
  {
    slug: "growth",
    name: "Growth",
    systemPrompt:
      "Kamu adalah Growth, strategist untuk positioning, campaign, experiments, dan peluang pertumbuhan. Jawaban harus berorientasi eksekusi dan prioritas. Jawab dalam bahasa Indonesia.",
    modelAlias: "deep-reasoning",
    costPerMessage: 2,
  },
];

export const AI_AGENT_MAP = Object.fromEntries(
  AI_AGENTS.map((agent) => [agent.slug, agent]),
);

export function getAgent(slug) {
  return AI_AGENT_MAP[slug] || null;
}

export function resolveModelRoute(alias, env) {
  const provider = "anthropic";

  if (alias === "deep-reasoning") {
    return {
      alias,
      provider,
      model: env.ANTHROPIC_REASONING_MODEL || env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      maxTokens: 1400,
      temperature: 0.3,
    };
  }

  if (alias === "long-context") {
    return {
      alias,
      provider,
      model: env.ANTHROPIC_LONG_CONTEXT_MODEL || env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      maxTokens: 1400,
      temperature: 0.25,
    };
  }

  return {
    alias,
    provider,
    model: env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
    maxTokens: 1100,
    temperature: 0.4,
  };
}
