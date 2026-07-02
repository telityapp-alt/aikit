import { useState } from "react";

const CANVAS_MODES = [
  { id: "collapsed", label: "Min" },
  { id: "preview", label: "Preview" },
  { id: "full", label: "Lebar" },
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
        <button type="button" className="ghost-button" onClick={() => onModeChange("preview")}>
          Buka canvas
        </button>
      </aside>
    );
  }

  return (
    <aside className={`aiw-canvas${mode === "full" ? " aiw-canvas--full" : ""}`}>
      <div className="aiw-canvas-top">
        <div>
          <span className="aiw-canvas-eyebrow">Canvas</span>
          <h3 className="aiw-canvas-title">Output workspace</h3>
        </div>
        <div className="aiw-canvas-modes">
          {CANVAS_MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`aiw-canvas-mode${mode === entry.id ? " active" : ""}`}
              onClick={() => onModeChange(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="aiw-canvas-body">
        <div className="aiw-canvas-panel">
          <h4 className="aiw-canvas-panel-title">Status saat ini</h4>
          <p className="aiw-canvas-panel-copy">
            {thread
              ? `Thread ini milik ${agent.name} dan siap menghasilkan artifact yang bisa dipin, diteruskan, dan diiterasi.`
              : `Buka atau mulai thread ${agent.name} untuk menaruh output terstruktur di canvas ini.`}
          </p>
        </div>

        <div className="aiw-canvas-panel">
          <h4 className="aiw-canvas-panel-title">Artifact queue</h4>
          {artifacts.length === 0 ? (
            <p className="aiw-canvas-panel-copy">
              Belum ada artifact tersimpan. Balasan assistant berikutnya akan otomatis masuk ke canvas ini sebagai output pertama.
            </p>
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
        </div>

        {latestArtifact ? (
          <div className="aiw-canvas-panel aiw-canvas-panel--accent">
            <h4 className="aiw-canvas-panel-title">Preview terbaru</h4>
            <p className="aiw-canvas-preview-title">{latestArtifact.title}</p>
            <p className="aiw-canvas-panel-copy">
              {latestArtifact.summary || latestArtifact.content_json?.text || "Artifact siap ditinjau."}
            </p>
          </div>
        ) : (
          <div className="aiw-canvas-panel aiw-canvas-panel--accent">
            <h4 className="aiw-canvas-panel-title">Surface berikutnya</h4>
            <ul className="aiw-canvas-list">
              <li>Dokumen draft dan SOP</li>
              <li>Tabel financial dan analysis snapshot</li>
              <li>Campaign plan, listing copy, dan knowledge notes</li>
            </ul>
          </div>
        )}

        {agent.slug === "knowledge" ? (
          <>
            <div className="aiw-canvas-panel">
              <h4 className="aiw-canvas-panel-title">Tambah knowledge</h4>
              <div className="aiw-knowledge-form">
                <input
                  className="aiw-knowledge-input"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Judul knowledge"
                />
                <textarea
                  className="aiw-knowledge-textarea"
                  rows={5}
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  placeholder="Tempel notes, SOP, ringkasan meeting, atau FAQ di sini..."
                />
                <button
                  type="button"
                  className="cta-button"
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
                  {ingestingKnowledge ? "Menyimpan..." : "Simpan ke knowledge"}
                </button>
              </div>
            </div>

            <div className="aiw-canvas-panel">
              <h4 className="aiw-canvas-panel-title">Knowledge terbaru</h4>
              {knowledgeDocuments.length === 0 ? (
                <p className="aiw-canvas-panel-copy">
                  Belum ada dokumen knowledge. Simpan notes atau upload file teks untuk mulai membangun memory bisnis.
                </p>
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
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
