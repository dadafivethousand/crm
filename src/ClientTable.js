import React, { useState, useEffect, useRef } from "react";
import "./Stylesheets/ClientTable.css";

import EmailComposer from "./Components/EmailComposer";
import TextComposer from "./Components/TextComposer";
import DeleteOptionsModal from "./Components/DeleteOptionsModal";
import NotesModal from "./Components/NotesModal";

// ✅ outsourced components (Option A: items-driven)
import BulkActionsDropdown from "./Components/BulkActionsDropdown";
import RowActionsDropdown from "./Components/RowActionsDropdown";
import SortableTh from "./Components/SortableTh";

function getMembershipStatus(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 14) return "expiring";
  return "active";
}

function parseNotes(raw) {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [{ text: raw.trim(), timestamp: null, author: "legacy" }] : [];
  if (Array.isArray(raw)) return raw;
  return [];
}

function ClientTable({
  membershipInfo,
  clients,
  setClients,
  token, // still accepted if used elsewhere
  user,  // still accepted if used elsewhere
  buildHeaders,
}) {
  const [search, setSearch] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortColumn, setSortColumn] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

  // notes modal state
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesKey, setNotesKey] = useState(null);
  const [notesRaw, setNotesRaw] = useState(null);

  const openNotes = (key, raw) => {
    setNotesKey(key);
    setNotesRaw(raw);
    setNotesOpen(true);
  };

  const handleNotesUpdated = (key, updatedNotes) => {
    setNotesRaw(updatedNotes);
    setClients((prev) =>
      prev.map((c) => (c.key === key ? { ...c, data: { ...c.data, paymentStatus: updatedNotes } } : c))
    );
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState([]);

  // selection + actions state
  const [individualSelection, setIndividualSelection] = useState(null);
  const [selected, setSelected] = useState(() => new Set());

  const [actionsOpen, setActionsOpen] = useState(false);
  const [individualActionsOpen, setIndividualActionsOpen] = useState(null); // row index or null
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);

  // email / text modals
  const [textOpen, setTextOpen] = useState(false);
  const [textBody, setTextBody] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [textSending, setTextSending] = useState(false);

  const headers = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "membershipDuration", label: "Duration" },
    { key: "paymentStatus", label: "Notes" },
  ];

  // Close BULK actions dropdown on outside click + Escape
  useEffect(() => {
    const onDocClick = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setActionsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // --- sorting ---
  useEffect(() => {
    setClients(sortClients(clients, sortColumn, sortDirection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortDirection]);

  const sortClients = (clientsArr, column, direction) => {
    return [...(clientsArr || [])].sort((a, b) => {
      const av = a?.data?.[column];
      const bv = b?.data?.[column];
      const valueA = (av ?? "").toString().toLowerCase();
      const valueB = (bv ?? "").toString().toLowerCase();
      if (valueA < valueB) return direction === "asc" ? -1 : 1;
      if (valueA > valueB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const updateEndDate = (duration, membershipInfoArg, startDate) => {
    if (!startDate || !membershipInfoArg?.info?.length) return "";
    const date = new Date(startDate);
    const match = membershipInfoArg.info.find((m) => m.description === duration);
    if (match?.duration) {
      date.setMonth(date.getMonth() + match.duration);
      return date.toISOString().split("T")[0];
    }
    return "";
  };

  const handleInputChange = (e, field) => {
    const { value } = e.target;
    setEditedData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "membershipDuration" || field === "startDate") {
        updated.endDate = updateEndDate(
          field === "membershipDuration" ? value : prev.membershipDuration,
          membershipInfo,
          field === "startDate" ? value : prev.startDate
        );
      }
      return updated;
    });
  };

  const handleEditClick = (index, data) => {
    setEditingRow(index);
    setEditedData(data);
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const handleSaveChanges = async (key) => {
    try {
      const baseHeaders = await buildHeaders();
      const headersObj =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      const res = await fetch(
        "https://worker-consolidated.maxli5004.workers.dev/edit-client",
        {
          method: "POST",
          headers: headersObj,
          body: JSON.stringify({ key, data: editedData }),
        }
      );

      if (res.ok) {
        setClients((prev) =>
          prev.map((c) => (c.key === key ? { ...c, data: editedData } : c))
        );
        handleCancelEdit();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Error saving changes:", err);
      }
    } catch (err) {
      console.error("Error saving changes:", err);
    }
  };

  // --- selection helpers ---
  const adultClients = (clients || []).filter(
    (client) => client?.data && !client.data.kidsMembership
  );

  const filteredClients = search.trim()
    ? adultClients.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.data?.firstName?.toLowerCase().includes(q) ||
          c.data?.lastName?.toLowerCase().includes(q) ||
          c.data?.email?.toLowerCase().includes(q) ||
          c.data?.phone?.toLowerCase().includes(q)
        );
      })
    : adultClients;

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
      const allKeys = new Set(adultClients.map((c) => c.key));
      const hasUnselected = [...allKeys].some((key) => !prev.has(key));
      return hasUnselected ? allKeys : new Set();
    });
  };

  // --- delete modal flow ---
  const requestDelete = (keyOrKeys) => {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    if (!keys.length) return;
    setPendingDeleteKeys(keys);
    setDeleteOpen(true);
  };

  const cancelDelete = () => {
    if (loading) return;
    setDeleteOpen(false);
    setPendingDeleteKeys([]);
  };

  const confirmDelete = async (saveAsLead = false) => {
    const keys = pendingDeleteKeys;
    setDeleteOpen(false);
    setPendingDeleteKeys([]);
    await performDelete({ keys, saveAsLead });
  };

  const performDelete = async ({ keys, saveAsLead }) => {
    if (!keys.length) return;

    setLoading(true);
    try {
      const baseHeaders = await buildHeaders();
      const headersObj =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      headersObj.set("Content-Type", "application/json");

      const res = await fetch(
        "https://worker-consolidated.maxli5004.workers.dev/delete-client",
        {
          method: "DELETE",
          headers: headersObj,
          body: JSON.stringify({ keys, saveAsLead }),
        }
      );

      if (res.ok) {
        const keySet = new Set(keys);

        setClients((prev) => prev.filter((c) => !keySet.has(c.key)));

        setSelected((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });

        setActionsOpen(false);
        setIndividualActionsOpen(null);
      } else {
        const errText = await res.text().catch(() => "");
        console.error("Delete failed:", res.status, errText);
        alert("Delete failed — check console for details.");
      }
    } catch (err) {
      console.error("Network error during delete:", err);
      alert("Network error during delete. See console.");
    } finally {
      setLoading(false);
    }
  };

  // --- do-not-email toggle ---
  // Commented out: doNotMail is set automatically by the webhook for subscriptions
  // (subscriptions auto-renew via Stripe so no reminder needed). Only relevant
  // for term memberships where automated renewal reminders are sent.
  // const handleNoEmail = async (key) => { ... };

  // --- text/email actions (bulk or single) ---
  const handleSendText = (key) => {
    const keys = Array.from(selected);

    if (key != null) setIndividualSelection(key);

    if (!keys.length && key == null) {
      alert("Select at least one client to text.");
      return;
    }

    setActionsOpen(false);
    setIndividualActionsOpen(null);
    setTextOpen(true);
  };

  const handleSendEmail = (key) => {
    if (key != null) {
      setIndividualSelection(key);
      setActionsOpen(false);
      setIndividualActionsOpen(null);
      setEmailOpen(true);
      return;
    }

    if (!selected.size) {
      alert("Select at least one client to email.");
      return;
    }

    setIndividualSelection(null);
    setActionsOpen(false);
    setIndividualActionsOpen(null);
    setEmailOpen(true);
  };

  const submitText = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const allRecipients =
      individualSelection != null ? [individualSelection] : Array.from(selected);

    if (!allRecipients.length) {
      alert("No recipients selected.");
      setTextOpen(false);
      return;
    }
    if (!textBody || !textBody.trim()) {
      alert("Please enter a message.");
      return;
    }

    const BATCH_SIZE = 25;
    const batches = [];
    for (let i = 0; i < allRecipients.length; i += BATCH_SIZE) {
      batches.push(allRecipients.slice(i, i + BATCH_SIZE));
    }

    setTextSending(true);
    try {
      const baseHeaders = await buildHeaders();
      const headersObj =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      headersObj.set("Content-Type", "application/json");

      for (const recipients of batches) {
        const payload = {
          message: textBody,
          recipients,
          listType: "clients",
        };

        const res = await fetch(
          "https://worker-consolidated.maxli5004.workers.dev/text",
          {
            method: "POST",
            headers: headersObj,
            body: JSON.stringify(payload),
          }
        );

        const responseText = await res.text().catch(() => "");
        if (!res.ok) {
          console.error("Text API error status:", res.status, "body:", responseText);
          alert("Some text batches failed — check console for details.");
          break;
        }
      }

      alert("Texts queued/sent (batched).");
      setTextBody("");
      setIndividualSelection(null);
      setTextOpen(false);
    } catch (err) {
      console.error("Network error sending text:", err);
      alert("Network error sending text — see console.");
    } finally {
      setTextSending(false);
    }
  };

  const submitEmail = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const allRecipients =
      individualSelection != null ? [individualSelection] : Array.from(selected);

    if (!allRecipients.length) {
      alert("No recipients selected.");
      setEmailOpen(false);
      return;
    }
    if (!emailSubject.trim()) {
      alert("Please enter a subject.");
      return;
    }
    if (!emailBody.trim()) {
      alert("Please enter a message.");
      return;
    }

    const BATCH_SIZE = 25;
    const batches = [];
    for (let i = 0; i < allRecipients.length; i += BATCH_SIZE) {
      batches.push(allRecipients.slice(i, i + BATCH_SIZE));
    }

    setEmailSending(true);
    try {
      const baseHeaders = await buildHeaders();
      const headersObj =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      headersObj.set("Content-Type", "application/json");

      for (const recipients of batches) {
        const payload = {
          subject: emailSubject,
          body: emailBody,
          message: emailBody,
          recipients,
          listType: "clients",
        };

        const res = await fetch(
          "https://worker-consolidated.maxli5004.workers.dev/email",
          {
            method: "POST",
            headers: headersObj,
            body: JSON.stringify(payload),
          }
        );

        const responseText = await res.text().catch(() => "");
        if (!res.ok) {
          console.error("Email API error status:", res.status, "body:", responseText);
          alert("Some batches failed — check console for details.");
          break;
        }
      }

      alert("Emails queued/sent (batched).");
      setEmailSubject("");
      setEmailBody("");
      setIndividualSelection(null);
      setEmailOpen(false);
    } catch (err) {
      console.error("Network error sending email:", err);
      alert("Network error sending email — see console.");
    } finally {
      setEmailSending(false);
    }
  };

  // Convenience: bulk dropdown items (Option A)
  const bulkItems = [
    {
      label: "Send Email",
      onClick: () => handleSendEmail(null),
      disabled: selected.size === 0,
    },
    {
      label: "Send Text",
      onClick: () => handleSendText(null),
      disabled: selected.size === 0,
    },
    {
      label: "Delete",
      onClick: () => requestDelete(Array.from(selected)),
      disabled: selected.size === 0,
    },
  ];

  return (
    <div className="ct-client-table-container">
      {notesOpen && (
        <NotesModal
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          recordKey={notesKey}
          recordType="client"
          rawNotes={notesRaw}
          onNotesUpdated={handleNotesUpdated}
          buildHeaders={buildHeaders}
        />
      )}

      <DeleteOptionsModal
        open={deleteOpen}
        loading={loading}
        count={pendingDeleteKeys.length}
        onCancel={cancelDelete}
        onDelete={() => confirmDelete(false)}
        onDeleteAndSaveAsLead={() => confirmDelete(true)}
      />

      {/* Modals */}
      {emailOpen && (
        <EmailComposer
          open={emailOpen}
          onClose={() => {
            setEmailOpen(false);
            setIndividualSelection(null);
          }}
          onSend={submitEmail}
          sending={emailSending}
          subject={emailSubject}
          setSubject={setEmailSubject}
          body={emailBody}
          setBody={setEmailBody}
          selectedCount={individualSelection != null ? 1 : selected.size}
        />
      )}

      {textOpen && (
        <TextComposer
          open={textOpen}
          onClose={() => {
            setTextOpen(false);
            setIndividualSelection(null);
          }}
          onSend={submitText}
          sending={textSending}
          message={textBody}
          setMessage={setTextBody}
          selectedCount={individualSelection != null ? 1 : selected.size}
        />
      )}

      {/* Toolbar: search + bulk actions */}
      <div className="ct-toolbar">
        <div className="ct-search-wrap">
          <span className="ct-search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            className="ct-search-input"
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <BulkActionsDropdown
          actionsRef={actionsRef}
          open={actionsOpen}
          setOpen={setActionsOpen}
          loading={loading}
          selectedCount={selected.size}
          items={bulkItems}
        />
        {selected.size > 0 && (
          <span className="ct-selected-count">{selected.size} selected</span>
        )}
      </div>

      <table className="ct-client-table">
        <thead>
          <tr>
            <th className="ct-small">
              <button className="select-all-button" onClick={selectAll}>
                Select All
              </button>
            </th>

            <th className="ct-small"></th>

            {headers.map((h) => (
              <SortableTh
                key={h.key}
                label={h.label}
                sortKey={h.key}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className={`ct-th-${h.key}`}
              />
            ))}

            <th className="ct-small"></th>
          </tr>
        </thead>

        <tbody>
          {filteredClients.length === 0 && (
            <tr>
              <td colSpan={headers.length + 3}>
                <div className="ct-empty-state">
                  <svg className="ct-empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <p className="ct-empty-text">
                    {search.trim() ? "No clients match your search" : "No clients yet"}
                  </p>
                </div>
              </td>
            </tr>
          )}
          {filteredClients.map((client, index) => (
            <tr
              key={client.key ?? index}
              className={
                client.data?.endDate && new Date() > new Date(client.data.endDate)
                  ? "ct-red"
                  : "ct-regular"
              }
            >
              <td className="ct-small">
                <input
                  type="checkbox"
                  checked={selected.has(client.key)}
                  onChange={() => toggleSelect(client.key)}
                />
              </td>

              <td className="ct-small">
                {editingRow === index ? (
                  <div className="ct-button-flex">
                    <button type="button" className="ct-save-btn" onClick={() => handleSaveChanges(client.key)}>
                      Save
                    </button>
                    <button type="button" className="ct-cancel-btn" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="ct-button-flex">
                    <button type="button" className="ct-edit-btn" onClick={() => handleEditClick(index, client.data)} title="Edit">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                )}
              </td>

              {editingRow === index ? (
                <>
                  {headers.map((header) => (
                    <td key={header.key}>
                      {header.key === "paymentStatus" ? (() => {
                        const n = parseNotes(client.data?.paymentStatus);
                        const hasNotes = n.length > 0;
                        return (
                          <button className="nm-notes-btn" data-has-notes={hasNotes} onClick={() => openNotes(client.key, client.data?.paymentStatus)}>
                            {hasNotes ? `${n.length} note${n.length !== 1 ? "s" : ""} · ${n[n.length-1].text.slice(0,36)}${n[n.length-1].text.length > 36 ? "…" : ""}` : "+ Add note"}
                          </button>
                        );
                      })() : header.key === "membershipDuration" ? (
                        <select
                          value={editedData[header.key] || ""}
                          onChange={(e) => handleInputChange(e, header.key)}
                        >
                          {membershipInfo?.info?.map((m) =>
                            !m.free && m.description && m.duration ? (
                              <option key={m.description} value={m.description}>
                                {m.description}
                              </option>
                            ) : null
                          )}
                        </select>
                      ) : (
                        <input
                          type={header.key.includes("Date") ? "date" : "text"}
                          value={editedData[header.key] || ""}
                          onChange={(e) => handleInputChange(e, header.key)}
                        />
                      )}
                    </td>
                  ))}
                </>
              ) : (
                <>
                  {headers.map((header) => (
                    <td className="ct-content" key={header.key}>
                      {header.key === "paymentStatus" ? (() => {
                        const n = parseNotes(client.data?.paymentStatus);
                        const hasNotes = n.length > 0;
                        const label = hasNotes
                          ? `${n.length} note${n.length !== 1 ? "s" : ""} · ${n[n.length - 1].text.slice(0, 36)}${n[n.length - 1].text.length > 36 ? "…" : ""}`
                          : "+ Add note";
                        return (
                          <button
                            className="nm-notes-btn"
                            data-has-notes={hasNotes}
                            onClick={() => openNotes(client.key, client.data?.paymentStatus)}
                          >
                            {label}
                          </button>
                        );
                      })() : header.key === "firstName" ? (
                        <div className="ct-name-cell">
                          <div className="ct-avatar">
                            {(client.data?.firstName?.[0] || "").toUpperCase()}
                            {(client.data?.lastName?.[0] || "").toUpperCase()}
                          </div>
                          <span>{client.data?.firstName}</span>
                        </div>
                      ) : header.key === "endDate" ? (
                        <div className="ct-date-cell">
                          <span>{client.data?.[header.key]}</span>
                          {getMembershipStatus(client.data?.endDate) === "expired" && (
                            <span className="status-badge status-expired">Expired</span>
                          )}
                        </div>
                      ) : (
                        client.data?.[header.key]
                      )}
                    </td>
                  ))}
                </>
              )}

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
                      label: "Edit",
                      onClick: () => handleEditClick(index, client.data),
                    },
                    {
                      label: "Send Email",
                      onClick: () => handleSendEmail(client.key),
                    },
                    {
                      label: "Send Text",
                      onClick: () => handleSendText(client.key),
                    },
                    {
                      label: "Delete",
                      onClick: () => requestDelete(client.key),
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ClientTable;