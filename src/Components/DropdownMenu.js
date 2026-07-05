import React, { useRef, useLayoutEffect, useEffect, useState } from "react";
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
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorEl?.current) { setPos(null); return; }

    const trigger = anchorEl.current.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight || 0;
    const menuW = menuRef.current?.offsetWidth || 0;

    const spaceBelow = window.innerHeight - trigger.bottom - 8;
    const spaceAbove = trigger.top - 8;
    let top = (spaceBelow >= menuH || spaceBelow >= spaceAbove)
      ? trigger.bottom + 6
      : trigger.top - menuH - 6;
    top = Math.max(8, Math.min(top, window.innerHeight - menuH - 8));

    let left = align === "right" ? trigger.right - menuW : trigger.left;
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));

    setPos({ top, left });
  }, [open, anchorEl, align]);

  useEffect(() => {
    if (!open || !anchorEl) return;
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        anchorEl.current && !anchorEl.current.contains(e.target)
      ) {
        onRequestClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, anchorEl, onRequestClose]);

  if (!open) return null;

  const portalStyle = pos
    ? { position: "fixed", top: pos.top, left: pos.left, right: "auto" }
    : { position: "fixed", top: -9999, left: -9999, visibility: "hidden" };

  const content = (
    <div
      className={className}
      role="menu"
      ref={menuRef}
      style={anchorEl ? portalStyle : undefined}
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
