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

function parseNotes(raw) {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [{ text: raw.trim(), timestamp: null, author: "legacy" }] : [];
  if (Array.isArray(raw)) return raw;
  return [];
}

function KidsTable({
  membershipInfo,
  clients, // still accepted for parity
  setClients, // still accepted for parity
  kids,
  setKids,
  token,
  user,
  buildHeaders,
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState([]);

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
    setKids((prev) =>
      prev.map((k) => (k.key === key ? { ...k, data: { ...k.data, paymentStatus: updatedNotes } } : k))
    );
  };

  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortColumn, setSortColumn] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

  // selection + actions state
  const [individualSelection, setIndividualSelection] = useState(null); // ✅ matches ClientTable
  const [selected, setSelected] = useState(() => new Set());

  const [actionsOpen, setActionsOpen] = useState(false);
  const [individualActionsOpen, setIndividualActionsOpen] = useState(null); // row index or null
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);

  // email / text compose state
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
    { key: "membershipDuration", label: "Membership Duration" },
    { key: "parentFirstName", label: "Parent First Name" },
    { key: "parentLastName", label: "Parent Last Name" },
  ];

  // close BULK actions dropdown on outside click + Escape
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
    setKids(sortKids(kids, sortColumn, sortDirection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortDirection]);

  const sortKids = (kidsArr, column, direction) => {
    return [...(kidsArr || [])].sort((a, b) => {
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
          prevKids.map((client) =>
            client.key === key ? { ...client, data: { ...editedData } } : client
          )
        );
        handleCancelEdit();
      } else {
        const err = await response.json().catch(() => ({}));
        console.error("Error saving changes", err);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  // --- delete modal flow (matches ClientTable shape) ---
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
        alert("Delete failed — check console for details.");
      }
    } catch (error) {
      console.error("Network error during delete-kid:", error);
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
      const allKeys = new Set((kids || []).map((k) => k.key));
      const hasUnselected = [...allKeys].some((key) => !prev.has(key));
      return hasUnselected ? allKeys : new Set();
    });
  };

  // --- text/email actions (bulk or single) — matches ClientTable ---
  const handleSendText = (key) => {
    const keys = Array.from(selected);

    if (key != null) setIndividualSelection(key);

    if (!keys.length && key == null) {
      alert("Select at least one kid to text.");
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
      alert("Select at least one kid to email.");
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
      const hdrs =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      hdrs.set("Content-Type", "application/json");

      for (const recipients of batches) {
        const payload = {
          message: textBody,
          recipients,
          listType: "kids",
        };

        const res = await fetch(
          "https://worker-consolidated.maxli5004.workers.dev/text",
          {
            method: "POST",
            headers: hdrs,
            body: JSON.stringify(payload),
          }
        );

        const responseText = await res.text().catch(() => "");
        if (!res.ok) {
          console.error("Text API error (kids batch):", res.status, "body:", responseText);
          alert("Some kids text batches failed — check console for details.");
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
      const hdrs =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      hdrs.set("Content-Type", "application/json");

      for (const recipients of batches) {
        const payload = {
          subject: emailSubject,
          body: emailBody,
          message: emailBody,
          recipients,
          listType: "kids",
        };

        const res = await fetch(
          "https://worker-consolidated.maxli5004.workers.dev/email",
          {
            method: "POST",
            headers: hdrs,
            body: JSON.stringify(payload),
          }
        );

        const responseText = await res.text().catch(() => "");
        if (!res.ok) {
          console.error("Email API error (kids batch):", res.status, "body:", responseText);
          alert("Some kids email batches failed — check console for details.");
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

  // Option A: bulk dropdown items
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

      {/* Email + Text modals */}
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

      {/* Bulk actions toolbar */}
      <div className="ct-toolbar">
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
              />
            ))}

            <th className="ct-small"></th>
          </tr>
        </thead>

        <tbody>
          {(kids || []).map((client, index) => (
            <tr
              key={client.key ?? index}
              className={
                client?.data?.endDate && new Date() > new Date(client.data.endDate)
                  ? "ct-red"
                  : "ct-regular"
              }
            >
              {/* checkbox */}
              <td className="ct-small">
                <input
                  type="checkbox"
                  checked={selected.has(client.key)}
                  onChange={() => toggleSelect(client.key)}
                />
              </td>

              {/* edit + do-not-mail */}
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

              {/* data cells */}
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
                      value={editedData.parentEmail || ""}
                      onChange={(e) => handleInputChange(e, "parentEmail")}
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
                    <input
                      type="date"
                      value={editedData.startDate || ""}
                      onChange={(e) => handleInputChange(e, "startDate")}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={editedData.endDate || ""}
                      onChange={(e) => handleInputChange(e, "endDate")}
                    />
                  </td>
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
                    <select
                      value={editedData.membershipDuration || ""}
                      onChange={(e) => handleInputChange(e, "membershipDuration")}
                    >
                      {membershipInfo?.info?.map((membership) =>
                        !membership.free &&
                        membership.description &&
                        membership.duration ? (
                          <option key={membership.description} value={membership.description}>
                            {membership.description}
                          </option>
                        ) : null
                      )}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editedData.parentFirstName || ""}
                      onChange={(e) => handleInputChange(e, "parentFirstName")}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editedData.parentLastName || ""}
                      onChange={(e) => handleInputChange(e, "parentLastName")}
                    />
                  </td>
                </>
              ) : (
                <>
                  <td><p>{client.data?.firstName}</p></td>
                  <td>{client.data?.lastName}</td>
                  <td>{client.data?.parentEmail}</td>
                  <td>{client.data?.phone}</td>
                  <td>{client.data?.startDate}</td>
                  <td>{client.data?.endDate}</td>
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

              {/* ✅ Individual actions dropdown (outsourced) — matches ClientTable */}
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

export default KidsTable;