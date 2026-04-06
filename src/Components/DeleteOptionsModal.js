// ./Components/DeleteOptionsModal.jsx
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../Stylesheets/DeleteOptionsModal.css";

export default function DeleteOptionsModal({
  open,
  title = "Delete record?",
  message = "Choose what you want to do with this record.",
  count = 1,
  loading = false,
  onCancel,
  onDelete,
  onDeleteAndSaveAsLead,
  showConvert = true,
}) {
  const cardRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };

    document.addEventListener("keydown", onKeyDown);

    // focus cancel for quick keyboard flow
    setTimeout(() => cancelRef.current?.focus(), 0);

    // lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  const computedTitle =
    count === 1 ? title : `Delete ${count} records?`;

  const computedMessage =
    count === 1
      ? message
      : "Choose what you want to do with these records.";

  return createPortal(
    <div
      className="modal-overlay dom-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => {
        if (!loading) onCancel?.();
      }}
    >
      <div
        className="dom-card"
        ref={cardRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dom-title">{computedTitle}</div>
        <div className="dom-message">{computedMessage}</div>

        <div className="dom-actions">
          <button
            ref={cancelRef}
            className="dom-btn dom-secondary"
            onClick={onCancel}
            disabled={loading}
            type="button"
          >
            Cancel
          </button>

          {showConvert && (
            <button
              className="dom-btn dom-primary"
              onClick={onDeleteAndSaveAsLead}
              disabled={loading}
              type="button"
              title="Save as lead first, then delete"
            >
              Delete &amp; Save as Lead
            </button>
          )}

          <button
            className="dom-btn dom-danger"
            onClick={onDelete}
            disabled={loading}
            type="button"
          >
            Delete
          </button>
        </div>

        {loading && (
          <div className="dom-loading" aria-live="polite">
            Working…
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
