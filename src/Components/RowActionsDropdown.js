import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function RowActionsDropdown({ open, onToggle, onClose, loading, items }) {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    onToggle();
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Only render the portal when this specific button is actually visible in the DOM.
  // ClientTable renders RowActionsDropdown in both the desktop table and mobile card
  // list with the same `open` value. Checking offsetWidth prevents the hidden instance
  // from rendering a second dropdown via portal.
  const shouldRenderPortal = open && btnRef.current && btnRef.current.offsetWidth > 0;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        className="ct-kebab-btn"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {shouldRenderPortal && createPortal(
        <div
          ref={menuRef}
          className="individual-actions-dropdown"
          role="menu"
          style={{ position: "fixed", top: dropPos.top, right: dropPos.right, left: "auto" }}
        >
          {items.map((it) => (
            <button
              key={it.key ?? it.label}
              className={it.className ?? "dropdown-item"}
              disabled={loading || !!it.disabled}
              aria-disabled={loading || !!it.disabled}
              onClick={() => {
                if (loading || it.disabled) return;
                it.onClick?.();
                if (it.closeOnClick !== false) onClose();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
