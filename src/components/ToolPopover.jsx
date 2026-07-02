import { useEffect, useRef } from "react";

function IconX() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function ToolPopover({ card, onClose, onGoToDashboard }) {
  const overlayRef = useRef(null);

  // handle both automasi cards (costPerRun number) and module cards (pricing string)
  const isFree =
    card.costPerRun === 0 ||
    card.pricing === "Free" ||
    card.pricing === "Gratis";

  const pricingDisplay = (() => {
    if (card.costPerRun !== undefined) {
      return card.costPerRun === 0 ? "Gratis" : `${card.costPerRun} kredit`;
    }
    return card.pricing || "—";
  })();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Build meta rows, skipping missing fields gracefully
  const metaRows = [
    card.type ? { label: "Tipe", value: card.type } : null,
    card.category
      ? { label: "Kategori", value: card.category }
      : card.details?.category
        ? { label: "Kategori", value: card.details.category }
        : null,
    {
      label: "Pricing",
      value: isFree ? "Gratis" : card.pricing || "Pay per run",
      green: isFree,
    },
    card.costPerRun !== undefined
      ? {
          label: "Biaya per run",
          value: card.costPerRun === 0 ? "Gratis" : `${card.costPerRun} kredit`,
          green: card.costPerRun === 0,
        }
      : null,
    card.details?.estimatedTime
      ? { label: "Estimasi waktu", value: card.details.estimatedTime }
      : null,
    card.users !== undefined
      ? { label: "Pengguna aktif", value: `${card.users} orang` }
      : null,
    card.details?.requirements
      ? { label: "Requirements", value: card.details.requirements }
      : null,
  ].filter(Boolean);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={card.title}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-ink-dark/50 backdrop-blur-sm animate-[tp-fade_180ms_cubic-bezier(0.22,1,0.36,1)]"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-[580px] max-h-[90vh] bg-cream border border-border-warm rounded-[18px] overflow-hidden animate-[tp-slide_220ms_cubic-bezier(0.22,1,0.36,1)]"
        style={{
          boxShadow:
            "inset 0 -3px 0 rgba(21,19,16,0.08), 0 16px 56px rgba(21,19,16,0.2), 0 2px 8px rgba(21,19,16,0.08)",
        }}
      >
        {/* Close button */}
        <button
          className="absolute top-3.5 right-3.5 z-10 w-8 h-8 flex items-center justify-center rounded-lg border border-border-warm bg-cream/90 backdrop-blur-sm text-ink-soft hover:bg-sand hover:text-ink-dark transition-[background,color] duration-150"
          aria-label="Tutup"
          onClick={onClose}
        >
          <IconX />
        </button>

        {/* Hero image */}
        {card.image && (
          <div className="relative w-full h-[185px] overflow-hidden flex-shrink-0">
            <img
              src={card.image}
              alt={card.title}
              className="w-full h-full object-cover block"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-dark/40 to-transparent" />
            <div className="absolute bottom-3 left-4 flex gap-1.5 flex-wrap">
              {card.type && (
                <span className="db-chip db-chip-amber">{card.type}</span>
              )}
              <span
                className={`db-chip ${isFree ? "db-chip-green" : "db-chip-amber"}`}
              >
                {isFree ? "Gratis" : card.pricing || "Pay per run"}
              </span>
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-6 pt-5 pb-2">
            <h2 className="font-sans text-[17px] font-bold text-ink-dark leading-snug m-0">
              {card.title}
            </h2>
            {card.desc && (
              <p className="font-sans text-[13px] text-ink-soft leading-relaxed mt-1.5 mb-0">
                {card.desc}
              </p>
            )}
          </div>

          {/* Meta table */}
          {metaRows.length > 0 && (
            <div className="mx-6 mt-4 rounded-xl overflow-hidden border border-border-muted">
              <table className="w-full text-[12px] font-sans border-collapse">
                <tbody>
                  {metaRows.map((row, i) => (
                    <tr
                      key={row.label}
                      className={
                        i < metaRows.length - 1
                          ? "border-b border-border-muted"
                          : ""
                      }
                    >
                      <td className="py-2.5 px-3.5 text-ink-muted font-medium w-[42%] bg-sand/40 align-top">
                        {row.label}
                      </td>
                      <td
                        className={`py-2.5 px-3.5 align-top font-medium ${
                          row.green ? "text-green-brand" : "text-ink-dark"
                        }`}
                      >
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detail sections — only if card has details */}
          {card.details && (
            <div className="px-6 pt-5 pb-6 flex flex-col gap-5">
              {/* Expected output */}
              {card.details.expectedOutput && (
                <div className="flex flex-col gap-2">
                  <p className="font-sans text-[12px] font-semibold text-ink-muted m-0">
                    Output yang kamu dapat
                  </p>
                  <p className="font-sans text-[13px] font-medium text-ink-mid leading-relaxed m-0 bg-sand/50 rounded-xl px-4 py-3 border border-border-muted">
                    {card.details.expectedOutput}
                  </p>
                </div>
              )}

              {/* How it works */}
              {card.details.howItWorks?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="font-sans text-[12px] font-semibold text-ink-muted m-0">
                    Cara kerja
                  </p>
                  <ol className="flex flex-col gap-2 m-0 p-0 list-none">
                    {card.details.howItWorks.map((step, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 font-sans text-[13px] font-medium text-ink-mid leading-snug"
                      >
                        <span className="shrink-0 w-5 h-5 rounded-md bg-cream border border-border-warm flex items-center justify-center text-[11px] font-bold text-ink-muted mt-px">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Use cases */}
              {card.details.useCases?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="font-sans text-[12px] font-semibold text-ink-muted m-0">
                    Cocok untuk
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {card.details.useCases.map((uc, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 font-sans text-[13px] font-medium text-ink-mid leading-snug"
                      >
                        <span className="shrink-0 w-1 h-1 rounded-full bg-ink-muted mt-[7px]" />
                        <span>{uc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Spacer if no details section */}
          {!card.details && <div className="pb-4" />}
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 flex gap-2.5 items-center px-6 py-3.5 border-t border-border-muted bg-cream">
          <button
            type="button"
            className="cta-button flex items-center gap-1.5"
            onClick={onGoToDashboard}
          >
            Buka Tool <IconArrowRight />
          </button>
          <button type="button" className="ghost-button" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
