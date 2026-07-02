import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { fmt } from "../../lib/format";
import { useToast } from "../../lib/ToastContext";

const REPORT_SOURCES = [
  {
    table: "instagram_competitor_reports",
    label: "Instagram Competitor",
    titleField: "instagram_handle",
  },
  {
    table: "instagram_profile_reports",
    label: "Instagram Profile",
    titleField: "instagram_handle",
  },
  {
    table: "tiktok_profile_reports",
    label: "TikTok Profile",
    titleField: "tiktok_handle",
  },
  {
    table: "tiktok_ads_reports",
    label: "TikTok Ads",
    titleField: "query",
  },
  {
    table: "meta_ads_reports",
    label: "Meta Ads",
    titleField: "query",
  },
];

export default function CampaignLinkedReports({ campaign }) {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const result = await Promise.all(
        REPORT_SOURCES.map(async (source) => {
          const { data, error } = await supabase
            .from(source.table)
            .select(`id, status, created_at, completed_at, campaign_id, ${source.titleField}`)
            .eq("campaign_id", campaign.id)
            .order("created_at", { ascending: false });
          if (error) throw error;
          return (data || []).map((item) => ({
            ...item,
            sourceLabel: source.label,
            sourceTable: source.table,
            displayTitle: item[source.titleField] || "Report",
          }));
        }),
      );
      setReports(result.flat());
    } catch (err) {
      toast.error("Gagal memuat linked reports.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [campaign.id, toast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function unlinkReport(sourceTable, reportId) {
    try {
      const { error } = await supabase
        .from(sourceTable)
        .update({ campaign_id: null })
        .eq("id", reportId);
      if (error) throw error;
      await loadReports();
      toast.success("Report dilepas dari campaign.");
    } catch (err) {
      toast.error(err?.message || "Gagal melepas report.");
    }
  }

  return (
    <div className="cgm-section">
      <div className="cgm-contacts-header">
        <h3 className="cgm-section-title">Linked Intelligence</h3>
        <button
          type="button"
          className="cgm-button"
          style={{ height: 32, padding: "0 12px", fontSize: 13 }}
          onClick={() => setShowPicker(true)}
        >
          + Kaitkan Report
        </button>
      </div>

      {loading ? (
        <p className="cgm-contacts-empty">Memuat report...</p>
      ) : reports.length === 0 ? (
        <p className="cgm-contacts-empty">
          Belum ada report intelligence yang ditautkan ke campaign ini.
        </p>
      ) : (
        <div className="cgm-contact-list">
          {reports.map((report) => (
            <div key={`${report.sourceTable}:${report.id}`} className="cgm-contact-row">
              <div className="cgm-contact-info">
                <div className="cgm-contact-name">{report.displayTitle}</div>
                <div className="cgm-contact-badges">
                  <span className="cgm-contact-badge cgm-role-target">{report.sourceLabel}</span>
                  <span className={`cgm-contact-badge cgm-role-${report.status === "completed" ? "partner" : "competitor"}`}>
                    {report.status}
                  </span>
                </div>
                <div className="cgm-search-result-meta">
                  Dibuat {fmt.relativeTime(report.created_at)}
                </div>
              </div>
              <button
                type="button"
                className="cgm-remove-contact"
                onClick={() => unlinkReport(report.sourceTable, report.id)}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <ReportPickerModal
          campaignId={campaign.id}
          onClose={() => setShowPicker(false)}
          onLinked={async () => {
            setShowPicker(false);
            await loadReports();
          }}
        />
      )}
    </div>
  );
}

function ReportPickerModal({ campaignId, onClose, onLinked }) {
  const toast = useToast();
  const [sourceTable, setSourceTable] = useState(REPORT_SOURCES[0].table);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeSource = useMemo(
    () => REPORT_SOURCES.find((source) => source.table === sourceTable),
    [sourceTable],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(sourceTable)
          .select(`id, status, created_at, campaign_id, ${activeSource.titleField}`)
          .is("campaign_id", null)
          .order("created_at", { ascending: false })
          .limit(25);
        if (error) throw error;
        if (!cancelled) {
          setItems(data || []);
        }
      } catch {
        if (!cancelled) {
          toast.error("Gagal memuat daftar report.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sourceTable, activeSource, toast]);

  async function linkReport(reportId) {
    try {
      const { error } = await supabase
        .from(sourceTable)
        .update({ campaign_id: campaignId })
        .eq("id", reportId);
      if (error) throw error;
      toast.success("Report berhasil dikaitkan.");
      await onLinked();
    } catch (err) {
      toast.error(err?.message || "Gagal mengaitkan report.");
    }
  }

  return (
    <div className="cgm-modal-overlay" onClick={onClose}>
      <div className="cgm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cgm-modal-header">
          <h3 className="cgm-modal-title">Kaitkan Report</h3>
          <button type="button" className="cgm-modal-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="cgm-modal-body">
          <select
            className="cgm-role-select"
            style={{ width: "100%" }}
            value={sourceTable}
            onChange={(e) => setSourceTable(e.target.value)}
          >
            {REPORT_SOURCES.map((source) => (
              <option key={source.table} value={source.table}>
                {source.label}
              </option>
            ))}
          </select>

          {loading ? (
            <p className="cgm-modal-empty">Memuat report...</p>
          ) : items.length === 0 ? (
            <p className="cgm-modal-empty">Belum ada report yang bisa ditautkan.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item) => (
                <div key={item.id} className="cgm-search-result">
                  <div className="cgm-search-result-info">
                    <div className="cgm-search-result-name">
                      {item[activeSource.titleField] || "Report"}
                    </div>
                    <div className="cgm-search-result-meta">
                      {item.status} • {fmt.relativeTime(item.created_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cgm-button cgm-add-contact-btn"
                    onClick={() => linkReport(item.id)}
                  >
                    Kaitkan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
