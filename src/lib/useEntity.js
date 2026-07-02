import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

/**
 * Generic CRUD hook for entity tables (contacts, campaigns, content_posts, etc).
 * All queries are automatically scoped to the current user via RLS —
 * Supabase RLS handles row-level filtering server-side.
 *
 * @param {string} table - Supabase table name, e.g. 'contacts'
 * @param {object} [options]
 * @param {string} [options.orderBy='created_at'] - Column to order results by
 * @param {boolean} [options.ascending=false] - Order direction
 * @param {object} [options.filter] - Key-value pairs applied as .eq() filters
 * @param {boolean} [options.autoLoad=true] - Whether to load on mount
 *
 * @returns {{ data, loading, error, create, update, remove, refresh }}
 */
export function useEntity(table, options = {}) {
  const {
    orderBy = "created_at",
    ascending = false,
    filter = {},
    autoLoad = true,
  } = options;

  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Builds a base query with ordering and any static filters applied.
  const buildQuery = useCallback(() => {
    let q = supabase.from(table).select("*").order(orderBy, { ascending });
    for (const [key, value] of Object.entries(filter)) {
      q = q.eq(key, value);
    }
    return q;
    // filter is an object literal — serialise it so the dep array is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, orderBy, ascending, JSON.stringify(filter)]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await buildQuery();
      if (err) throw err;
      setData(rows ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, buildQuery]);

  // Auto-load on mount (and whenever user/query changes).
  useEffect(() => {
    if (!autoLoad || !user) return;
    refresh();
  }, [autoLoad, user, refresh]);

  /**
   * Insert a new record. Includes `user_id` explicitly for tables with
   * a NOT NULL user_id column (RLS still applies on top).
   * Returns the created record.
   */
  const create = useCallback(
    async (record) => {
      const payload = { ...record, user_id: user.id };

      // Optimistic insert with a temporary id so the UI responds immediately.
      const tempId = `temp_${Date.now()}_${Math.random()}`;
      const optimistic = { id: tempId, ...payload };
      setData((prev) => [optimistic, ...prev]);

      try {
        const { data: rows, error: err } = await supabase
          .from(table)
          .insert(payload)
          .select()
          .single();
        if (err) throw err;
        // Replace the optimistic record with the real one from the server.
        setData((prev) => prev.map((r) => (r.id === tempId ? rows : r)));
        return rows;
      } catch (err) {
        // Roll back the optimistic record on failure.
        setData((prev) => prev.filter((r) => r.id !== tempId));
        throw err;
      }
    },
    [table, user],
  );

  /**
   * Update an existing record by id.
   * Returns the updated record.
   */
  const update = useCallback(
    async (id, changes) => {
      // Optimistic update.
      setData((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...changes } : r)),
      );

      try {
        const { data: rows, error: err } = await supabase
          .from(table)
          .update(changes)
          .eq("id", id)
          .select()
          .single();
        if (err) throw err;
        // Reconcile with the server's authoritative version.
        setData((prev) => prev.map((r) => (r.id === id ? rows : r)));
        return rows;
      } catch (err) {
        // Roll back the optimistic change on failure.
        await refresh();
        throw err;
      }
    },
    [table, refresh],
  );

  /**
   * Delete a record by id.
   */
  const remove = useCallback(
    async (id) => {
      // Optimistic removal.
      setData((prev) => prev.filter((r) => r.id !== id));

      try {
        const { error: err } = await supabase
          .from(table)
          .delete()
          .eq("id", id);
        if (err) throw err;
      } catch (err) {
        // Roll back the optimistic removal on failure.
        await refresh();
        throw err;
      }
    },
    [table, refresh],
  );

  return { data, loading, error, create, update, remove, refresh };
}
