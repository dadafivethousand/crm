import React from "react";

export default function SortableTh({ label, sortKey, sortColumn, sortDirection, onSort, className = "" }) {
  const active = sortColumn === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`ct-th-sortable${active ? " ct-th-sorted" : ""}${className ? " " + className : ""}`}
      aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="ct-th-inner">
        {label}
        <span className="ct-sort-icon" aria-hidden="true">
          {active ? (sortDirection === "asc" ? "↑" : "↓") : <span className="ct-sort-idle">↕</span>}
        </span>
      </span>
    </th>
  );
}
