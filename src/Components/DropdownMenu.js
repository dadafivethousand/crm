import React, { useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export default function DropdownMenu({
  open,
  className = "",
  items = [],
  footer = null,
  onRequestClose,
  anchorEl = null,
  align = "right",
}) {
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !menuRef.current || !anchorEl?.current) return;
    const trigger = anchorEl.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();

    const spaceBelow = window.innerHeight - trigger.bottom - 8;
    const spaceAbove = trigger.top - 8;
    let top;
    if (spaceBelow >= menu.height || spaceBelow >= spaceAbove) {
      top = trigger.bottom + 6;
    } else {
      top = trigger.top - menu.height - 6;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - menu.height - 8));

    let left;
    if (align === "right") {
      left = trigger.right - menu.width;
    } else {
      left = trigger.left;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - menu.width - 8));

    menuRef.current.style.top = top + "px";
    menuRef.current.style.left = left + "px";
    menuRef.current.style.visibility = "visible";
  }, [open, anchorEl, align]);

  if (!open) return null;

  const content = (
    <div
      className={className}
      role="menu"
      ref={anchorEl ? menuRef : undefined}
      style={
        anchorEl
          ? { position: "fixed", visibility: "hidden", top: 0, left: 0, right: "auto" }
          : undefined
      }
    >
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

  return anchorEl ? createPortal(content, document.body) : content;
}
