export const CRM_HARDENING_STREAMS = [
  {
    id: "validation",
    title: "Browser / E2E Validation",
    phase: "Phase 1",
    status: "planned",
    summary:
      "Verifikasi klik nyata untuk route, table row detail, quick actions, imports, lead conversion, dan pipeline movement.",
    outcomes: [
      "Smoke spec per workspace",
      "Stable selector strategy",
      "Regression matrix untuk flow CRM inti",
    ],
  },
  {
    id: "permissions",
    title: "Permissions / Roles",
    phase: "Phase 2",
    status: "planned",
    summary:
      "Hardening ownership, role scopes, dan action gating untuk edit, archive, delete, export, settings, dan automations.",
    outcomes: [
      "Role vocabulary",
      "Permission matrix",
      "UI gating + enforcement plan",
    ],
  },
  {
    id: "lifecycle",
    title: "Archive / Restore / Delete",
    phase: "Phase 3",
    status: "planned",
    summary:
      "Lifecycle action yang konsisten untuk people, organizations, leads, deals, tasks, segments, dan imports.",
    outcomes: [
      "Archive-first policy",
      "Restore views",
      "Hard delete guard rails",
    ],
  },
  {
    id: "activities",
    title: "Activity Composer",
    phase: "Phase 4",
    status: "planned",
    summary:
      "Composer lengkap untuk notes, calls, emails, meetings, owner changes, dan automation events.",
    outcomes: [
      "Structured activity types",
      "Composer UX",
      "Timeline filters",
    ],
  },
  {
    id: "bulk",
    title: "Bulk Ops",
    phase: "Phase 5",
    status: "planned",
    summary:
      "Selection + batch mutation untuk leads, deals, dan tasks agar operasi scale tidak one-by-one.",
    outcomes: [
      "Bulk owner/stage/status updates",
      "Bulk archive",
      "Bulk task creation",
    ],
  },
  {
    id: "navigation",
    title: "Related Record Navigation",
    phase: "Phase 6",
    status: "planned",
    summary:
      "Jump antar person, organization, lead, deal, task, dan linked contexts langsung dari detail panels.",
    outcomes: [
      "Related lists",
      "Entity link navigation",
      "In-context record jump",
    ],
  },
  {
    id: "reporting",
    title: "Reporting / Dashboard",
    phase: "Phase 7",
    status: "planned",
    summary:
      "Dashboard dan queue pack yang lebih dalam untuk funnel, SLA, backlog, stale deals, dan source quality.",
    outcomes: [
      "Lead funnel report",
      "Task backlog report",
      "Pipeline / source dashboards",
    ],
  },
  {
    id: "orchestration",
    title: "Settings / Enrichment / Automations",
    phase: "Phase 8",
    status: "planned",
    summary:
      "Settings hidup sebagai control plane untuk SLA, assignments, enrichment, reminder rules, dan triggers lintas module.",
    outcomes: [
      "SLA presets",
      "Assignment rules",
      "Automation trigger catalog",
    ],
  },
];

export const CRM_ROLE_PRESETS = [
  {
    id: "admin",
    label: "Admin",
    permissions: [
      "manage_settings",
      "manage_roles",
      "edit_any_record",
      "archive_any_record",
      "delete_any_record",
      "manage_automations",
      "view_reports",
      "export_records",
    ],
  },
  {
    id: "manager",
    label: "Manager",
    permissions: [
      "view_all_records",
      "edit_team_records",
      "archive_team_records",
      "restore_team_records",
      "assign_records",
      "view_reports",
      "export_records",
    ],
  },
  {
    id: "rep",
    label: "Rep",
    permissions: [
      "view_assigned_records",
      "edit_assigned_records",
      "create_records",
      "log_activities",
      "create_tasks",
    ],
  },
  {
    id: "viewer",
    label: "Viewer",
    permissions: ["view_allowed_records", "view_reports"],
  },
];

export const CRM_ARCHIVE_POLICIES = [
  {
    id: "archive_first",
    label: "Archive first",
    summary: "Default destructive action adalah archive, bukan delete.",
  },
  {
    id: "restore_supported",
    label: "Restore supported",
    summary: "Archived record harus bisa direstore tanpa memutus relasi utama.",
  },
  {
    id: "delete_guarded",
    label: "Hard delete guarded",
    summary: "Hard delete hanya untuk admin dan hanya setelah confirmation + impact summary.",
  },
];

