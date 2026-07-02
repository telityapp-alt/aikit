import { fmt } from "../../../lib/format";

export default function ThreadList({
  threads,
  activeThreadId,
  onSelect,
  onCreate,
  agentName,
  onRename,
  onTogglePin,
  onToggleArchive,
  loading = false,
}) {
  return (
    <aside className="aiw-sidebar">
      <div className="aiw-sidebar-top">
        <div className="aiw-sidebar-header">
          <h2 className="aiw-sidebar-title">{agentName}</h2>
          <p className="aiw-sidebar-sub">{threads.length} thread</p>
        </div>

        <button
          type="button"
          className="cta-button aiw-new-thread-btn"
          onClick={onCreate}
        >
          Obrolan Baru
        </button>

        <div
          className="aiw-thread-list"
          role="list"
          aria-label={`Riwayat ${agentName}`}
        >
          {loading ? (
            <div className="aiw-thread-empty">Memuat daftar thread...</div>
          ) : threads.length === 0 ? (
            <div className="aiw-thread-empty">
              Belum ada thread untuk agent ini. Mulai percakapan pertama.
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className={`aiw-thread-item${thread.id === activeThreadId ? " active" : ""}`}
              >
                <button
                  type="button"
                  className="aiw-thread-item-button"
                  onClick={() => onSelect(thread.id)}
                >
                  <span className="aiw-thread-item-title">
                    {thread.pinned ? "Pinned - " : ""}
                    {thread.title}
                  </span>
                  <span className="aiw-thread-item-meta">
                    {thread.status === "archived"
                      ? "Thread diarsipkan"
                      : thread.summary || "Thread siap dipakai"}
                  </span>
                  <span className="aiw-thread-item-time">
                    {fmt.relativeTime(thread.updated_at || thread.created_at)}
                  </span>
                </button>
                {thread.id === activeThreadId ? (
                  <div className="aiw-thread-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => onRename?.(thread)}
                    >
                      Ganti judul
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => onTogglePin?.(thread)}
                    >
                      {thread.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => onToggleArchive?.(thread)}
                    >
                      {thread.status === "archived" ? "Aktifkan" : "Arsipkan"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
