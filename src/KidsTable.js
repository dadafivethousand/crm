import React, { useState, useEffect, useRef, useMemo } from "react";
import "./Stylesheets/ClientTable.css";

import EmailComposer from "./Components/EmailComposer";
import TextComposer from "./Components/TextComposer";
import DeleteOptionsModal from "./Components/DeleteOptionsModal";
import NotesModal from "./Components/NotesModal";

import BulkActionsDropdown from "./Components/BulkActionsDropdown";
import RowActionsDropdown from "./Components/RowActionsDropdown";
import SortableTh from "./Components/SortableTh";

import { useToast } from "./Components/Toast";
import { formatDate } from "./dateUtils";

function parseNotes(raw) {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [{ text: raw.trim(), timestamp: null, author: "legacy" }] : [];
  if (Array.isArray(raw)) return raw;
  return [];
}

function getMembershipStatus(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (isNaN(end)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return end < now ? "expired" : "active";
}

function KidsTable({
  membershipInfo,
  clients,
  setClients,
  kids,
  setKids,
  token,
  user,
  buildHeaders,
}) {
  const toast = useToast();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState([]);

  const [notesOpen, setNotesOpen] = useState(false);
  const [notesKey, setNotesKey] = useState(null);
  const [notesRaw, setNotesRaw] = useState(null);

  const [search, setSearch] = useState("");

  const openNotes = (key, raw) => {
    setNotesKey(key);
    setNotesRaw(raw);
    setNotesOpen(true);
  };

  const handleNotesUpdated = (key, updatedNotes) => {
    setNotesRaw(updatedNotes);
    setKids((prev) =>
      prev.map((k) => (k.key === key ? { ...k, data: { ...k.data, paymentStatus: updatedNotes } } : k))
    );
  };

  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortColumn, setSortColumn] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

  const [individualSelection, setIndividualSelection] = useState(null);
  const [selected, setSelected] = useState(() => new Set());

  const [actionsOpen, setActionsOpen] = useState(false);
  const [individualActionsOpen, setIndividualActionsOpen] = useState(null);
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);

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
    { key: "parentEmail", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "paymentStatus", label: "Notes" },
    { key: "membershipDuration", label: "Membership" },
    { key: "parentFirstName", label: "Parent First" },
    { key: "parentLastName", label: "Parent Last" },
  ];

  // Close bulk dropdown on outside click + Escape
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

  // Escape cancels inline edit
  useEffect(() => {
    if (editingRow === null) return;
    const onKey = (e) => { if (e.key === "Escape") handleCancelEdit(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editingRow]);

  // Stats
  const stats = useMemo(() => {
    const all = kids || [];
    const expired = all.filter((k) => getMembershipStatus(k.data?.endDate) === "expired").length;
    return { total: all.length, expired, active: all.length - expired };
  }, [kids]);

  // Filtered + sorted kids
  const filteredKids = useMemo(() => {
    let arr = kids || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (k) =>
          k.data?.firstName?.toLowerCase().includes(q) ||
          k.data?.lastName?.toLowerCase().includes(q) ||
          k.data?.parentEmail?.toLowerCase().includes(q) ||
          k.data?.phone?.toLowerCase().includes(q) ||
          k.data?.parentFirstName?.toLowerCase().includes(q) ||
          k.data?.parentLastName?.toLowerCase().includes(q)
      );
    }
    return [...arr].sort((a, b) => {
      const av = (a?.data?.[sortColumn] ?? "").toString().toLowerCase();
      const bv = (b?.data?.[sortColumn] ?? "").toString().toLowerCase();
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [kids, search, sortColumn, sortDirection]);

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const handleEditClick = (index, clientData) => {
    setEditingRow(index);
    setEditedData(clientData);
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const updateEndDate = (duration, membershipInfoObj, startDate) => {
    if (!startDate || !membershipInfoObj?.info?.length) return "";
    const date = new Date(startDate);
    const matchingMembership = membershipInfoObj.info.find(
      (membership) => membership.description === duration
    );
    if (matchingMembership?.duration) {
      date.setMonth(date.getMonth() + matchingMembership.duration);
      return date.toISOString().split("T")[0];
    }
    return "";
  };

  const handleInputChange = (e, field) => {
    const { value } = e.target;
    setEditedData((prevData) => {
      const updatedData = { ...prevData, [field]: value };
      if (field === "membershipDuration" || field === "startDate") {
        updatedData.endDate = updateEndDate(
          field === "membershipDuration" ? value : prevData.membershipDuration,
          membershipInfo,
          field === "startDate" ? value : prevData.startDate
        );
      }
      return updatedData;
    });
  };

  const handleSaveChanges = async (key) => {
    try {
      const baseHeaders = await buildHeaders();
      const hdrs =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});

      const response = await fetch(
        "https://worker-consolidated.maxli5004.workers.dev/edit-kid",
        {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({ key, data: editedData }),
        }
      );

      if (response.ok) {
        setKids((prevKids) =>
          prevKids.map((k) =>
            k.key === key ? { ...k, data: { ...editedData } } : k
          )
        );
        handleCancelEdit();
        toast.success("Changes saved.");
      } else {
        const err = await response.json().catch(() => ({}));
        console.error("Error saving changes", err);
        toast.error("Failed to save changes.");
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Network error saving changes.");
    }
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
    await performDeleteKids({ keys, saveAsLead });
  };

  const performDeleteKids = async ({ keys, saveAsLead }) => {
    if (!keys.length) return;

    setLoading(true);
    try {
      const baseHeaders = await buildHeaders();
      const hdrs =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      hdrs.set("Content-Type", "application/json");

      const response = await fetch(
        "https://worker-consolidated.maxli5004.workers.dev/delete-kid",
        {
          method: "DELETE",
          headers: hdrs,
          body: JSON.stringify({ keys, saveAsLead }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const keySet = new Set(keys);
        setKids((prevKids) => prevKids.filter((kid) => !keySet.has(kid.key)));
        setSelected((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });
        setActionsOpen(false);
        setIndividualActionsOpen(null);
      } else {
        console.error("Error deleting kid(s):", data);
        toast.error("Delete failed.");
      }
    } catch (error) {
      console.error("Network error during delete-kid:", error);
      toast.error("Network error during delete.");
    } finally {
      setLoading(false);
    }
  };

  // --- selection helpers ---
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
      const allKeys = new Set((filteredKids || []).map((k) => k.key));
      const hasUnselected = [...allKeys].some((key) => !prev.has(key));
      return hasUnselected ? allKeys : new Set();
    });
  };

  // --- text/email actions ---
  const handleSendText = (key) => {
    if (key != null) setIndividualSelection(key);

    if (!selected.size && key == null) {
      toast.error("Select at least one kid first.");
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
      toast.error("Select at least one kid first.");
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
        const res = await fetch(
          "https://worker-consolidated.maxli5004.workers.dev/text",
          {
            method: "POST",
            headers: hdrs,
            body: JSON.stringify({ message: textBody, recipients, listType: "kids" }),
          }
        );
        if (!res.ok) {
          console.error("Text API error (kids):", res.status, await res.text().catch(() => ""));
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
        const res = await fetch(
          "https://worker-consolidated.maxli5004.workers.dev/email",
          {
            method: "POST",
            headers: hdrs,
            body: JSON.stringify({
              subject: emailSubject,
              body: emailBody,
              message: emailBody,
              recipients,
              listType: "kids",
            }),
          }
        );
        if (!res.ok) {
          console.error("Email API error (kids):", res.status, await res.text().catch(() => ""));
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
          recordType="kid"
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

      {/* Stats bar */}
      <div className="ct-stats-bar">
        <div className="ct-stat">
          <span className="ct-stat-value">{stats.total}</span>
          <span className="ct-stat-label">Total</span>
        </div>
        <div className="ct-stat">
          <span className="ct-stat-value ct-stat-value--active">{stats.active}</span>
          <span className="ct-stat-label">Active</span>
        </div>
        <div className="ct-stat">
          <span className="ct-stat-value ct-stat-value--expired">{stats.expired}</span>
          <span className="ct-stat-label">Expired</span>
        </div>
      </div>

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
            placeholder="Search by kid, parent, email or phone..."
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

      {/* Desktop table */}
      <div className="ct-table-wrap">
        <table className="ct-client-table">
          <thead>
            <tr>
              <th className="ct-small">
                <button className="select-all-button" onClick={selectAll}>All</button>
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
                />
              ))}
              <th className="ct-small"></th>
            </tr>
          </thead>

          <tbody>
            {filteredKids.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 3} className="ct-empty-state">
                  {search ? `No kids match "${search}"` : "No kids yet"}
                </td>
              </tr>
            ) : (
              filteredKids.map((client, index) => {
                const isExpired = getMembershipStatus(client.data?.endDate) === "expired";
                return (
                  <tr key={client.key ?? index} className={isExpired ? "ct-red" : "ct-regular"}>
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
                          <button type="button" className="ct-save-btn" onClick={() => handleSaveChanges(client.key)}>Save</button>
                          <button type="button" className="ct-cancel-btn" onClick={handleCancelEdit}>Cancel</button>
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
                        <td><input type="text" value={editedData.firstName || ""} onChange={(e) => handleInputChange(e, "firstName")} /></td>
                        <td><input type="text" value={editedData.lastName || ""} onChange={(e) => handleInputChange(e, "lastName")} /></td>
                        <td><input type="email" value={editedData.parentEmail || ""} onChange={(e) => handleInputChange(e, "parentEmail")} /></td>
                        <td><input type="tel" value={editedData.phone || ""} onChange={(e) => handleInputChange(e, "phone")} /></td>
                        <td><input type="date" value={editedData.startDate || ""} onChange={(e) => handleInputChange(e, "startDate")} /></td>
                        <td><input type="date" value={editedData.endDate || ""} onChange={(e) => handleInputChange(e, "endDate")} /></td>
                        <td>
                          {(() => {
                            const n = parseNotes(client.data?.paymentStatus);
                            const hasNotes = n.length > 0;
                            return (
                              <button className="nm-notes-btn" data-has-notes={hasNotes} onClick={() => openNotes(client.key, client.data?.paymentStatus)}>
                                {hasNotes ? `${n.length} note${n.length !== 1 ? "s" : ""} · ${n[n.length-1].text.slice(0,36)}${n[n.length-1].text.length > 36 ? "…" : ""}` : "+ Add note"}
                              </button>
                            );
                          })()}
                        </td>
                        <td>
                          <select value={editedData.membershipDuration || ""} onChange={(e) => handleInputChange(e, "membershipDuration")}>
                            {membershipInfo?.info?.map((m) =>
                              !m.free && m.description && m.duration ? (
                                <option key={m.description} value={m.description}>{m.description}</option>
                              ) : null
                            )}
                          </select>
                        </td>
                        <td><input type="text" value={editedData.parentFirstName || ""} onChange={(e) => handleInputChange(e, "parentFirstName")} /></td>
                        <td><input type="text" value={editedData.parentLastName || ""} onChange={(e) => handleInputChange(e, "parentLastName")} /></td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div className="ct-name-cell">
                            <div className="ct-avatar">
                              {(client.data?.firstName?.[0] || "").toUpperCase()}
                              {(client.data?.lastName?.[0] || "").toUpperCase()}
                            </div>
                            <span className={isExpired ? "ct-name-expired" : ""}>{client.data?.firstName}</span>
                          </div>
                        </td>
                        <td className={isExpired ? "ct-name-expired" : ""}>{client.data?.lastName}</td>
                        <td>{client.data?.parentEmail}</td>
                        <td>{client.data?.phone}</td>
                        <td>{formatDate(client.data?.startDate)}</td>
                        <td className={isExpired ? "ct-name-expired" : ""}>{formatDate(client.data?.endDate)}</td>
                        <td>
                          {(() => {
                            const n = parseNotes(client.data?.paymentStatus);
                            const hasNotes = n.length > 0;
                            return (
                              <button className="nm-notes-btn" data-has-notes={hasNotes} onClick={() => openNotes(client.key, client.data?.paymentStatus)}>
                                {hasNotes ? `${n.length} note${n.length !== 1 ? "s" : ""} · ${n[n.length-1].text.slice(0,36)}${n[n.length-1].text.length > 36 ? "…" : ""}` : "+ Add note"}
                              </button>
                            );
                          })()}
                        </td>
                        <td>{client.data?.membershipDuration}</td>
                        <td>{client.data?.parentFirstName}</td>
                        <td>{client.data?.parentLastName}</td>
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
                          { label: "Edit", onClick: () => handleEditClick(index, client.data) },
                          { label: "Send Email", onClick: () => handleSendEmail(client.key) },
                          { label: "Send Text", onClick: () => handleSendText(client.key) },
                          { label: "Delete", onClick: () => requestDelete(client.key) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="ct-card-list">
        {filteredKids.length === 0 ? (
          <div className="ct-empty-state">
            {search ? `No kids match "${search}"` : "No kids yet"}
          </div>
        ) : (
          filteredKids.map((client, index) => {
            const isExpired = getMembershipStatus(client.data?.endDate) === "expired";
            const n = parseNotes(client.data?.paymentStatus);
            const hasNotes = n.length > 0;
            return (
              <div key={client.key ?? index} className={`ct-card${isExpired ? " ct-card--expired" : ""}`}>
                <div className="ct-card-header">
                  <div className="ct-card-identity">
                    <div className="ct-avatar ct-avatar--lg">
                      {(client.data?.firstName?.[0] || "").toUpperCase()}
                      {(client.data?.lastName?.[0] || "").toUpperCase()}
                    </div>
                    <div>
                      <div className={`ct-card-name${isExpired ? " ct-name-expired" : ""}`}>
                        {client.data?.firstName} {client.data?.lastName}
                      </div>
                      <div className="ct-card-sub">
                        {client.data?.parentFirstName} {client.data?.parentLastName}
                        {isExpired && <span className="status-badge status-expired" style={{marginLeft: 6}}>Expired</span>}
                      </div>
                    </div>
                  </div>
                  <RowActionsDropdown
                    open={individualActionsOpen === index}
                    onToggle={() =>
                      setIndividualActionsOpen((prev) => (prev === index ? null : index))
                    }
                    onClose={() => setIndividualActionsOpen(null)}
                    loading={loading}
                    items={[
                      { label: "Edit", onClick: () => handleEditClick(index, client.data) },
                      { label: "Send Email", onClick: () => handleSendEmail(client.key) },
                      { label: "Send Text", onClick: () => handleSendText(client.key) },
                      { label: "Delete", onClick: () => requestDelete(client.key) },
                    ]}
                  />
                </div>
                <div className="ct-card-body">
                  <div className="ct-card-row">
                    <span className="ct-card-row-label">Email</span>
                    <span className="ct-card-row-value">{client.data?.parentEmail || "—"}</span>
                  </div>
                  <div className="ct-card-row">
                    <span className="ct-card-row-label">Phone</span>
                    <span className="ct-card-row-value">{client.data?.phone || "—"}</span>
                  </div>
                  <div className="ct-card-row">
                    <span className="ct-card-row-label">Membership</span>
                    <span className="ct-card-row-value">{client.data?.membershipDuration || "—"}</span>
                  </div>
                  <div className="ct-card-row">
                    <span className="ct-card-row-label">Start</span>
                    <span className="ct-card-row-value">{formatDate(client.data?.startDate)}</span>
                  </div>
                  <div className="ct-card-row">
                    <span className="ct-card-row-label">End</span>
                    <span className={`ct-card-row-value${isExpired ? " ct-name-expired" : ""}`}>{formatDate(client.data?.endDate)}</span>
                  </div>
                  {hasNotes && (
                    <div className="ct-card-row">
                      <span className="ct-card-row-label">Notes</span>
                      <span className="ct-card-row-value">{n[n.length-1].text.slice(0,60)}{n[n.length-1].text.length > 60 ? "…" : ""}</span>
                    </div>
                  )}
                  <div className="ct-card-actions">
                    <input
                      type="checkbox"
                      checked={selected.has(client.key)}
                      onChange={() => toggleSelect(client.key)}
                    />
                    <button
                      className="nm-notes-btn"
                      data-has-notes={hasNotes}
                      onClick={() => openNotes(client.key, client.data?.paymentStatus)}
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
    </div>
  );
}

export default KidsTable;
