import React, { useRef } from "react";
import DropdownMenu from "./DropdownMenu";

export default function BulkActionsDropdown({ actionsRef, open, setOpen, loading, selectedCount, items }) {
  const btnRef = useRef(null);

  return (
    <div ref={actionsRef} style={{ position: "relative" }}>
      <button
        ref={btnRef}
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
        anchorEl={btnRef}
        align="left"
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
