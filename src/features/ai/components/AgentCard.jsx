export default function AgentCard({ agent, onOpen }) {
  return (
    <article
      className="library-card ai-agent-library-card"
      style={{ "--agent-accent": agent.accent }}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="library-card-hero ai-agent-library-hero">
        <div className="library-card-screenshot-wrap ai-agent-library-shot">
          <img
            src={agent.mascot}
            alt=""
            aria-hidden="true"
            className="ai-agent-library-mascot"
          />
        </div>
        <span
          className="library-card-chip ai-agent-library-chip"
        >
          Business agent
        </span>
      </div>
      <div className="library-card-ribbon">
        <strong>{agent.name}</strong>
        <span>{agent.tagline}</span>
      </div>
      <div className="library-card-meta ai-agent-library-meta">
        <p>{agent.description}</p>
        <div className="ai-agent-library-chip-row">
          <span className="db-chip db-chip-amber">{agent.modelLabel}</span>
          <span className="db-chip db-chip-green">Siap dipakai</span>
        </div>
        <ul className="ai-agent-library-capabilities">
          {agent.capabilities.slice(0, 2).map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
        <div className="ai-agent-library-cta">
          <button
            type="button"
            className="cta-button"
            onClick={onOpen}
          >
            Buka workspace
          </button>
        </div>
      </div>
    </article>
  );
}
