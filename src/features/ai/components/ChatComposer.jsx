import { useEffect, useRef } from "react";

function IconPaperclip() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16.5 6.5 9 14a3.5 3.5 0 1 0 5 5l8-8a5.5 5.5 0 1 0-7.8-7.8l-8.2 8.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconArrowUp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 19V5m0 0-5 5m5-5 5 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function ChatComposer({
  value,
  onChange,
  onSend,
  placeholder,
  disabled,
  attachments = [],
  onAddFiles,
  onRemoveAttachment,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }, [value]);

  return (
    <div className="aiw-composer-shell">
      <div className="aiw-composer">
        {attachments.length > 0 ? (
          <div className="aiw-attachment-list">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="aiw-attachment-chip">
                <span>{attachment.title}</span>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onRemoveAttachment?.(attachment.id)}
                  disabled={disabled}
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="aiw-composer-row">
          <textarea
            ref={textareaRef}
            className="aiw-composer-input"
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="Pesan AI agent"
          />
          <div className="aiw-composer-actions">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.tsv,text/plain,text/markdown,text/csv,application/json"
              hidden
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                if (files.length > 0) {
                  onAddFiles?.(files);
                }
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="ghost-button aiw-composer-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              aria-label="Tambah lampiran"
              title="Tambah lampiran"
            >
              <IconPaperclip />
            </button>
            <button
              type="button"
              className="cta-button aiw-composer-send"
              onClick={onSend}
              disabled={disabled}
              aria-label="Kirim pesan"
              title="Kirim pesan"
            >
              <IconArrowUp />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
