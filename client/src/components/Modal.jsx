import React from "react";

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog shell shared by every modal in the app.
 *
 * Handles the behaviour each hand-rolled overlay was missing: Escape to close,
 * click-outside to close, focus trapped inside the panel, focus restored to
 * whatever opened it, and the dialog role/label screen readers need.
 *
 * Pass `title` for the bordered header with a ✕; otherwise supply `label` so
 * the dialog still has an accessible name and render your own heading.
 * `closeDisabled` blocks Escape, the backdrop, and ✕ during an in-flight save.
 */
export default function Modal({
  onClose,
  title,
  eyebrow,
  label,
  size = "sm",
  bodyClassName = "",
  closeDisabled = false,
  children,
}) {
  const panelRef = React.useRef(null);
  const closeRef = React.useRef(onClose);
  const disabledRef = React.useRef(closeDisabled);

  closeRef.current = onClose;
  disabledRef.current = closeDisabled;

  // Focus the first field on open, hand focus back to the trigger on close.
  React.useEffect(() => {
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  // Escape closes; Tab and Shift+Tab wrap around inside the panel.
  React.useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (!disabledRef.current) {
          e.stopPropagation();
          closeRef.current?.();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // Keep the page behind the dialog from scrolling.
  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      // mousedown, not click: a drag that starts inside the panel and releases
      // on the backdrop shouldn't be treated as a click-outside.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !closeDisabled) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || label}
        tabIndex={-1}
        className={`bg-base-100/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full ${
          sizeClasses[size] || sizeClasses.sm
        } max-h-[90vh] flex flex-col focus:outline-none`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
            <div>
              {eyebrow && (
                <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">
                  {eyebrow}
                </p>
              )}
              <h2 className="text-lg font-bold text-base-content">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Close dialog"
              className="text-base-content/40 hover:text-base-content transition-colors text-xl leading-none disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        )}
        <div className={`overflow-y-auto flex-1 ${bodyClassName}`}>{children}</div>
      </div>
    </div>
  );
}
