import React, { useState, useEffect, useRef } from "react";
import "./Stylesheets/ClientTable.css";
import AddLead from "./AddLead";
import EmailComposer from "./Components/EmailComposer";
import TextComposer from "./Components/TextComposer";
import NotesModal from "./Components/NotesModal";

// ✅ outsourced component
import RowActionsDropdown from "./Components/RowActionsDropdown";

function parseNotes(raw) {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [{ text: raw.trim(), timestamp: null, author: "legacy" }] : [];
  if (Array.isArray(raw)) return raw;
  return [];
}

function LeadsTable({
  setConvertToClientData,
  leads,
  setLeads,
  setShowClientForm,
  setClientFormData, // (kept in signature if you need later)
  token,             // (kept for parity)
  user,              // (kept for parity)
  buildHeaders,      // <-- from App
}) {
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});

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
    setLeads((prev) =>
      prev.map((l) => (l.key === key ? { ...l, data: { ...l.data, notes: updatedNotes } } : l))
    );
  };

  // ✅ SORTING
  const [sortColumn, setSortColumn] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

  const sortLeads = (leadsArr, column, direction) => {
    return [...(leadsArr || [])].sort((a, b) => {
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

  useEffect(() => {
    setLeads(sortLeads(leads, sortColumn, sortDirection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortDirection]);

  // selection + bulk actions state
  const [selected, setSelected] = useState(() => new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);

  // ✅ per-row actions dropdown state
  const [rowActionsOpen, setRowActionsOpen] = useState(null);

  // ✅ single-recipient selection for individual dropdown actions
  const [individualSelection, setIndividualSelection] = useState(null);

  // email/text modals
  const [textOpen, setTextOpen] = useState(false);
  const [textBody, setTextBody] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [textSending, setTextSending] = useState(false);

  // Close BULK dropdown when clicking outside + handle Escape
  useEffect(() => {
    const onDocClick = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setActionsOpen(false);
        setRowActionsOpen(null);
      }
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

  // selection helpers
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
      const allKeys = new Set((leads || []).map((lead) => lead.key));
      const hasUnselected = [...allKeys].some((key) => !prev.has(key));
      return hasUnselected ? allKeys : new Set();
    });
  };

  const clearSelection = () => setSelected(new Set());

  // --- bulk send actions ---
  const handleSendText = () => {
    const keys = Array.from(selected);
    if (!keys.length) {
      alert("Select at least one lead to text.");
      return;
    }
    setIndividualSelection(null);
    setActionsOpen(false);
    setRowActionsOpen(null);
    setTextOpen(true);
  };

  const handleSendEmail = () => {
    const keys = Array.from(selected);
    if (!keys.length) {
      alert("Select at least one lead to email.");
      return;
    }
    setIndividualSelection(null);
    setActionsOpen(false);
    setRowActionsOpen(null);
    setEmailOpen(true);
  };

  // --- individual (row) send actions ---
  const handleRowSendText = (key) => {
    setIndividualSelection(key);
    setActionsOpen(false);
    setRowActionsOpen(null);
    setTextOpen(true);
  };

  const handleRowSendEmail = (key) => {
    setIndividualSelection(key);
    setActionsOpen(false);
    setRowActionsOpen(null);
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
      const headers =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      headers.set("Content-Type", "application/json");

      for (const recipients of batches) {
        const payload = { message: textBody, recipients, listType: "leads" };

        const res = await fetch("https://worker-consolidated.maxli5004.workers.dev/text", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const responseText = await res.text().catch(() => "");
        if (!res.ok) {
          console.error("Text API error (leads batch):", res.status, "body:", responseText);
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
      const headers =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      headers.set("Content-Type", "application/json");

      for (const recipients of batches) {
        const payload = {
          subject: emailSubject,
          body: emailBody,
          message: emailBody,
          recipients,
          listType: "leads",
        };

        const res = await fetch("https://worker-consolidated.maxli5004.workers.dev/email", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const responseText = await res.text().catch(() => "");
        if (!res.ok) {
          console.error("Email API error (leads batch):", res.status, "body:", responseText);
          alert("Some email batches failed — check console for details.");
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

  // edit/save
  const handleEditClick = (index, leadData) => {
    setEditingRow(index);
    setEditedData(leadData);
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const handleInputChange = (e, field) => {
    const { value } = e.target;
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async (key) => {
    try {
      const headers = await buildHeaders();
      const res = await fetch("https://worker-consolidated.maxli5004.workers.dev/edit-lead", {
        method: "POST",
        headers,
        body: JSON.stringify({ key, data: editedData }),
      });

      if (res.ok) {
        setLeads((prevLeads) =>
          prevLeads.map((lead) => (lead.key === key ? { ...lead, data: { ...editedData } } : lead))
        );
        handleCancelEdit();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Error saving changes", err);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  // delete (supports single or array)
  const handleDelete = async (keyOrKeys) => {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    if (!keys.length) return;

    const confirmMsg =
      keys.length === 1
        ? "Are you sure you want to delete this record?"
        : `Delete ${keys.length} selected lead(s)? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const headers = await buildHeaders();
      const res = await fetch("https://worker-consolidated.maxli5004.workers.dev/delete-lead", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ keys }),
      });

      if (res.ok) {
        const keySet = new Set(keys);
        setLeads((prevLeads) => prevLeads.filter((lead) => !keySet.has(lead.key)));

        setSelected((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });

        setActionsOpen(false);
        setRowActionsOpen(null);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Error deleting record(s):", err);
        alert("Delete failed — check console for details.");
      }
    } catch (error) {
      console.error("Network error deleting record(s):", error);
      alert("Network error during delete. See console.");
    } finally {
      setLoading(false);
    }
  };

  // convert + contacted
  const handleConvertToClient = (lead) => {
    setConvertToClientData(lead.data);
    setShowClientForm(true);
  };

  const handleMarkContacted = () => {
    const keys = Array.from(selected);
    if (!keys.length) return alert("Select at least one lead to mark.");
    setLeads((prev) =>
      prev.map((l) => (selected.has(l.key) ? { ...l, data: { ...l.data, contacted: true } } : l))
    );
    clearSelection();
    setActionsOpen(false);
  };

  return (
    <div className="ct-client-table-container">
      {notesOpen && (
        <NotesModal
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          recordKey={notesKey}
          recordType="lead"
          rawNotes={notesRaw}
          onNotesUpdated={handleNotesUpdated}
          buildHeaders={buildHeaders}
        />
      )}

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

      <h1>Leads</h1>

      {/* Toolbar with Actions dropdown */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div ref={actionsRef} style={{ position: "relative" }}>
          <button
            className="mass-actions-btn"
            onClick={() => setActionsOpen((s) => !s)}
            title={selected.size === 0 ? "Select rows to enable actions" : `${selected.size} selected`}
            disabled={loading}
            aria-expanded={actionsOpen}
            aria-haspopup="menu"
          >
            Actions ▾
          </button>

          {actionsOpen && (
            <div className="actions-dropdown" role="menu">
              <button
                className="dropdown-item"
                onClick={handleSendEmail}
                disabled={loading || selected.size === 0}
                aria-disabled={selected.size === 0}
              >
                Send Email
              </button>

              <button
                className="dropdown-item"
                onClick={handleSendText}
                disabled={loading || selected.size === 0}
                aria-disabled={selected.size === 0}
              >
                Send Text
              </button>

              <button
                className="dropdown-item"
                onClick={() => handleDelete(Array.from(selected))}
                disabled={loading || selected.size === 0}
                aria-disabled={selected.size === 0}
              >
                Delete
              </button>

              <button
                className="dropdown-item"
                onClick={handleMarkContacted}
                disabled={loading || selected.size === 0}
              >
                Mark as Contacted
              </button>

              <div style={{ padding: "6px 12px", fontSize: 12, color: "#666" }}>
                {selected.size === 0 ? "No rows selected" : `${selected.size} selected`}
              </div>
            </div>
          )}
        </div>

        {selected.size > 0 && <div style={{ fontSize: 14 }}>{selected.size} selected</div>}
      </div>

      <table className="ct-client-table">
        <thead>
          <tr>
            <th className="small">
              <button className="select-all-button" onClick={() => selectAll()}>
                Select <br /> All
              </button>
            </th>

            <th className="small"></th>

            <th onClick={() => handleSort("firstName")}>
              <div className="ct-header">
                <div className="ct-table-header">
                  <p>First Name</p>
                </div>
                <div className="ct-header-arrow">
                  {sortColumn === "firstName" && (sortDirection === "asc" ? "↓" : "↑")}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort("lastName")}>
              <div className="ct-header">
                <div className="ct-table-header">Last Name</div>
                <div className="ct-header-arrow">
                  {sortColumn === "lastName" && (sortDirection === "asc" ? "↓" : "↑")}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort("email")}>
              <div className="ct-header">
                <div className="ct-table-header">Email</div>
                <div className="ct-header-arrow">
                  {sortColumn === "email" && (sortDirection === "asc" ? "↓" : "↑")}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort("phone")}>
              <div className="ct-header">
                <div className="ct-table-header">Phone</div>
                <div className="ct-header-arrow">
                  {sortColumn === "phone" && (sortDirection === "asc" ? "↓" : "↑")}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort("notes")}>
              <div className="ct-header">
                <div className="ct-table-header">Notes</div>
                <div className="ct-header-arrow">
                  {sortColumn === "notes" && (sortDirection === "asc" ? "↓" : "↑")}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort("createdAt")}>
              <div className="ct-header">
                <div className="ct-table-header">TimeStamp</div>
                <div className="ct-header-arrow">
                  {sortColumn === "createdAt" && (sortDirection === "asc" ? "↓" : "↑")}
                </div>
              </div>
            </th>

            {/* single actions column */}
            <th className="small"></th>
          </tr>
        </thead>

        <tbody>
          {leads
            ?.filter((lead) => lead && lead.data)
            .map((lead, index) => (
              <tr key={lead.key ?? index}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(lead.key)}
                    onChange={() => toggleSelect(lead.key)}
                  />
                </td>

                <td className="small">
                  {editingRow === index ? (
                    <>
                      <button className="save-btn" onClick={() => handleSaveChanges(lead.key)}>
                        ✅
                      </button>
                      <button className="cancel-btn" onClick={handleCancelEdit}>
                        ❌
                      </button>
                    </>
                  ) : (
                    <button className="edit-btn" onClick={() => handleEditClick(index, lead.data)}>
                      ✏️
                    </button>
                  )}
                </td>

                {editingRow === index ? (
                  <>
                    <td>
                      <input
                        type="text"
                        value={editedData.firstName || ""}
                        onChange={(e) => handleInputChange(e, "firstName")}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={editedData.lastName || ""}
                        onChange={(e) => handleInputChange(e, "lastName")}
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        value={editedData.email || ""}
                        onChange={(e) => handleInputChange(e, "email")}
                      />
                    </td>
                    <td>
                      <input
                        type="tel"
                        value={editedData.phone || ""}
                        onChange={(e) => handleInputChange(e, "phone")}
                      />
                    </td>
                    <td>
                      <button className="nm-notes-btn" onClick={() => openNotes(lead.key, lead.data.notes)}>
                        {(() => { const n = parseNotes(lead.data.notes); return n.length > 0 ? `📝 ${n.length} · ${n[n.length-1].text.slice(0,40)}${n[n.length-1].text.length > 40 ? "…" : ""}` : "+ Add Note"; })()}
                      </button>
                    </td>
                    <td>
                      {lead.data.createdAt
                        ? (() => {
                            const d = new Date(lead.data.createdAt);
                            if (isNaN(d)) return "";
                            const month = d.toLocaleString("en-US", { month: "short" }).toLowerCase();
                            const day = String(d.getDate()).padStart(2, "0");
                            const year = d.getFullYear();
                            return `${month}-${day}-${year}`;
                          })()
                        : ""}
                    </td>
                  </>
                ) : (
                  <>
                    <td><p>{lead.data.firstName}</p></td>
                    <td>{lead.data.lastName}</td>
                    <td>{lead.data.email}</td>
                    <td>{lead.data.phone}</td>
                    <td>
                      <button className="nm-notes-btn" onClick={() => openNotes(lead.key, lead.data.notes)}>
                        {(() => { const n = parseNotes(lead.data.notes); return n.length > 0 ? `📝 ${n.length} · ${n[n.length-1].text.slice(0,40)}${n[n.length-1].text.length > 40 ? "…" : ""}` : "+ Add Note"; })()}
                      </button>
                    </td>
                    <td>
                      {lead.data.createdAt
                        ? (() => {
                            const d = new Date(lead.data.createdAt);
                            if (isNaN(d)) return "";
                            const month = d.toLocaleString("en-US", { month: "short" }).toLowerCase();
                            const day = String(d.getDate()).padStart(2, "0");
                            const year = d.getFullYear();
                            return `${month}-${day}-${year}`;
                          })()
                        : ""}
                    </td>
                  </>
                )}

                {/* ✅ row dropdown with ALL options incl. email/text */}
                <td className="small">
                  <RowActionsDropdown
                    open={rowActionsOpen === index}
                    onToggle={() => setRowActionsOpen((prev) => (prev === index ? null : index))}
                    onClose={() => setRowActionsOpen(null)}
                    loading={loading}
                    items={[
                      { label: "Edit", onClick: () => handleEditClick(index, lead.data) },
                      { label: "Send Email", onClick: () => handleRowSendEmail(lead.key) },
                      { label: "Send Text", onClick: () => handleRowSendText(lead.key) },
                      { label: "Convert to Client", onClick: () => handleConvertToClient(lead) },
                      { label: "Delete", onClick: () => handleDelete(lead.key) },
                    ]}
                  />
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <AddLead setLeads={setLeads} buildHeaders={buildHeaders} />
    </div>
  );
}

export default LeadsTable;