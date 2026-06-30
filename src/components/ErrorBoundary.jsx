import { Component } from "react";

// Catches render-time errors anywhere in the tree and shows a recoverable
// fallback instead of a blank white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[aikit] Render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
            color: "#29405f",
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0d1d38" }}>
              Ada yang tidak beres
            </h1>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#55606d" }}>
              Coba muat ulang halaman. Jika masih terjadi, hubungi dukungan.
            </p>
            <button
              type="button"
              className="cta-button"
              style={{ marginTop: 16 }}
              onClick={() => window.location.reload()}
            >
              Muat ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
