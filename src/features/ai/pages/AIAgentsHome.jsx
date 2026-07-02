import { useAuth } from "../../../lib/AuthContext";
import { AI_AGENTS } from "../agents/registry";
import AgentCard from "../components/AgentCard";

export default function AIAgentsHome({ onOpenAgent }) {
  const { profile } = useAuth();

  return (
    <section className="aihub-shell">
      <div className="db-view-header aihub-header">
        <div>
          <span className="aihub-eyebrow">AI agents</span>
          <h1 className="db-view-title">
            Enam specialist agents untuk {profile?.workspace_name || "workspace"}.
          </h1>
          <p className="db-view-sub">
            Satu fondasi chat, thread persisten per agent, dan canvas output yang siap dipakai untuk workflow bisnis.
          </p>
        </div>
      </div>

      <div className="db-section-header">
        <h2 className="db-section-title">Agent workspace</h2>
        <div className="aihub-top-tags">
          <span className="db-chip db-chip-amber">Persistent threads</span>
          <span className="db-chip db-chip-green">Agent-bound context</span>
          <span className="db-chip db-chip-blue">Canvas ready</span>
        </div>
      </div>

      <div className="aihub-grid">
        {AI_AGENTS.map((agent) => (
          <AgentCard
            key={agent.slug}
            agent={agent}
            onOpen={() => onOpenAgent(agent.slug)}
          />
        ))}
      </div>
    </section>
  );
}
