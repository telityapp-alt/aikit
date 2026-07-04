import { useState } from "react";

function IconPanelOpen() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 5h16v14H4zM9 5v14M13 9l4 3-4 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconPanelClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 5h16v14H4zM15 5v14M11 9l-4 3 4 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.5 }}>
      <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconPanelWide() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 5h16v14H4zM8 9 5 12l3 3M16 9l3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const CANVAS_MODES = [
  { id: "collapsed", label: "Collapse", icon: <IconPanelClose /> },
  { id: "preview", label: "Preview", icon: <IconPanelOpen /> },
  { id: "full", label: "Expand", icon: <IconPanelWide /> },
];

export default function RightCanvas({
  mode,
  onModeChange,
  agent,
  thread,
  artifacts,
  knowledgeDocuments = [],
  onIngestKnowledge,
  ingestingKnowledge = false,
}) {
  const latestArtifact = artifacts[0] || null;
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");

  if (mode === "collapsed") {
    return (
      <aside className="aiw-canvas aiw-canvas--collapsed">
        <button
          type="button"
          className="ghost-button aiw-canvas-toggle-rail"
          onClick={() => onModeChange("preview")}
          aria-label="Buka canvas"
          title="Buka canvas"
        >
          <IconPanelOpen />
        </button>
      </aside>
    );
  }

  return (
    <aside className={`aiw-canvas${mode === "full" ? " aiw-canvas--full" : ""}`}>
      <div className="aiw-canvas-top">
        <div className="aiw-canvas-heading">
          <h3 className="aiw-canvas-title"><strong>Canvas</strong></h3>
        </div>
        <div className="aiw-canvas-modes" aria-label="Mode canvas">
          {CANVAS_MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`aiw-canvas-mode${mode === entry.id ? " active" : ""}`}
              onClick={() => onModeChange(entry.id)}
              aria-label={entry.label}
              title={entry.label}
            >
              {entry.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="aiw-canvas-body">
        <section className="aiw-canvas-panel aiw-canvas-panel--hero">
          <h4 className="aiw-canvas-panel-title">
            <strong>{thread ? thread.title : `${agent.name} canvas`}</strong>
          </h4>
          <p className="aiw-canvas-panel-copy">
            {thread
              ? `${artifacts.length} artifact tersimpan untuk thread ini.`
              : "Belum ada output tersimpan."}
          </p>
        </section>

        <section className="aiw-canvas-panel">
          <div className="aiw-canvas-section-head">
            <h4 className="aiw-canvas-panel-title"><strong>Artifacts</strong></h4>
            <span className="aiw-canvas-count">{artifacts.length}</span>
          </div>
          {artifacts.length === 0 ? (
            <p className="aiw-canvas-panel-copy">Belum ada artifact.</p>
          ) : (
            <ul className="aiw-canvas-artifacts">
              {artifacts.map((artifact) => (
                <li key={artifact.id} className="aiw-canvas-artifact-item">
                  <span>{artifact.title}</span>
                  <small>{artifact.type}</small>
                </li>
              ))}
            </ul>
          )}
        </section>

        {latestArtifact ? (
          <section className="aiw-canvas-panel aiw-canvas-panel--accent">
            <div className="aiw-canvas-section-head">
              <h4 className="aiw-canvas-panel-title">Preview</h4>
              <button type="button" className="cta-button aiw-canvas-mini-btn">
                Buka
              </button>
            </div>
            <p className="aiw-canvas-preview-title">{latestArtifact.title}</p>
            <p className="aiw-canvas-panel-copy">
              {latestArtifact.summary ||
                latestArtifact.content_json?.text ||
                "Artifact siap ditinjau."}
            </p>
          </section>
        ) : (
          <section className="aiw-canvas-panel aiw-canvas-panel--accent">
            <h4 className="aiw-canvas-panel-title"><strong>Next</strong></h4>
            <ul className="aiw-canvas-list">
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><IconArrowRight /> Draft dokumen</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><IconArrowRight /> Snapshot analisis</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><IconArrowRight /> Knowledge notes</li>
            </ul>
          </section>
        )}

        {agent.slug === "knowledge" ? (
          <>
            <section className="aiw-canvas-panel">
              <h4 className="aiw-canvas-panel-title">Tambah knowledge</h4>
              <div className="aiw-knowledge-form">
                <input
                  className="aiw-knowledge-input"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Judul"
                />
                <textarea
                  className="aiw-knowledge-textarea"
                  rows={5}
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  placeholder="Tempel notes atau dokumen singkat..."
                />
                <button
                  type="button"
                  className="cta-button aiw-canvas-submit"
                  disabled={ingestingKnowledge || !draftText.trim()}
                  onClick={async () => {
                    const ok = await onIngestKnowledge?.({
                      title: draftTitle,
                      text: draftText,
                    });
                    if (ok) {
                      setDraftTitle("");
                      setDraftText("");
                    }
                  }}
                >
                  {ingestingKnowledge ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </section>

            <section className="aiw-canvas-panel">
              <div className="aiw-canvas-section-head">
                <h4 className="aiw-canvas-panel-title">Knowledge</h4>
                <span className="aiw-canvas-count">
                  {knowledgeDocuments.length}
                </span>
              </div>
              {knowledgeDocuments.length === 0 ? (
                <p className="aiw-canvas-panel-copy">Belum ada dokumen knowledge.</p>
              ) : (
                <ul className="aiw-canvas-artifacts">
                  {knowledgeDocuments.slice(0, 5).map((document) => (
                    <li key={document.id} className="aiw-canvas-artifact-item">
                      <span>{document.title}</span>
                      <small>{document.source_type}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </aside>
  );
}
