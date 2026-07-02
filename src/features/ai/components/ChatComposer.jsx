import { useEffect, useRef } from "react";

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
            className="ghost-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Lampiran
          </button>
          <button
            type="button"
            className="cta-button aiw-composer-send"
            onClick={onSend}
            disabled={disabled}
          >
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
}
