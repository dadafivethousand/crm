import React, { useState, useEffect, useRef } from 'react';
import './Stylesheets/ClientTable.css';
import noemailimg from './Images/noemail.avif';
import sendemail from "./Images/sendemail.png";
import EmailComposer from './Components/EmailComposer';
import TextComposer from './Components/TextComposer';

function ClientTable({
  membershipInfo,
  clients,
  setClients,
  token,        // still accepted if used elsewhere
  user,         // still accepted if used elsewhere
  buildHeaders, // injected from App
}) {
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortColumn, setSortColumn] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

  // --- selection + actions state (mirrors LeadsTable) ---
  const [selected, setSelected] = useState(() => new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);

  // email / text compose modals
  const [textOpen, setTextOpen] = useState(false);
  const [textBody, setTextBody] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
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

  // close actions dropdown on outside click + Escape
  useEffect(() => {
    const onDocClick = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setActionsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // --- sorting ---
  useEffect(() => {
    setClients(sortClients(clients, sortColumn, sortDirection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortDirection]);

  const sortClients = (clientsArr, column, direction) => {
    return [...clientsArr].sort((a, b) => {
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
      const headersObj = baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      const res = await fetch(
        `https://worker-consolidated.maxli5004.workers.dev/edit-client`,
        {
          method: 'POST',
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
        console.error('Error saving changes:', err);
      }
    } catch (err) {
      console.error('Error saving changes:', err);
    }
  };

  // --- unified delete handler (single or multiple) ---
  const handleDelete = async (keyOrKeys) => {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    if (!keys.length) return;

    const confirmMsg =
      keys.length === 1
        ? 'Are you sure you want to delete this record?'
        : `Delete ${keys.length} selected client(s)? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const baseHeaders = await buildHeaders();
      const headersObj = baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      const res = await fetch(
        `https://worker-consolidated.maxli5004.workers.dev/delete-client`,
        {
          method: 'DELETE',
          headers: headersObj,
          body: JSON.stringify({ keys }),
        }
      );
      if (res.ok) {
        const keySet = new Set(keys);
        setClients((prev) => prev.filter((c) => !keySet.has(c.key)));

        // remove deleted from selection
        setSelected((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });

        setActionsOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Error deleting record(s):', err);
        alert('Delete failed — check console for details.');
      }
    } catch (err) {
      console.error('Error deleting record(s):', err);
      alert('Network error during delete. See console.');
    } finally {
      setLoading(false);
    }
  };

  const handleNoEmail = async (key, type) => {
    try {
      const baseHeaders = await buildHeaders();
      const headersObj = baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      const res = await fetch(
        `https://worker-consolidated.maxli5004.workers.dev/do-not-mail-list`,
        {
          method: 'POST',
          headers: headersObj,
          body: JSON.stringify({ key, type }),
        }
      );
      if (res.ok) {
        setClients((prev) =>
          prev.map((c) =>
            c.key === key
              ? { ...c, data: { ...c.data, doNotMail: !c.data.doNotMail } }
              : c
          )
        );
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Error updating do-not-mail list:', err);
      }
    } catch (err) {
      console.error('Error updating do-not-mail list:', err);
    }
  };

  // --- selection helpers (same pattern as LeadsTable) ---

  // only adult/teen clients in this table
  const adultClients = clients.filter(
    (client) => client?.data && !client.data.kidsMembership
  );

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
      if (hasUnselected) return allKeys; // select all
      return new Set();                  // deselect all
    });
  };

  const clearSelection = () => setSelected(new Set());

  // --- text/email actions (same endpoints as LeadsTable) ---

  const handleSendText = () => {
    const keys = Array.from(selected);
    if (!keys.length) {
      alert('Select at least one client to text.');
      return;
    }
    setTextOpen(true);
  };

  const handleSendEmail = () => {
    const keys = Array.from(selected);
    if (!keys.length) {
      alert('Select at least one client to email.');
      return;
    }
    setEmailOpen(true);
  };

 const submitText = async (e) => {
  if (e && e.preventDefault) e.preventDefault();

  const allRecipients = Array.from(selected);
  if (!allRecipients.length) {
    alert('No recipients selected.');
    setTextOpen(false);
    return;
  }
  if (!textBody || !textBody.trim()) {
    alert('Please enter a message.');
    return;
  }

  // 🔹 Batch into smaller groups
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
    headersObj.set('Content-Type', 'application/json');

    for (const recipients of batches) {
      const payload = {
        message: textBody,
        recipients,
        listType: "clients",
      };

      console.log('[ClientTable submitText] batch payload ->', payload);

      const res = await fetch(
        'https://worker-consolidated.maxli5004.workers.dev/text',
        {
          method: 'POST',
          headers: headersObj,
          body: JSON.stringify(payload),
        }
      );

      const responseText = await res.text().catch(() => '');
      let responseJson = null;
      try { responseJson = JSON.parse(responseText); } catch (_) {}

      if (!res.ok) {
        console.error('Text API error status:', res.status, 'body:', responseText);
        alert('Some text batches failed — check console for details.');
        break; // or continue if you want to keep trying
      } else {
        console.log('[ClientTable submitText] batch response:', responseJson || responseText);
      }
    }

    alert('Texts queued/sent (batched).');
    setTextBody('');
    setTextOpen(false);
  } catch (err) {
    console.error('Network error sending text:', err);
    alert('Network error sending text — see console.');
  } finally {
    setTextSending(false);
  }
};


  const submitEmail = async (e) => {
  if (e && e.preventDefault) e.preventDefault();

  const allRecipients = Array.from(selected);
  if (!allRecipients.length) {
    alert('No recipients selected.');
    setEmailOpen(false);
    return;
  }
  if (!emailSubject.trim()) {
    alert('Please enter a subject.');
    return;
  }
  if (!emailBody.trim()) {
    alert('Please enter a message.');
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
    headersObj.set('Content-Type', 'application/json');

    for (const recipients of batches) {
      const payload = {
        subject: emailSubject,
        body: emailBody,
        message: emailBody,
        recipients,
        listType: "clients", // or "leads"/"kids" in other tables
      };

      console.log('[submitEmail] batch payload ->', payload);

      const res = await fetch(
        'https://worker-consolidated.maxli5004.workers.dev/email',
        {
          method: 'POST',
          headers: headersObj,
          body: JSON.stringify(payload),
        }
      );

      const responseText = await res.text().catch(() => '');
      let responseJson = null;
      try { responseJson = JSON.parse(responseText); } catch (_) {}

      if (!res.ok) {
        console.error('Email API error status:', res.status, 'body:', responseText);
        alert('Some batches failed — check console for details.');
        break; // or continue if you want to keep trying
      } else {
        console.log('Email API batch response:', responseJson || responseText);
      }
    }

    alert('Emails queued/sent (batched).');
    setEmailSubject('');
    setEmailBody('');
    setEmailOpen(false);
  } catch (err) {
    console.error('Network error sending email:', err);
    alert('Network error sending email — see console.');
  } finally {
    setEmailSending(false);
  }
};


  return (
    <div className="ct-client-table-container">
      {/* Email + Text modals */}
      {emailOpen && (
        <EmailComposer
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          onSend={submitEmail}
          sending={emailSending}
          subject={emailSubject}
          setSubject={setEmailSubject}
          body={emailBody}
          setBody={setEmailBody}
          selectedCount={selected.size}
        />
      )}

      {textOpen && (
        <TextComposer
          open={textOpen}
          onClose={() => setTextOpen(false)}
          onSend={submitText}
          sending={textSending}
          message={textBody}
          setMessage={setTextBody}
          selectedCount={selected.size}
        />
      )}

      <h1>{adultClients.length} Adult & Teen Students</h1>

      {/* Toolbar with Actions dropdown + selection count */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div ref={actionsRef} style={{ position: 'relative' }}>
          <button
            className="mass-actions-btn"
            onClick={() => setActionsOpen((s) => !s)}
            title={
              selected.size === 0
                ? 'Select rows to enable actions'
                : `${selected.size} selected`
            }
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

              <div style={{ padding: '6px 12px', fontSize: 12, color: '#666' }}>
                {selected.size === 0
                  ? 'No rows selected'
                  : `${selected.size} selected`}
              </div>
            </div>
          )}
        </div>

        {selected.size > 0 && (
          <div style={{ fontSize: 14 }}>{selected.size} selected</div>
        )}
      </div>

      <table className="ct-client-table">
        <thead>
          <tr>
            {/* Select-all column */}
            <th className="ct-small">
              <button
                className="select-all-button"
                onClick={selectAll}
              >
                Select<br />All
              </button>
            </th>
            {/* existing edit / no-email column */}
            <th className="ct-small"></th>
            {headers.map((header) => (
              <th
                key={header.key}
                onClick={() => handleSort(header.key)}
                className={`ct-th-${header.key}`}
              >
                <div className="ct-header">
                  <div className="ct-table-header">{header.label}</div>
                  <div className="ct-header-arrow">
                    {sortColumn === header.key && (sortDirection === "asc" ? "↓" : "↑")}
                  </div>
                </div>
              </th>
            ))}
            <th className="ct-small"></th>
          </tr>
        </thead>
        <tbody>
          {adultClients.map((client, index) => (
            <tr
              key={client.key ?? index}
              className={
                client.data.endDate && new Date() >= new Date(client.data.endDate)
                  ? "ct-red"
                  : "ct-regular"
              }
            >
              {/* checkbox column */}
              <td className="ct-small">
                <input
                  type="checkbox"
                  checked={selected.has(client.key)}
                  onChange={() => toggleSelect(client.key)}
                />
              </td>

              {/* edit / do-not-mail column */}
              <td className="ct-small">
                {editingRow === index ? (
                  <>
                    <button
                      className="ct-save-btn"
                      onClick={() => handleSaveChanges(client.key)}
                    >
                      ✅
                    </button>
                    <button
                      className="ct-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      ❌
                    </button>
                  </>
                ) : (
                  <>
                    <div className="ct-button-flex">
                      <button
                        className="ct-edit-btn"
                        onClick={() => handleEditClick(index, client.data)}
                      >
                        ✏️
                      </button>
                    </div>
                    <button
                      onClick={() => handleNoEmail(client.key, "student")}
                      id='ct-no-email-button'
                      title={client.data.doNotMail ? "Allow emails" : "Do not email"}
                    >
                      {client.data.doNotMail
                        ? <img id='no-email' src={noemailimg} alt="No email" />
                        : <img id='no-email' src={sendemail} alt="Send email" />}
                    </button>
                  </>
                )}
              </td>

              {/* data columns */}
              {editingRow === index ? (
                <>
                  {headers.map((header) => (
                    <td key={header.key}>
                      {header.key === "membershipDuration" ? (
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
                    <td key={header.key}>{client.data[header.key]}</td>
                  ))}
                </>
              )}

              {/* delete column */}
              <td className="ct-small">
                <button
                  className="ct-delete-btn"
                  onClick={() => handleDelete(client.key)}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ClientTable;
