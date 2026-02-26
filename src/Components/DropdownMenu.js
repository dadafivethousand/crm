import React from "react";

export default function DropdownMenu({
  open,
  className = "",
  items = [],
  footer = null,
  onRequestClose,
}) {
  if (!open) return null;

  return (
    <div className={className} role="menu">
      {items.map((it) => (
        <button
          key={it.key ?? it.label}
          className={it.className ?? "dropdown-item"}
          disabled={!!it.disabled}
          aria-disabled={!!it.disabled}
          onClick={() => {
            if (it.disabled) return;
            it.onClick?.();
            if (it.closeOnClick !== false) onRequestClose?.();
          }}
        >
          {it.label}
        </button>
      ))}
      {footer}
    </div>
  );
}