import { useMemo, useState } from "react";
import PostCard from "./PostCard.jsx";

const COLUMNS = [
  { status: "idea", label: "Ide", emoji: "I" },
  { status: "draft", label: "Draft", emoji: "D" },
  { status: "review", label: "Review", emoji: "R" },
  { status: "approved", label: "Approved", emoji: "A" },
  { status: "scheduled", label: "Terjadwal", emoji: "S" },
  { status: "published", label: "Terbit", emoji: "P" },
];

export default function KanbanView({ posts, campaigns, onPostClick, onAddPost }) {
  const [showCancelled, setShowCancelled] = useState(false);

  const campaignMap = useMemo(() => {
    const map = new Map();
    campaigns.forEach((campaign) => map.set(campaign.id, campaign));
    return map;
  }, [campaigns]);

  const postsByStatus = useMemo(() => {
    const map = new Map();
    COLUMNS.forEach((column) => map.set(column.status, []));
    const cancelled = [];

    posts.forEach((post) => {
      if (post.status === "cancelled") {
        cancelled.push(post);
      } else if (map.has(post.status)) {
        map.get(post.status).push(post);
      }
    });

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
      <div className="cc-kanban-columns cc-kanban-columns--wide">
        {COLUMNS.map((column) => {
          const columnPosts = postsByStatus.columns.get(column.status) || [];
          return (
            <div key={column.status} className="cc-kanban-column">
              <div className="cc-kanban-header">
                <h3 className="cc-kanban-title">
                  <span className="cc-kanban-emoji" aria-hidden="true">
                    {column.emoji}
                  </span>
                  {column.label}
                  <span className="cc-kanban-count">{columnPosts.length}</span>
                </h3>
                <button
                  type="button"
                  className="cc-kanban-add"
                  onClick={() => onAddPost(column.status)}
                  aria-label={`Tambah post ${column.label}`}
                >
                  +
                </button>
              </div>
              <div className="cc-kanban-list">
                {columnPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={onPostClick}
                    campaign={campaignMap.get(post.campaign_id)}
                  />
                ))}
                {columnPosts.length === 0 && (
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
            <span className="cc-cancelled-arrow">{showCancelled ? "v" : ">"}</span>
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
