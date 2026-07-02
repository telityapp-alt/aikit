import { useEntity } from "../../lib/useEntity";
import { fmt } from "../../lib/format";

export default function CampaignContentPosts({ campaignId }) {
  const { data: posts, loading } = useEntity("content_posts", {
    filter: { campaign_id: campaignId },
    orderBy: "scheduled_at",
    ascending: true,
  });

  return (
    <div className="cgm-section">
      <h3 className="cgm-section-title">Content Calendar</h3>

      {loading ? (
        <p className="cgm-contacts-empty">Memuat content posts...</p>
      ) : posts.length === 0 ? (
        <p className="cgm-contacts-empty">
          Belum ada konten yang terhubung ke campaign ini.
        </p>
      ) : (
        <div className="cgm-contact-list">
          {posts.map((post) => (
            <div key={post.id} className="cgm-contact-row">
              <div className="cgm-contact-info">
                <div className="cgm-contact-name">{post.title || post.body || "Untitled post"}</div>
                <div className="cgm-contact-badges">
                  <span className="cgm-contact-badge cgm-role-partner">{post.platform || "platform"}</span>
                  <span className="cgm-contact-badge cgm-role-target">{post.status}</span>
                  <span className="cgm-contact-badge cgm-role-influencer">{post.approval_status}</span>
                </div>
                <div className="cgm-search-result-meta">
                  {post.scheduled_at ? `Jadwal: ${fmt.date(post.scheduled_at)}` : "Belum dijadwalkan"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
