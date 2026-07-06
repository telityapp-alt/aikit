import { useMemo } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";

const ROLE_PERMISSION_MAP = {
  admin: [
    "view",
    "edit",
    "archive",
    "restore",
    "delete",
    "assign",
    "manage_settings",
    "export",
    "create_task",
    "log_activity",
  ],
  manager: [
    "view",
    "edit",
    "archive",
    "restore",
    "assign",
    "export",
    "create_task",
    "log_activity",
  ],
  rep: ["view", "create_task", "log_activity"],
  viewer: ["view"],
};

export function isRecordArchived(record) {
  return Boolean(record?.archived_at);
}

export function filterArchivedRecords(rows, archiveState = "active") {
  return rows.filter((row) => {
    const archived = isRecordArchived(row);
    if (archiveState === "all") return true;
    if (archiveState === "archived") return archived;
    return !archived;
  });
}

export function useCrmGovernance() {
  const { user, profile } = useAuth();

  return useMemo(() => {
    const role = profile?.crm_role || "admin";
    const permissionSet = new Set(ROLE_PERMISSION_MAP[role] || ROLE_PERMISSION_MAP.viewer);

    function can(action, record = null) {
      if (!user?.id) return false;
      if (permissionSet.has(action) && role !== "rep") return true;
      if (role !== "rep") return false;

      const ownerUserId = record?.owner_user_id || null;
      const assigneeUserId = record?.assignee_user_id || null;

      switch (action) {
        case "view":
          return true;
        case "edit":
        case "archive":
          return ownerUserId === user.id || assigneeUserId === user.id;
        case "restore":
        case "delete":
        case "assign":
        case "manage_settings":
        case "export":
          return false;
        case "create_task":
        case "log_activity":
          return true;
        default:
          return false;
      }
    }

    return {
      role,
      permissions: [...permissionSet],
      can,
    };
  }, [profile, user]);
}

export async function archiveCrmRecord(entityType, recordId, reason = "") {
  const { data, error } = await supabase.rpc("crm_archive_record", {
    p_entity_type: entityType,
    p_record_id: recordId,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
}

export async function restoreCrmRecord(entityType, recordId) {
  const { data, error } = await supabase.rpc("crm_restore_record", {
    p_entity_type: entityType,
    p_record_id: recordId,
  });
  if (error) throw error;
  return data;
}

export async function deleteCrmRecord(entityType, recordId, reason = "") {
  const { data, error } = await supabase.rpc("crm_delete_record", {
    p_entity_type: entityType,
    p_record_id: recordId,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
}
