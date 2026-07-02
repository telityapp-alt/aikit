import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

/**
 * Loads and persists per-user module state via the `module_instances` table.
 *
 * @param {string} slug - The module slug (matches module_instances.module_slug)
 * @param {*} emptyState - Initial state value used before load and when no row exists
 * @returns {[state, setState, loaded]}
 *   state   — current state value
 *   setState — function(nextState) — updates local state AND schedules a debounced persist
 *   loaded  — boolean, true once the initial load has completed (success or empty)
 */
export function useModuleState(slug, emptyState) {
  const { user } = useAuth();
  const [state, setLocalState] = useState(emptyState);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // Load persisted state on mount, or mark loaded immediately when no user.
  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }

    supabase
      .from("module_instances")
      .select("state")
      .eq("module_slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.state !== undefined && data?.state !== null) {
          setLocalState(data.state);
        }
        setLoaded(true);
      });
  }, [user, slug]);

  // Debounced upsert — called with the next state value each time setState fires.
  const persist = useCallback(
    (next) => {
      if (!user) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        supabase
          .from("module_instances")
          .upsert(
            {
              user_id: user.id,
              module_slug: slug,
              state: next,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,module_slug" },
          )
          .then(() => {});
      }, 500);
    },
    [user, slug],
  );

  // Clean up any pending timer when the component unmounts.
  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  // Public setState: updates local state and schedules a persist in one call.
  const setState = useCallback(
    (next) => {
      setLocalState(next);
      persist(next);
    },
    [persist],
  );

  return [state, setState, loaded];
}