export const CRM_ACTIVITY_CATALOG = [
  { id: "note", label: "Note", channel: "manual" },
  { id: "call_outbound", label: "Outbound Call", channel: "call" },
  { id: "call_inbound", label: "Inbound Call", channel: "call" },
  { id: "email_outbound", label: "Outbound Email", channel: "email" },
  { id: "email_inbound", label: "Inbound Email", channel: "email" },
  { id: "meeting", label: "Meeting", channel: "calendar" },
  { id: "status_change", label: "Status Change", channel: "system" },
  { id: "owner_change", label: "Owner Change", channel: "system" },
  { id: "automation_event", label: "Automation Event", channel: "automation" },
  { id: "import_event", label: "Import Event", channel: "import" },
];

export const CRM_REPORTING_PACKS = [
  {
    id: "lead_funnel",
    label: "Lead Funnel",
    summary: "Volume, conversion, aging, dan stage drop-off untuk lead qualification.",
  },
  {
    id: "task_backlog",
    label: "Task Backlog",
    summary: "Open tasks, overdue tasks, priority queue, dan assignee load.",
  },
  {
    id: "deal_pipeline",
    label: "Deal Pipeline",
    summary: "Pipeline value, stage mix, stale deals, won/lost trend, dan close timing.",
  },
  {
    id: "source_quality",
    label: "Source Quality",
    summary: "Lead source, import quality, enrichment coverage, dan duplicate pressure.",
  },
];

export const CRM_AUTOMATION_TRIGGERS = [
  "lead_created",
  "lead_unworked_sla_breached",
  "deal_stage_changed",
  "deal_stale_threshold_hit",
  "task_overdue",
  "import_completed",
  "activity_logged",
  "owner_missing_detected",
];

export const CRM_SLA_PRESETS = [
  {
    id: "inbound_lead_first_touch",
    label: "Inbound lead first touch",
    target: "15 minutes",
    summary: "Buat task atau alert jika inbound lead belum ditouch dalam 15 menit.",
  },
  {
    id: "qualified_lead_next_step",
    label: "Qualified lead next step",
    target: "1 business day",
    summary: "Qualified lead harus punya next step atau task dalam 1 hari kerja.",
  },
  {
    id: "open_deal_follow_up",
    label: "Open deal follow-up",
    target: "3 days",
    summary: "Deal open tidak boleh idle tanpa activity atau task lebih dari 3 hari.",
  },
];

export const CRM_ASSIGNMENT_RULES = [
  {
    id: "lead_owner_fallback",
    label: "Lead owner fallback",
    summary: "Kalau lead baru belum punya owner, assign ke default owner workspace.",
  },
  {
    id: "deal_owner_from_lead",
    label: "Deal owner from lead",
    summary: "Saat lead dikonversi, owner deal otomatis mengikuti owner lead.",
  },
  {
    id: "task_owner_from_record",
    label: "Task owner from record",
    summary: "Task yang dibuat dari record mengikuti assignee / owner record utama jika tersedia.",
  },
];

export const CRM_ENRICHMENT_RULES = [
  {
    id: "infer_org_from_email_domain",
    label: "Infer organization from email domain",
    summary: "Sarankan organization dari domain email person jika belum linked.",
  },
  {
    id: "normalize_org_domain",
    label: "Normalize organization domain",
    summary: "Standarisasi domain dan website organization untuk reporting source quality.",
  },
  {
    id: "detect_missing_owner",
    label: "Detect missing owner",
    summary: "Tandai person, lead, atau deal yang belum punya owner agar masuk queue triage.",
  },
];

export const CRM_DEFAULT_SETTINGS = {
  sla: {
    inbound_lead_first_touch_enabled: true,
    qualified_lead_next_step_enabled: true,
    open_deal_follow_up_enabled: true,
  },
  assignments: {
    default_owner_label: "Workspace owner",
    lead_owner_fallback: true,
    deal_owner_from_lead: true,
    task_owner_from_record: true,
  },
  enrichment: {
    infer_org_from_email_domain: true,
    normalize_org_domain: true,
    detect_missing_owner: true,
  },
  automations: {
    lead_created: true,
    lead_unworked_sla_breached: true,
    deal_stage_changed: true,
    deal_stale_threshold_hit: true,
    task_overdue: true,
    import_completed: true,
    activity_logged: true,
    owner_missing_detected: true,
  },
};
