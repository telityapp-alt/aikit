import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { AuthProvider } from "./lib/AuthContext.jsx";
import { ToastProvider } from "./lib/ToastContext.jsx";

// Route-level code splitting — each page loads its own chunk on demand.
const App = lazy(() => import("./App.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const LegalPage = lazy(() => import("./pages/LegalPage.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));

// Minimal inline fallback — keeps the shell visible while the chunk loads.
function PageLoader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5ecd9",
        fontSize: 14,
        color: "#a07850",
      }}
    >
      Memuat…
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<App />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/privacy" element={<LegalPage doc="privacy" />} />
                <Route path="/terms" element={<LegalPage doc="terms" />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
