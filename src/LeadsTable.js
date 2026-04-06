import React, { useState, useEffect, useRef, useMemo } from "react";
import "./Stylesheets/ClientTable.css";
import AddLead from "./AddLead";
import EmailComposer from "./Components/EmailComposer";
import TextComposer from "./Components/TextComposer";
import NotesModal from "./Components/NotesModal";
import DeleteOptionsModal from "./Components/DeleteOptionsModal";
import RowActionsDropdown from "./Components/RowActionsDropdown";
import { useToast } from "./Components/Toast";
import { formatDateTime } from "./dateUtils";

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
  setClientFormData,
  token,
  user,
  buildHeaders,
  readOnly,
}) {
  const toast = useToast();

  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [search, setSearch] = useState("");

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

  const [sortColumn, setSortColumn] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const filteredLeads = useMemo(() => {
    let arr = (leads || []).filter((l) => l && l.data);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (l) =>
          l.data?.firstName?.toLowerCase().includes(q) ||
          l.data?.lastName?.toLowerCase().includes(q) ||
          l.data?.email?.toLowerCase().includes(q) ||
          l.data?.phone?.toLowerCase().includes(q)
      );
    }
    return [...arr].sort((a, b) => {
      const av = (a?.data?.[sortColumn] ?? "").toString().toLowerCase();
      const bv = (b?.data?.[sortColumn] ?? "").toString().toLowerCase();
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [leads, search, sortColumn, sortDirection]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState([]);

  const [selected, setSelected] = useState(() => new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);

  const [rowActionsOpen, setRowActionsOpen] = useState(null);
  const [individualSelection, setIndividualSelection] = useState(null);

  const [textOpen, setTextOpen] = useState(false);
  const [textBody, setTextBody] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [textSending, setTextSending] = useState(false);

  // Close dropdowns on outside click + Escape
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

  // Escape cancels inline edit
  useEffect(() => {
    if (editingRow === null) return;
    const onKey = (e) => { if (e.key === "Escape") handleCancelEdit(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editingRow]);

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
      const allKeys = new Set(filteredLeads.map((l) => l.key));
      const hasUnselected = [...allKeys].some((key) => !prev.has(key));
      return hasUnselected ? allKeys : new Set();
    });
  };

  const clearSelection = () => setSelected(new Set());

  // --- bulk send actions ---
  const handleSendText = () => {
    if (!selected.size) {
      toast.error("Select at least one lead first.");
      return;
    }
    setIndividualSelection(null);
    setActionsOpen(false);
    setRowActionsOpen(null);
    setTextOpen(true);
  };

  const handleSendEmail = () => {
    if (!selected.size) {
      toast.error("Select at least one lead first.");
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
      toast.error("No recipients selected.");
      setTextOpen(false);
      return;
    }
    if (!textBody || !textBody.trim()) {
      toast.error("Please enter a message.");
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
      const hdrs =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      hdrs.set("Content-Type", "application/json");

      let failed = false;
      for (const recipients of batches) {
        const res = await fetch("https://worker-consolidated.maxli5004.workers.dev/text", {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({ message: textBody, recipients, listType: "leads" }),
        });
        if (!res.ok) {
          console.error("Text API error (leads):", res.status, await res.text().catch(() => ""));
          toast.error("Some texts failed to send.");
          failed = true;
          break;
        }
      }

      if (!failed) {
        toast.success("Texts sent successfully.");
        setTextBody("");
        setIndividualSelection(null);
        setTextOpen(false);
      }
    } catch (err) {
      console.error("Network error sending text:", err);
      toast.error("Network error sending texts.");
    } finally {
      setTextSending(false);
    }
  };

  const submitEmail = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const allRecipients =
      individualSelection != null ? [individualSelection] : Array.from(selected);

    if (!allRecipients.length) {
      toast.error("No recipients selected.");
      setEmailOpen(false);
      return;
    }
    if (!emailSubject.trim()) {
      toast.error("Please enter a subject.");
      return;
    }
    if (!emailBody.trim()) {
      toast.error("Please enter a message.");
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
      const hdrs =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      hdrs.set("Content-Type", "application/json");

      let failed = false;
      for (const recipients of batches) {
        const res = await fetch("https://worker-consolidated.maxli5004.workers.dev/email", {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({
            subject: emailSubject,
            body: emailBody,
            message: emailBody,
            recipients,
            listType: "leads",
          }),
        });
        if (!res.ok) {
          console.error("Email API error (leads):", res.status, await res.text().catch(() => ""));
          toast.error("Some emails failed to send.");
          failed = true;
          break;
        }
      }

      if (!failed) {
        toast.success("Emails sent successfully.");
        setEmailSubject("");
        setEmailBody("");
        setIndividualSelection(null);
        setEmailOpen(false);
      }
    } catch (err) {
      console.error("Network error sending email:", err);
      toast.error("Network error sending emails.");
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
      const hdrs = await buildHeaders();
      const res = await fetch("https://worker-consolidated.maxli5004.workers.dev/edit-lead", {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ key, data: editedData }),
      });

      if (res.ok) {
        setLeads((prevLeads) =>
          prevLeads.map((lead) => (lead.key === key ? { ...lead, data: { ...editedData } } : lead))
        );
        handleCancelEdit();
        toast.success("Changes saved.");
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Error saving changes", err);
        toast.error("Failed to save changes.");
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Network error saving changes.");
    }
  };

  // delete
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

  const confirmDelete = async () => {
    const keys = pendingDeleteKeys;
    setDeleteOpen(false);
    setPendingDeleteKeys([]);
    await performDelete(keys);
  };

  const performDelete = async (keys) => {
    if (!keys.length) return;
    setLoading(true);
    try {
      const hdrs = await buildHeaders();
      const res = await fetch("https://worker-consolidated.maxli5004.workers.dev/delete-lead", {
        method: "DELETE",
        headers: hdrs,
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
        toast.error("Delete failed.");
      }
    } catch (error) {
      console.error("Network error deleting record(s):", error);
      toast.error("Network error during delete.");
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToClient = (lead) => {
    setConvertToClientData(lead.data);
    setShowClientForm(true);
  };

  const handleMarkContacted = () => {
    const keys = Array.from(selected);
    if (!keys.length) {
      toast.error("Select at least one lead first.");
      return;
    }
    setLeads((prev) =>
      prev.map((l) => (selected.has(l.key) ? { ...l, data: { ...l.data, contacted: true } } : l))
    );
    clearSelection();
    setActionsOpen(false);
  };

  // Sortable header helper
  const SortTh = ({ label, sortKey }) => (
    <th onClick={() => handleSort(sortKey)} style={{ cursor: "pointer" }}>
      <div className="ct-header">
        <div className="ct-table-header">{label}</div>
        <div className="ct-header-arrow">
          {sortColumn === sortKey && (sortDirection === "asc" ? "↓" : "↑")}
        </div>
      </div>
    </th>
  );

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
          onClose={() => { setEmailOpen(false); setIndividualSelection(null); }}
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
          onClose={() => { setTextOpen(false); setIndividualSelection(null); }}
          onSend={submitText}
          sending={textSending}
          message={textBody}
          setMessage={setTextBody}
          selectedCount={individualSelection != null ? 1 : selected.size}
        />
      )}

      <DeleteOptionsModal
        open={deleteOpen}
        loading={loading}
        count={pendingDeleteKeys.length}
        onCancel={cancelDelete}
        onDelete={confirmDelete}
        showConvert={false}
      />

      {/* Toolbar */}
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
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!readOnly && (
          <div ref={actionsRef} style={{ position: "relative" }}>
            <button
              className="mass-actions-btn"
              onClick={() => setActionsOpen((s) => !s)}
              disabled={loading}
              aria-expanded={actionsOpen}
              aria-haspopup="menu"
            >
              Actions ▾
            </button>
            {actionsOpen && (
              <div className="actions-dropdown" role="menu">
                <button className="dropdown-item" onClick={handleSendEmail} disabled={loading || selected.size === 0}>Send Email</button>
                <button className="dropdown-item" onClick={handleSendText} disabled={loading || selected.size === 0}>Send Text</button>
                <button className="dropdown-item" onClick={() => requestDelete(Array.from(selected))} disabled={loading || selected.size === 0}>Delete</button>
                <button className="dropdown-item" onClick={handleMarkContacted} disabled={loading || selected.size === 0}>Mark as Contacted</button>
                {selected.size > 0 && (
                  <div className="dropdown-item" style={{ pointerEvents: "none", opacity: 0.6 }}>{selected.size} selected</div>
                )}
              </div>
            )}
          </div>
        )}
        {selected.size > 0 && (
          <span className="ct-selected-count">{selected.size} selected</span>
        )}
      </div>

      {/* Desktop table */}
      <div className="ct-table-wrap">
        <table className="ct-client-table">
          <thead>
            <tr>
              <th className="ct-small">
                <button className="select-all-button" onClick={selectAll}>Select All</button>
              </th>
              {!readOnly && <th className="ct-small"></th>}
              <SortTh label="First Name" sortKey="firstName" />
              <SortTh label="Last Name" sortKey="lastName" />
              <SortTh label="Email" sortKey="email" />
              <SortTh label="Phone" sortKey="phone" />
              <SortTh label="Notes" sortKey="notes" />
              <SortTh label="Date Added" sortKey="createdAt" />
              <th className="ct-small"></th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 8 : 9} className="ct-empty-state">
                  {search ? `No leads match "${search}"` : "No leads yet"}
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead, index) => (
                <tr key={lead.key ?? index}>
                  <td className="ct-small">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.key)}
                      onChange={() => toggleSelect(lead.key)}
                    />
                  </td>

                  {!readOnly && (
                    <td className="ct-small">
                      {editingRow === index ? (
                        <div className="ct-button-flex">
                          <button className="ct-save-btn" onClick={() => handleSaveChanges(lead.key)}>Save</button>
                          <button className="ct-cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                        </div>
                      ) : (
                        <div className="ct-button-flex">
                          <button className="ct-edit-btn" onClick={() => handleEditClick(index, lead.data)} title="Edit">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  )}

                  {editingRow === index ? (
                    <>
                      <td><input type="text" value={editedData.firstName || ""} onChange={(e) => handleInputChange(e, "firstName")} /></td>
                      <td><input type="text" value={editedData.lastName || ""} onChange={(e) => handleInputChange(e, "lastName")} /></td>
                      <td><input type="email" value={editedData.email || ""} onChange={(e) => handleInputChange(e, "email")} /></td>
                      <td><input type="tel" value={editedData.phone || ""} onChange={(e) => handleInputChange(e, "phone")} /></td>
                      <td>
                        {(() => {
                          const n = parseNotes(lead.data.notes);
                          const hasNotes = n.length > 0;
                          return (
                            <button className="nm-notes-btn" data-has-notes={hasNotes} onClick={() => openNotes(lead.key, lead.data.notes)}>
                              {hasNotes ? `${n.length} note${n.length !== 1 ? "s" : ""} · ${n[n.length-1].text.slice(0,36)}${n[n.length-1].text.length > 36 ? "…" : ""}` : "+ Add note"}
                            </button>
                          );
                        })()}
                      </td>
                      <td>{formatDateTime(lead.data.createdAt)}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div className="ct-name-cell">
                          <div className="ct-avatar">
                            {(lead.data?.firstName?.[0] || "").toUpperCase()}
                            {(lead.data?.lastName?.[0] || "").toUpperCase()}
                          </div>
                          <span>{lead.data.firstName}</span>
                        </div>
                      </td>
                      <td>{lead.data.lastName}</td>
                      <td>{lead.data.email}</td>
                      <td>{lead.data.phone}</td>
                      <td>
                        {(() => {
                          const n = parseNotes(lead.data.notes);
                          const hasNotes = n.length > 0;
                          return (
                            <button className="nm-notes-btn" data-has-notes={hasNotes} onClick={() => openNotes(lead.key, lead.data.notes)}>
                              {hasNotes ? `${n.length} note${n.length !== 1 ? "s" : ""} · ${n[n.length-1].text.slice(0,36)}${n[n.length-1].text.length > 36 ? "…" : ""}` : "+ Add note"}
                            </button>
                          );
                        })()}
                      </td>
                      <td>{formatDateTime(lead.data.createdAt)}</td>
                    </>
                  )}

                  <td className="ct-small">
                    <RowActionsDropdown
                      open={rowActionsOpen === index}
                      onToggle={() => setRowActionsOpen((prev) => (prev === index ? null : index))}
                      onClose={() => setRowActionsOpen(null)}
                      loading={loading}
                      items={[
                        ...(!readOnly ? [
                          { label: "Edit", onClick: () => handleEditClick(index, lead.data) },
                          { label: "Send Email", onClick: () => handleRowSendEmail(lead.key) },
                          { label: "Send Text", onClick: () => handleRowSendText(lead.key) },
                          { label: "Convert to Client", onClick: () => handleConvertToClient(lead) },
                          { label: "Delete", onClick: () => requestDelete(lead.key) },
                        ] : [
                          { label: "Send Email", onClick: () => handleRowSendEmail(lead.key) },
                          { label: "Send Text", onClick: () => handleRowSendText(lead.key) },
                        ]),
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="ct-card-list">
        {filteredLeads.length === 0 ? (
          <div className="ct-empty-state">
            {search ? `No leads match "${search}"` : "No leads yet"}
          </div>
        ) : (
          filteredLeads.map((lead, index) => {
            const n = parseNotes(lead.data.notes);
            const hasNotes = n.length > 0;
            return (
              <div key={lead.key ?? index} className="ct-card">
                <div className="ct-card-header">
                  <div className="ct-card-identity">
                    <div className="ct-avatar ct-avatar--lg">
                      {(lead.data?.firstName?.[0] || "").toUpperCase()}
                      {(lead.data?.lastName?.[0] || "").toUpperCase()}
                    </div>
                    <div>
                      <div className="ct-card-name">{lead.data.firstName} {lead.data.lastName}</div>
                      <div className="ct-card-sub">{formatDateTime(lead.data.createdAt)}</div>
                    </div>
                  </div>
                  <RowActionsDropdown
                    open={rowActionsOpen === index}
                    onToggle={() => setRowActionsOpen((prev) => (prev === index ? null : index))}
                    onClose={() => setRowActionsOpen(null)}
                    loading={loading}
                    items={[
                      ...(!readOnly ? [
                        { label: "Edit", onClick: () => handleEditClick(index, lead.data) },
                        { label: "Send Email", onClick: () => handleRowSendEmail(lead.key) },
                        { label: "Send Text", onClick: () => handleRowSendText(lead.key) },
                        { label: "Convert to Client", onClick: () => handleConvertToClient(lead) },
                        { label: "Delete", onClick: () => requestDelete(lead.key) },
                      ] : [
                        { label: "Send Email", onClick: () => handleRowSendEmail(lead.key) },
                        { label: "Send Text", onClick: () => handleRowSendText(lead.key) },
                      ]),
                    ]}
                  />
                </div>
                <div className="ct-card-body">
                  {lead.data.email && (
                    <div className="ct-card-row">
                      <span className="ct-card-row-label">Email</span>
                      <span className="ct-card-row-value">{lead.data.email}</span>
                    </div>
                  )}
                  {lead.data.phone && (
                    <div className="ct-card-row">
                      <span className="ct-card-row-label">Phone</span>
                      <span className="ct-card-row-value">{lead.data.phone}</span>
                    </div>
                  )}
                  {hasNotes && (
                    <div className="ct-card-row">
                      <span className="ct-card-row-label">Notes</span>
                      <span className="ct-card-row-value">{n[n.length-1].text.slice(0,60)}{n[n.length-1].text.length > 60 ? "…" : ""}</span>
                    </div>
                  )}
                  <div className="ct-card-actions">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.key)}
                      onChange={() => toggleSelect(lead.key)}
                    />
                    <button
                      className="nm-notes-btn"
                      data-has-notes={hasNotes}
                      onClick={() => openNotes(lead.key, lead.data.notes)}
                      style={{marginLeft: "auto"}}
                    >
                      {hasNotes ? `${n.length} note${n.length !== 1 ? "s" : ""}` : "+ Note"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!readOnly && <AddLead setLeads={setLeads} buildHeaders={buildHeaders} />}
    </div>
  );
}

export default LeadsTable;
