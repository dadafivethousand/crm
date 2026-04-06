import React, { useState, useEffect, useRef } from "react";
import "./Stylesheets/ClientTable.css";

import BulkActionsDropdown from "./Components/BulkActionsDropdown";
import RowActionsDropdown from "./Components/RowActionsDropdown";
import SortableTh from "./Components/SortableTh";

const WORKER = "https://worker-consolidated.maxli5004.workers.dev";

function SummerCampTable({ registrations, setRegistrations, buildHeaders }) {
  const [sortColumn, setSortColumn] = useState("registeredAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selected, setSelected] = useState(() => new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [individualActionsOpen, setIndividualActionsOpen] = useState(null);
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);

  const headers = [
    { key: "studentFirst",    label: "First Name" },
    { key: "studentLast",     label: "Last Name" },
    { key: "parentEmail",     label: "Email" },
    { key: "phone",           label: "Phone" },
    { key: "weeks",           label: "Weeks" },
    { key: "totalWeeks",      label: "# Weeks" },
    { key: "discountApplied", label: "Discount" },
    { key: "amountPaid",      label: "Amount Paid" },
    { key: "registeredAt",    label: "Registered" },
  ];

  // close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);

  // sorting
  const sorted = [...(registrations || [])].sort((a, b) => {
    const av = (a?.data?.[sortColumn] ?? "").toString().toLowerCase();
    const bv = (b?.data?.[sortColumn] ?? "").toString().toLowerCase();
    if (av < bv) return sortDirection === "asc" ? -1 : 1;
    if (av > bv) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  // selection
  const toggleSelect = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => {
      const allKeys = new Set((registrations || []).map((r) => r.key));
      const hasUnselected = [...allKeys].some((k) => !prev.has(k));
      return hasUnselected ? allKeys : new Set();
    });
  };

  // delete
  const performDelete = async (keys) => {
    if (!keys.length) return;
    setLoading(true);
    try {
      const hdrs = await buildHeaders();
      const res = await fetch(`${WORKER}/delete-summer-camp-registration`, {
        method: "DELETE",
        headers: hdrs,
        body: JSON.stringify({ keys }),
      });
      if (res.ok) {
        const keySet = new Set(keys);
        setRegistrations((prev) => prev.filter((r) => !keySet.has(r.key)));
        setSelected((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });
        setActionsOpen(false);
        setIndividualActionsOpen(null);
      } else {
        alert("Delete failed — check console.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error during delete.");
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents) => {
    if (!cents) return "—";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return iso.slice(0, 10);
  };

  const bulkItems = [
    {
      label: "Delete",
      onClick: () => performDelete(Array.from(selected)),
      disabled: selected.size === 0,
    },
  ];

  return (
    <div className="ct-client-table-container">
      <div className="ct-stats-bar">
        <span className="ct-stat">{(registrations || []).length} <span className="ct-stat-label">registrations</span></span>
        <span className="ct-stat-divider" />
        <span className="ct-stat">{selected.size} <span className="ct-stat-label">selected</span></span>
      </div>

      <div className="ct-toolbar">
        <span className="ct-selected-count">Summer Camp 2026</span>
        <BulkActionsDropdown
          actionsRef={actionsRef}
          open={actionsOpen}
          setOpen={setActionsOpen}
          loading={loading}
          selectedCount={selected.size}
          items={bulkItems}
        />
        {selected.size > 0 && <span className="ct-selected-count">{selected.size} selected</span>}
      </div>

      <div className="ct-table-wrap ct-table-wrap--force-mobile">
      <table className="ct-client-table">
        <thead>
          <tr>
            <th className="ct-small">
              <button className="select-all-button" onClick={selectAll}>
                All
              </button>
            </th>

            {headers.map((h) => (
              <SortableTh
                key={h.key}
                label={h.label}
                sortKey={h.key}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            ))}

            <th className="ct-small"></th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((reg, index) => (
            <tr key={reg.key ?? index} className="ct-regular">
              <td className="ct-small">
                <input
                  type="checkbox"
                  checked={selected.has(reg.key)}
                  onChange={() => toggleSelect(reg.key)}
                />
              </td>

              <td>{reg.data?.studentFirst}</td>
              <td>{reg.data?.studentLast}</td>
              <td>{reg.data?.parentEmail}</td>
              <td>{reg.data?.phone}</td>
              <td style={{ maxWidth: 260, fontSize: 12 }}>{reg.data?.weeks}</td>
              <td style={{ textAlign: "center" }}>{reg.data?.totalWeeks}</td>
              <td style={{ textAlign: "center" }}>
                {reg.data?.discountApplied ? "Yes · 15%" : "No"}
              </td>
              <td>{formatAmount(reg.data?.amountPaid)}</td>
              <td>{formatDate(reg.data?.registeredAt)}</td>

              <td className="ct-small">
                <RowActionsDropdown
                  open={individualActionsOpen === index}
                  onToggle={() =>
                    setIndividualActionsOpen((prev) => (prev === index ? null : index))
                  }
                  onClose={() => setIndividualActionsOpen(null)}
                  loading={loading}
                  items={[
                    {
                      label: "Delete",
                      onClick: () => performDelete([reg.key]),
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export default SummerCampTable;
