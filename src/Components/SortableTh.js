import React from "react";

export default function SortableTh({
  label,
  sortKey,
  sortColumn,
  sortDirection,
  onSort,
  className = "",
}) {
  const active = sortColumn === sortKey;
  const arrow = active ? (sortDirection === "asc" ? "↓" : "↑") : "";

  return (
    <th onClick={() => onSort(sortKey)} className={className}>
      <div className="ct-header">
        <div className="ct-table-header">{label}</div>
        <div className="ct-header-arrow">{arrow}</div>
      </div>
    </th>
  );
}