import { fmt } from "../../lib/format.js";

const PLATFORM_EMOJI = {
  instagram: "IG",
  tiktok: "TT",
  facebook: "FB",
  linkedin: "IN",
  twitter: "X",
  youtube: "YT",
  other: "OT",
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
  review: "Review",
  approved: "Approved",
  scheduled: "Terjadwal",
  published: "Terbit",
  cancelled: "Dibatalkan",
};

const APPROVAL_LABEL = {
  not_needed: "No approval",
  pending: "Pending review",
  approved: "Approved",
  changes_requested: "Needs changes",
};

export default function PostCard({ post, onClick, compact = false, campaign }) {
  const emoji = PLATFORM_EMOJI[post.platform] ?? "OT";
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
        <p className="cc-card-campaign">Campaign: {campaign.name}</p>
      )}

      <div className="cc-card-footer">
        <span className="cc-card-time">{timeDisplay}</span>
        <span className="cc-card-time">
          {APPROVAL_LABEL[post.approval_status] ?? post.approval_status}
        </span>
        {shownTags.length > 0 && (
          <div className="cc-card-tags" aria-label="Tag">
            {shownTags.map((tag) => (
              <span key={tag} className="cc-tag-chip">{tag}</span>
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
