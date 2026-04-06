import React from "react";
import DropdownMenu from "./DropdownMenu";

export default function BulkActionsDropdown({ actionsRef, open, setOpen, loading, selectedCount, items }) {
  return (
    <div ref={actionsRef} style={{ position: "relative" }}>
      <button
        className="mass-actions-btn"
        onClick={() => setOpen((s) => !s)}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Actions
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 6 }}>
          <path d="M7 10l5 5 5-5H7z"/>
        </svg>
      </button>

      <DropdownMenu
        open={open}
        className="actions-dropdown"
        onRequestClose={() => setOpen(false)}
        items={items}
        footer={
          selectedCount > 0 ? (
            <div className="dropdown-footer">{selectedCount} selected</div>
          ) : null
        }
      />
    </div>
  );
}
