function AssistantBadge({ name, mascot }) {
  return (
    <div className="aiw-avatar">
      {mascot ? (
        <img src={mascot} alt="" aria-hidden="true" className="aiw-avatar-img" />
      ) : (
        name.slice(0, 1)
      )}
    </div>
  );
}

export default function ChatMessageList({ messages, agent, onUseStarter }) {
  if (!messages.length) {
    return (
      <div className="aiw-empty-state">
        <div className="aiw-empty-flow">
          <img
            src={agent.mascot}
            alt=""
            aria-hidden="true"
            className="aiw-empty-mascot"
          />
        </div>
        <div className="aiw-empty-card">
          <h2 className="aiw-empty-title"><strong>Mulai obrolan</strong></h2>
          <p className="aiw-empty-sub">
            Pilih prompt cepat atau tulis kebutuhanmu langsung.
          </p>
          <div className="aiw-starter-grid">
            {agent.starters.map((starter) => (
              <button
                key={starter}
                type="button"
                className="aiw-starter-card"
                onClick={() => onUseStarter(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aiw-messages-inner">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const isAssistant = !isUser;
        return (
          <div
            key={message.id}
            className={`aiw-message-row${isUser ? " aiw-message-row--user" : ""}`}
          >
            {isAssistant ? (
              <AssistantBadge name={agent.name} mascot={agent.mascot} />
            ) : null}
            <div
              className={`aiw-message-bubble${isUser ? " aiw-message-bubble--user" : ""}`}
            >
              <p>{message.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
