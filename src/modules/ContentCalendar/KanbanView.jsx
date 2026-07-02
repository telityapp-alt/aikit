import { useMemo, useState } from "react";
import PostCard from "./PostCard.jsx";

const COLUMNS = [
  { status: "idea", label: "Ide", emoji: "💡" },
  { status: "draft", label: "Draft", emoji: "✏️" },
  { status: "scheduled", label: "Terjadwal", emoji: "📅" },
  { status: "published", label: "Terbit", emoji: "✅" },
];

export default function KanbanView({ posts, campaigns, onPostClick, onAddPost }) {
  const [showCancelled, setShowCancelled] = useState(false);

  const campaignMap = useMemo(() => {
    const map = new Map();
    campaigns.forEach((c) => map.set(c.id, c));
    return map;
  }, [campaigns]);

  const postsByStatus = useMemo(() => {
    const map = new Map();
    COLUMNS.forEach((col) => map.set(col.status, []));
    const cancelled = [];

    posts.forEach((post) => {
      if (post.status === "cancelled") {
        cancelled.push(post);
      } else if (map.has(post.status)) {
        map.get(post.status).push(post);
      }
    });

    // Sort each column by updated_at desc
    map.forEach((list) => {
      list.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA;
      });
    });

    cancelled.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB - dateA;
    });

    return { columns: map, cancelled };
  }, [posts]);

  return (
    <div className="cc-kanban-wrap">
      <div className="cc-kanban-columns">
        {COLUMNS.map((col) => {
          const colPosts = postsByStatus.columns.get(col.status) || [];
          return (
            <div key={col.status} className="cc-kanban-column">
              <div className="cc-kanban-header">
                <h3 className="cc-kanban-title">
                  <span className="cc-kanban-emoji" aria-hidden="true">
                    {col.emoji}
                  </span>
                  {col.label}
                  <span className="cc-kanban-count">{colPosts.length}</span>
                </h3>
                <button
                  type="button"
                  className="cc-kanban-add"
                  onClick={() => onAddPost(col.status)}
                  aria-label={`Tambah post ${col.label}`}
                >
                  +
                </button>
              </div>
              <div className="cc-kanban-list">
                {colPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={onPostClick}
                    campaign={campaignMap.get(post.campaign_id)}
                  />
                ))}
                {colPosts.length === 0 && (
                  <p className="cc-kanban-empty">Belum ada post</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {postsByStatus.cancelled.length > 0 && (
        <div className="cc-cancelled-section">
          <button
            type="button"
            className="cc-cancelled-toggle"
            onClick={() => setShowCancelled(!showCancelled)}
            aria-expanded={showCancelled}
          >
            <span className="cc-cancelled-arrow">{showCancelled ? "▼" : "▶"}</span>
            Dibatalkan ({postsByStatus.cancelled.length})
          </button>
          {showCancelled && (
            <div className="cc-cancelled-grid">
              {postsByStatus.cancelled.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={onPostClick}
                  campaign={campaignMap.get(post.campaign_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
