import React from "react";
import DropdownMenu from "./DropdownMenu";

export default function RowActionsDropdown({
  open,
  onToggle,          // () => toggle open
  onClose,           // () => close
  loading,
  items,             // array of actions
}) {
  return (
    <div style={{ position: "relative" }}>
      <button className=" " onClick={onToggle} aria-haspopup="menu" aria-expanded={open}>
        ⋮
      </button>

      <DropdownMenu
        open={open}
        className="individual-actions-dropdown"
        onRequestClose={onClose}
        items={items.map((it) => ({
          ...it,
          disabled: loading || !!it.disabled,
        }))}
      />
    </div>
  );
}