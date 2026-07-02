import { fmt } from "../../lib/format.js";

const PLATFORM_EMOJI = {
  instagram: "📸",
  tiktok: "🎵",
  facebook: "👤",
  linkedin: "💼",
  twitter: "🐦",
  youtube: "▶️",
  other: "📝",
};

const PLATFORM_LABEL = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  youtube: "YouTube",
  other: "Lainnya",
};

const STATUS_LABEL = {
  idea: "Ide",
  draft: "Draft",
  scheduled: "Terjadwal",
  published: "Terbit",
  cancelled: "Dibatalkan",
};

export default function PostCard({ post, onClick, compact = false, campaign }) {
  const emoji = PLATFORM_EMOJI[post.platform] ?? "📝";
  const platformLabel = PLATFORM_LABEL[post.platform] ?? post.platform;
  const statusLabel = STATUS_LABEL[post.status] ?? post.status;
  const preview = post.title || post.body || "(Tanpa judul)";
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const shownTags = tags.slice(0, 2);
  const extraTags = tags.length > 2 ? tags.length - 2 : 0;

  const timeDisplay = post.scheduled_at
    ? fmt.date(post.scheduled_at)
    : fmt.relativeTime(post.updated_at);

  if (compact) {
    return (
      <button
        type="button"
        className={`cc-card cc-card--compact cc-card--${post.status}`}
        onClick={() => onClick(post)}
        aria-label={`Buka post: ${preview}`}
      >
        <span className="cc-card-emoji" aria-hidden="true">{emoji}</span>
        <span className="cc-card-title-compact">{preview}</span>
        <span className={`cc-status-badge cc-status-badge--${post.status}`}>
          {statusLabel}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`cc-card cc-card--${post.status}`}
      onClick={() => onClick(post)}
      aria-label={`Buka post: ${preview}`}
    >
      <div className="cc-card-top">
        <span className="cc-card-emoji" aria-hidden="true">{emoji}</span>
        <span className="cc-card-platform">{platformLabel}</span>
        <span className={`cc-status-badge cc-status-badge--${post.status}`}>
          {statusLabel}
        </span>
      </div>

      <p className="cc-card-title">{preview}</p>

      {campaign && (
        <p className="cc-card-campaign">📋 {campaign.name}</p>
      )}

      <div className="cc-card-footer">
        <span className="cc-card-time">{timeDisplay}</span>
        {shownTags.length > 0 && (
          <div className="cc-card-tags" aria-label="Tag">
            {shownTags.map((t) => (
              <span key={t} className="cc-tag-chip">{t}</span>
            ))}
            {extraTags > 0 && (
              <span className="cc-tag-more">+{extraTags}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
