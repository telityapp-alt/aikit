import {
  CRM_ACTIVITY_CATALOG,
  CRM_ARCHIVE_POLICIES,
  CRM_ASSIGNMENT_RULES,
  CRM_AUTOMATION_TRIGGERS,
  CRM_DEFAULT_SETTINGS,
  CRM_ENRICHMENT_RULES,
  CRM_HARDENING_STREAMS,
  CRM_REPORTING_PACKS,
  CRM_ROLE_PRESETS,
  CRM_SLA_PRESETS,
} from "./controlPlaneConfig.js";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import { supabase } from "../../lib/supabase.js";
import { useCrmGovernance } from "./governance.js";

function startCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatusBadge({ value }) {
  return (
    <span className={`crm-pill ${value === "in_progress" ? "crm-pill--open" : "crm-pill--pending"}`}>
      {value === "in_progress" ? "In Progress" : "Planned"}
    </span>
  );
}

export default function SettingsWorkspaceSection() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const { role, permissions, can } = useCrmGovernance();
  const [settingsForm, setSettingsForm] = useState(CRM_DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  const mergedSettings = useMemo(() => {
    return {
      ...CRM_DEFAULT_SETTINGS,
      ...(profile?.crm_settings || {}),
      sla: {
        ...CRM_DEFAULT_SETTINGS.sla,
        ...(profile?.crm_settings?.sla || {}),
      },
      assignments: {
        ...CRM_DEFAULT_SETTINGS.assignments,
        ...(profile?.crm_settings?.assignments || {}),
      },
      enrichment: {
        ...CRM_DEFAULT_SETTINGS.enrichment,
        ...(profile?.crm_settings?.enrichment || {}),
      },
      automations: {
        ...CRM_DEFAULT_SETTINGS.automations,
        ...(profile?.crm_settings?.automations || {}),
      },
    };
  }, [profile]);

  useEffect(() => {
    setSettingsForm(mergedSettings);
  }, [mergedSettings]);

  async function updateArchivePolicy(value) {
    if (!can("manage_settings")) {
      toast.error("Role kamu tidak punya izin ubah CRM settings.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ crm_archive_policy: value })
      .eq("id", profile?.id);

    if (error) {
      toast.error(error.message || "Gagal menyimpan archive policy.");
      return;
    }

    await refreshProfile();
    toast.success("Archive policy berhasil diperbarui.");
  }

  function updateSetting(group, key, value) {
    setSettingsForm((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: value,
      },
    }));
  }

  async function saveControlPlaneSettings() {
    if (!can("manage_settings")) {
      toast.error("Role kamu tidak punya izin ubah CRM settings.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ crm_settings: settingsForm })
        .eq("id", profile?.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("CRM settings berhasil disimpan.");
    } catch (error) {
      toast.error(error?.message || "Gagal menyimpan CRM settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="crm-settings-layout" data-testid="crm-section-settings">
      <section className="crm-panel" data-testid="crm-settings-control-plane">
        <div className="crm-panel-head">
          <div>
            <h2 className="crm-panel-title">CRM Settings</h2>
            <p className="crm-panel-sub">
              Pengaturan workspace CRM untuk akses, arsip, assignment, SLA, dan automasi dasar.
            </p>
          </div>
        </div>

        <div className="crm-metric-grid">
          <article className="crm-metric-card">
            <span className="crm-metric-value">{CRM_HARDENING_STREAMS.length}</span>
            <span className="crm-metric-label">Roadmap Streams</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">{CRM_ROLE_PRESETS.length}</span>
            <span className="crm-metric-label">Role Presets</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">{CRM_ACTIVITY_CATALOG.length}</span>
            <span className="crm-metric-label">Activity Types</span>
          </article>
          <article className="crm-metric-card">
            <span className="crm-metric-value">{CRM_AUTOMATION_TRIGGERS.length}</span>
            <span className="crm-metric-label">Automation Triggers</span>
          </article>
        </div>
      </section>

      <section className="crm-panel" data-testid="crm-settings-streams">
        <div className="crm-panel-head">
          <div>
            <h3 className="crm-panel-title">Phase Map</h3>
            <p className="crm-panel-sub">
              Peta rollout supaya pengembangan CRM tetap rapi dan tiap area bisa dilanjutkan bertahap.
            </p>
          </div>
        </div>

        <div className="crm-stream-grid">
          {CRM_HARDENING_STREAMS.map((stream) => (
            <article key={stream.id} className="crm-stream-card">
              <div className="crm-stream-head">
                <div>
                  <strong>{stream.title}</strong>
                  <span>{stream.phase}</span>
                </div>
                <StatusBadge value={stream.status} />
              </div>
              <p>{stream.summary}</p>
              <div className="crm-related-list">
                <strong>Outcomes</strong>
                {stream.outcomes.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="crm-grid-2">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Current CRM Role</h3>
              <p className="crm-panel-sub">
                Ringkasan role aktif yang menentukan akses utama di workspace CRM.
              </p>
            </div>
          </div>

          <div className="crm-detail-grid">
            <div className="crm-detail-card">
              <strong>Role</strong>
              <span>{role}</span>
            </div>
            <div className="crm-detail-card">
              <strong>Workspace</strong>
              <span>{profile?.workspace_name || "Workspace"}</span>
            </div>
          </div>

          <div className="crm-related-list">
            <strong>Access Summary</strong>
            <span>{permissions.length} active access rule untuk role ini.</span>
          </div>
        </section>

        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Role Vocabulary</h3>
              <p className="crm-panel-sub">
                Preset akses yang dipakai untuk mengatur siapa bisa melihat dan mengubah apa.
              </p>
            </div>
          </div>

          <div className="crm-settings-list">
            {CRM_ROLE_PRESETS.map((role) => (
              <article key={role.id} className="crm-setting-card">
                <div className="crm-setting-head">
                  <strong>{role.label}</strong>
                  <span>{role.permissions.length} rules</span>
                </div>
                <div className="crm-tag-list">
                  {role.permissions.map((permission) => (
                    <span key={permission} className="crm-tag">
                      {startCase(permission)}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Archive Policy</h3>
              <p className="crm-panel-sub">
                Atur cara record dipindahkan ke arsip supaya alur kerja tim tetap konsisten.
              </p>
            </div>
          </div>

          <div className="crm-settings-list">
            {CRM_ARCHIVE_POLICIES.map((policy) => (
              <article key={policy.id} className="crm-setting-card">
                <div className="crm-setting-head">
                  <strong>{policy.label}</strong>
                  {profile?.crm_archive_policy === policy.id ? (
                    <span>Active</span>
                  ) : null}
                </div>
                <p>{policy.summary}</p>
                <div className="crm-form-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => updateArchivePolicy(policy.id)}
                    disabled={!can("manage_settings") || profile?.crm_archive_policy === policy.id}
                  >
                    {profile?.crm_archive_policy === policy.id ? "Active Policy" : "Set Policy"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="crm-grid-2">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Activity Catalog</h3>
              <p className="crm-panel-sub">
                Daftar jenis aktivitas untuk notes, calls, dan emails di timeline CRM.
              </p>
            </div>
          </div>

          <div className="crm-settings-list">
            {CRM_ACTIVITY_CATALOG.map((item) => (
              <article key={item.id} className="crm-setting-card">
                <div className="crm-setting-head">
                  <strong>{item.label}</strong>
                  <span>{item.channel}</span>
                </div>
                <p>Used in activity logging and timeline filtering.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Reporting Packs</h3>
              <p className="crm-panel-sub">
                Paket laporan yang jadi dasar dashboard dan monitoring CRM.
              </p>
            </div>
          </div>

          <div className="crm-settings-list">
            {CRM_REPORTING_PACKS.map((item) => (
              <article key={item.id} className="crm-setting-card">
                <div className="crm-setting-head">
                  <strong>{item.label}</strong>
                </div>
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="crm-grid-2">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Assignment Rules</h3>
              <p className="crm-panel-sub">
                Atur pembagian owner dan assignment record supaya follow-up tidak ada yang jatuh.
              </p>
            </div>
          </div>

          <label className="crm-field">
            <span>Default Owner Label</span>
            <input
              className="text-input"
              value={settingsForm.assignments.default_owner_label}
              onChange={(e) => updateSetting("assignments", "default_owner_label", e.target.value)}
              disabled={!can("manage_settings") || saving}
            />
          </label>

          <div className="crm-settings-list">
            {CRM_ASSIGNMENT_RULES.map((item) => (
              <article key={item.id} className="crm-setting-card">
                <div className="crm-setting-head">
                  <strong>{item.label}</strong>
                  <span>{settingsForm.assignments[item.id] ? "Enabled" : "Disabled"}</span>
                </div>
                <p>{item.summary}</p>
                <label className="crm-checkbox-inline">
                  <input
                    type="checkbox"
                    checked={Boolean(settingsForm.assignments[item.id])}
                    onChange={(e) => updateSetting("assignments", item.id, e.target.checked)}
                    disabled={!can("manage_settings") || saving}
                  />
                  Enable rule
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Enrichment Rules</h3>
              <p className="crm-panel-sub">
                Atur data enhancement dan rekomendasi ringan untuk bantu kualitas data CRM.
              </p>
            </div>
          </div>

          <div className="crm-settings-list">
            {CRM_ENRICHMENT_RULES.map((item) => (
              <article key={item.id} className="crm-setting-card">
                <div className="crm-setting-head">
                  <strong>{item.label}</strong>
                  <span>{settingsForm.enrichment[item.id] ? "Enabled" : "Disabled"}</span>
                </div>
                <p>{item.summary}</p>
                <label className="crm-checkbox-inline">
                  <input
                    type="checkbox"
                    checked={Boolean(settingsForm.enrichment[item.id])}
                    onChange={(e) => updateSetting("enrichment", item.id, e.target.checked)}
                    disabled={!can("manage_settings") || saving}
                  />
                  Enable rule
                </label>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="crm-grid-2">
        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">SLA Presets</h3>
              <p className="crm-panel-sub">
                Target SLA untuk response time dan reminder kerja tim CRM.
              </p>
            </div>
          </div>

          <div className="crm-settings-list">
            {CRM_SLA_PRESETS.map((item) => (
              <article key={item.id} className="crm-setting-card">
                <div className="crm-setting-head">
                  <strong>{item.label}</strong>
                  <span>{settingsForm.sla[`${item.id}_enabled`] ? item.target : "Disabled"}</span>
                </div>
                <p>{item.summary}</p>
                <label className="crm-checkbox-inline">
                  <input
                    type="checkbox"
                    checked={Boolean(settingsForm.sla[`${item.id}_enabled`])}
                    onChange={(e) => updateSetting("sla", `${item.id}_enabled`, e.target.checked)}
                    disabled={!can("manage_settings") || saving}
                  />
                  Enable SLA
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="crm-panel">
          <div className="crm-panel-head">
            <div>
              <h3 className="crm-panel-title">Automation Trigger Catalog</h3>
              <p className="crm-panel-sub">
                Event yang bisa dipakai untuk reminder, assignment, dan automasi CRM berikutnya.
              </p>
            </div>
          </div>

          <div className="crm-tag-list">
            {CRM_AUTOMATION_TRIGGERS.map((trigger) => (
              <label key={trigger} className="crm-checkbox-inline crm-setting-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(settingsForm.automations[trigger])}
                  onChange={(e) => updateSetting("automations", trigger, e.target.checked)}
                  disabled={!can("manage_settings") || saving}
                />
                <span className="crm-tag">{startCase(trigger)}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="crm-panel">
        <div className="crm-panel-head">
          <div>
            <h3 className="crm-panel-title">Control Plane Persistence</h3>
            <p className="crm-panel-sub">
              Simpan semua perubahan settings supaya workspace CRM tetap konsisten untuk seluruh tim.
            </p>
          </div>
        </div>

        <div className="crm-form-actions">
          <button
            type="button"
            className="cta-button"
            onClick={saveControlPlaneSettings}
            disabled={!can("manage_settings") || saving}
          >
            {saving ? "Menyimpan..." : "Save Settings"}
          </button>
        </div>
      </section>
    </section>
  );
}
