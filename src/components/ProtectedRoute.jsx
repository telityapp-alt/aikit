import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

/**
 * Gates dashboard routes. While the session is resolving we render nothing
 * visible (no layout shift). Unauthenticated users bounce to the landing page,
 * where they can open the login popover.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        aria-busy="true"
        style={{ minHeight: "100vh", background: "#ffffff" }}
      />
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return children;
}
