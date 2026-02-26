import React from "react";
import DropdownMenu from "./DropdownMenu";

export default function BulkActionsDropdown({
  actionsRef,
  open,
  setOpen,
  loading,
  selectedCount,
  items, // array of {label, onClick, disabled?}
}) {
  const disabledAll = loading;

  return (
    <div ref={actionsRef} style={{ position: "relative" }}>
      <button
        className="mass-actions-btn"
        onClick={() => setOpen((s) => !s)}
        title={selectedCount === 0 ? "Select rows to enable actions" : `${selectedCount} selected`}
        disabled={disabledAll}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Actions ▾
      </button>

      <DropdownMenu
        open={open}
        className="actions-dropdown"
        onRequestClose={() => setOpen(false)}
        items={items}
        footer={
          <div style={{ padding: "6px 12px", fontSize: 12, color: "#666" }}>
            {selectedCount === 0 ? "No rows selected" : `${selectedCount} selected`}
          </div>
        }
      />
    </div>
  );
}