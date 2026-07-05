import React, { useRef } from "react";
import DropdownMenu from "./DropdownMenu";

export default function RowActionsDropdown({ open, onToggle, onClose, loading, items }) {
  const btnRef = useRef(null);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        className="ct-kebab-btn"
        onClick={onToggle}
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

      <DropdownMenu
        open={open}
        className="individual-actions-dropdown"
        onRequestClose={onClose}
        anchorEl={btnRef}
        align="right"
        items={items.map((it) => ({ ...it, disabled: loading || !!it.disabled }))}
      />
    </div>
  );
}
