import { useState, useMemo } from "react";
import { useEntity } from "../../lib/useEntity.js";
import { useToast } from "../../lib/ToastContext.jsx";
import CalendarView from "./CalendarView.jsx";
import KanbanView from "./KanbanView.jsx";
import PostForm from "./PostForm.jsx";
import "./index.css";

// Stable options — defined outside component so useEntity dep array stays stable.
const POSTS_OPTIONS = { orderBy: "created_at", ascending: false };
const CAMPAIGNS_OPTIONS = { orderBy: "name", ascending: true };

export default function ContentCalendar() {
  const toast = useToast();

  const {
    data: posts,
    loading: postsLoading,
    create,
    update,
    remove,
  } = useEntity("content_posts", POSTS_OPTIONS);

  const { data: campaigns } = useEntity("campaigns", CAMPAIGNS_OPTIONS);

  // View state: 'calendar' | 'kanban'
  const [activeView, setActiveView] = useState("calendar");

  // Panel state: null = closed, 'create' = new post form, 'edit' = edit existing
  const [panelMode, setPanelMode] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  // Pre-fill values passed into PostForm when opening from a day cell or column
  const [prefilledStatus, setPrefilledStatus] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState(null);

  // Stats
  const stats = useMemo(() => {
    const total = posts.length;
    const scheduled = posts.filter((p) => p.status === "scheduled").length;
    const published = posts.filter((p) => p.status === "published").length;
    const draft = posts.filter((p) => p.status === "draft").length;
    return { total, scheduled, published, draft };
  }, [posts]);

  function openCreate(status = null, date = null) {
    setSelectedPost(null);
    setPrefilledStatus(status);
    setPrefilledDate(date);
    setPanelMode("create");
  }

  function openEdit(post) {
    setSelectedPost(post);
    setPrefilledStatus(null);
    setPrefilledDate(null);
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedPost(null);
    setPrefilledStatus(null);
    setPrefilledDate(null);
  }

  async function handleCreate(payload) {
    try {
      const created = await create(payload);
      toast.success("Post berhasil dibuat.");
      closePanel();
      return created;
    } catch (err) {
      toast.error(err.message || "Gagal membuat post.");
      throw err;
    }
  }

  async function handleUpdate(id, payload) {
    try {
      const updated = await update(id, payload);
      toast.success("Post berhasil diperbarui.");
      closePanel();
      return updated;
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui post.");
      throw err;
    }
  }

  async function handleDelete(id) {
    try {
      await remove(id);
      toast.success("Post berhasil dihapus.");
      closePanel();
    } catch (err) {
      toast.error(err.message || "Gagal menghapus post.");
    }
  }

  const isPanelOpen = panelMode !== null;

  return (
    <div className="cc-wrap">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="db-view-header cc-page-header">
        <div>
          <h1 className="db-view-title">Kalender Konten</h1>
          <p className="db-view-sub">
            Rencanakan dan jadwalkan konten di semua platform.
          </p>
        </div>
        <button
          type="button"
          className="cta-button"
          onClick={() => openCreate()}
        >
          + Buat Post
        </button>
      </div>

      {/* ── Stats row ────────────────────────────────────────────── */}
      <div className="db-stats-row cc-stats-row">
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-label">Total Post</span>
          </div>
          <div className="db-stat-value">{stats.total}</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-label">Terjadwal</span>
          </div>
          <div className="db-stat-value cc-stat-value--scheduled">
            {stats.scheduled}
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-label">Terbit</span>
          </div>
          <div className="db-stat-value cc-stat-value--published">
            {stats.published}
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-top">
            <span className="db-stat-label">Draft</span>
          </div>
          <div className="db-stat-value cc-stat-value--draft">
            {stats.draft}
          </div>
        </div>
      </div>

      {/* ── View toggle tabs ─────────────────────────────────────── */}
      <div className="cc-view-tabs">
        <button
          type="button"
          className={`cc-view-tab ${activeView === "calendar" ? "cc-view-tab--active" : ""}`}
          onClick={() => setActiveView("calendar")}
        >
          📅 Kalender
        </button>
        <button
          type="button"
          className={`cc-view-tab ${activeView === "kanban" ? "cc-view-tab--active" : ""}`}
          onClick={() => setActiveView("kanban")}
        >
          🗂 Kanban
        </button>
      </div>

      {/* ── Main view ────────────────────────────────────────────── */}
      <div className="cc-main">
        {postsLoading && posts.length === 0 ? (
          <div className="cc-loading" aria-live="polite">
            <span className="cc-loading-spinner" aria-hidden="true" />
            Memuat post...
          </div>
        ) : activeView === "calendar" ? (
          <CalendarView
            posts={posts}
            campaigns={campaigns}
            onPostClick={openEdit}
            onDayClick={(date) => openCreate(null, date)}
          />
        ) : (
          <KanbanView
            posts={posts}
            campaigns={campaigns}
            onPostClick={openEdit}
            onAddPost={(status) => openCreate(status, null)}
          />
        )}
      </div>

      {/* ── Slide-in form panel ──────────────────────────────────── */}
      {isPanelOpen && (
        <>
          <div
            className="cc-overlay"
            onClick={closePanel}
            aria-hidden="true"
          />
          <aside
            className="cc-panel"
            role="dialog"
            aria-modal="true"
            aria-label={panelMode === "edit" ? "Edit post" : "Buat post baru"}
          >
            <div className="cc-panel-header">
              <h2 className="cc-panel-title">
                {panelMode === "edit" ? "Edit Post" : "Buat Post Baru"}
              </h2>
              <button
                type="button"
                className="cc-panel-close"
                onClick={closePanel}
                aria-label="Tutup panel"
              >
                ×
              </button>
            </div>

            <div className="cc-panel-body">
              <PostForm
                post={panelMode === "edit" ? selectedPost : null}
                campaigns={campaigns}
                onCreate={handleCreate}
                onUpdate={handleUpdate}
                onCancel={closePanel}
                prefilledStatus={prefilledStatus}
                prefilledDate={prefilledDate}
              />

              {panelMode === "edit" && selectedPost && (
                <div className="cc-panel-delete-zone">
                  <button
                    type="button"
                    className="cc-delete-btn"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Hapus post ini? Tindakan ini tidak bisa dibatalkan."
                        )
                      ) {
                        handleDelete(selectedPost.id);
                      }
                    }}
                  >
                    Hapus Post
                  </button>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
