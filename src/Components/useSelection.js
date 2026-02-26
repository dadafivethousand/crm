import { useState } from "react";

export default function useSelection(items, getKey = (x) => x.key) {
  const [selected, setSelected] = useState(() => new Set());

  const toggleSelect = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => {
      const allKeys = new Set((items || []).map(getKey));
      const hasUnselected = [...allKeys].some((k) => !prev.has(k));
      return hasUnselected ? allKeys : new Set();
    });
  };

  const clearSelection = () => setSelected(new Set());

  return { selected, setSelected, toggleSelect, selectAll, clearSelection };
}