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
          className="library-card-chip"
          style={{ position: "absolute", top: 10, left: 10, fontSize: 11, padding: "2px 8px" }}
        >
          Business agent
        </span>
      </div>
      <div className="library-card-ribbon">
        <strong>{agent.name}</strong>
        <span>{agent.tagline}</span>
      </div>
      <div
        className="library-card-meta ai-agent-library-meta"
        style={{ display: "flex", flexDirection: "column", flex: 1, padding: "10px 12px 12px" }}
      >
        <p>{agent.description}</p>
        <div className="ai-agent-library-chip-row">
          <span className="db-chip db-chip-amber">{agent.modelLabel}</span>
          <span className="db-chip db-chip-green">Siap dipakai</span>
        </div>
        <ul className="ai-agent-library-capabilities">
          {agent.capabilities.slice(0, 3).map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
        <div style={{ marginTop: "auto" }}>
          <button
            type="button"
            className="cta-button"
            style={{ width: "100%", fontSize: 13, height: 34 }}
            onClick={onOpen}
          >
            Buka agent
          </button>
        </div>
      </div>
    </article>
  );
}
