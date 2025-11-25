import React, { useState, useEffect, useRef } from 'react';
import './Stylesheets/ClientTable.css';
import noemailimg from './Images/noemail.avif';
import sendemail from "./Images/sendemail.png";
import EmailComposer from './Components/EmailComposer';
import TextComposer from './Components/TextComposer';

function KidsTable({
  membershipInfo,
  clients,      // still accepted for parity
  setClients,   // still accepted for parity
  kids,
  setKids,
  token,
  user,
  buildHeaders,
}) {
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortColumn, setSortColumn] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

  // selection + actions state (like Leads/Client tables)
  const [selected, setSelected] = useState(() => new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);

  // email / text compose state
  const [textOpen, setTextOpen] = useState(false);
  const [textBody, setTextBody] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [textSending, setTextSending] = useState(false);

  const headers = [
    { key: "firstName",          label: "First Name" },
    { key: "lastName",           label: "Last Name" },
    { key: "parentEmail",        label: "Email" },
    { key: "phone",              label: "Phone" },
    { key: "startDate",          label: "Start Date" },
    { key: "endDate",            label: "End Date" },
    { key: "paymentStatus",      label: "Notes" },
    { key: "membershipDuration", label: "Membership Duration" },
    { key: "parentFirstName",    label: "Parent First Name" },
    { key: "parentLastName",     label: "Parent Last Name" },
  ];

  // sort when sortColumn / sortDirection changes
  useEffect(() => {
    setKids(sortKids(kids, sortColumn, sortDirection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortDirection]);

  const sortKids = (kidsArr, column, direction) => {
    return [...kidsArr].sort((a, b) => {
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

  // actions dropdown: outside click + Esc
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

  const handleEditClick = (index, clientData) => {
    setEditingRow(index);
    setEditedData(clientData);
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

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const handleInputChange = (e, field) => {
    const { value } = e.target;
    setEditedData((prevData) => {
      const updatedData = { ...prevData, [field]: value };
      if (field === "membershipDuration" || field === "startDate") {
        const newEndDate = updateEndDate(
          field === "membershipDuration" ? value : prevData.membershipDuration,
          membershipInfo,
          field === "startDate" ? value : prevData.startDate
        );
        updatedData.endDate = newEndDate;
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
        `https://worker-consolidated.maxli5004.workers.dev/edit-kid`,
        {
          method: 'POST',
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
        console.error('Error saving changes', err);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  // unified delete: single or multiple keys
  const handleDelete = async (keyOrKeys) => {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    if (!keys.length) return;

    const confirmMsg =
      keys.length === 1
        ? 'Are you sure you want to delete this record?'
        : `Delete ${keys.length} selected kid(s)? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const baseHeaders = await buildHeaders();
      const hdrs =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});

      const response = await fetch(
        `https://worker-consolidated.maxli5004.workers.dev/delete-kid`,
        {
          method: 'DELETE',
          headers: hdrs,
          body: JSON.stringify({ keys }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const keySet = new Set(keys);
        setKids((prevKids) => prevKids.filter((kid) => !keySet.has(kid.key)));

        // clear deleted from selection
        setSelected((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });

        setActionsOpen(false);
      } else {
        console.error('Error deleting record(s):', data);
        alert('Delete failed — check console for details.');
      }
    } catch (error) {
      console.error('Error deleting record(s):', error);
      alert('Network error during delete. See console.');
    } finally {
      setLoading(false);
    }
  };

  const handleNoEmail = async (key) => {
    try {
      const baseHeaders = await buildHeaders();
      const hdrs =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});

      const response = await fetch(
        `https://worker-consolidated.maxli5004.workers.dev/do-not-mail-list`,
        {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({ key, type: "kid" }),
        }
      );

      if (response.ok) {
        setKids((prevKids) =>
          prevKids.map((kid) =>
            kid.key === key
              ? { ...kid, data: { ...kid.data, doNotMail: !kid.data.doNotMail } }
              : kid
          )
        );
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('Error updating do-not-mail list', err);
      }
    } catch (error) {
      console.error('Error updating do-not-mail list:', error);
    }
  };

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
      const allKeys = new Set(kids.map((k) => k.key));
      const hasUnselected = [...allKeys].some((key) => !prev.has(key));
      if (hasUnselected) return allKeys;
      return new Set();
    });
  };

  // text / email actions
  const handleSendText = () => {
    const keys = Array.from(selected);
    if (!keys.length) {
      alert('Select at least one kid to text.');
      return;
    }
    setTextOpen(true);
  };

  const handleSendEmail = () => {
    const keys = Array.from(selected);
    if (!keys.length) {
      alert('Select at least one kid to email.');
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
    hdrs.set('Content-Type', 'application/json');

    for (const recipients of batches) {
      const payload = {
        message: textBody,
        recipients,
        listType: "kids",
      };

      console.log('[KidsTable submitText] batch payload ->', payload);

      const res = await fetch(
        'https://worker-consolidated.maxli5004.workers.dev/text',
        {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify(payload),
        }
      );

      const responseText = await res.text().catch(() => '');
      let responseJson = null;
      try { responseJson = JSON.parse(responseText); } catch (_) {}

      if (!res.ok) {
        console.error('Text API error (kids batch):', res.status, 'body:', responseText);
        alert('Some kids text batches failed — check console for details.');
        break;
      } else {
        console.log('[KidsTable submitText] batch response:', responseJson || responseText);
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
    const hdrs =
      baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
    hdrs.set('Content-Type', 'application/json');

    for (const recipients of batches) {
      const payload = {
        subject: emailSubject,
        body: emailBody,
        message: emailBody,
        recipients,
        listType: "kids",
      };

      console.log('[KidsTable submitEmail] batch payload ->', payload);

      const res = await fetch(
        'https://worker-consolidated.maxli5004.workers.dev/email',
        {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify(payload),
        }
      );

      const responseText = await res.text().catch(() => '');
      let responseJson = null;
      try { responseJson = JSON.parse(responseText); } catch (_) {}

      if (!res.ok) {
        console.error('Email API error (kids batch):', res.status, 'body:', responseText);
        alert('Some kids email batches failed — check console for details.');
        break;
      } else {
        console.log('[KidsTable submitEmail] batch response:', responseJson || responseText);
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

      <h1>{kids.length} Kid Students</h1>

      {/* Actions toolbar */}
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
            {/* Select-all */}
            <th className="ct-small">
              <button
                className="select-all-button"
                onClick={selectAll}
              >
                Select<br />All
              </button>
            </th>
            {/* Edit / no-email column */}
            <th className="ct-small"></th>
            {headers.map((header) => (
              <th key={header.key} onClick={() => handleSort(header.key)}>
                <div className="ct-header">
                  <div className="ct-table-header">{header.label}</div>
                  <div className="ct-header-arrow">
                    {sortColumn === header.key &&
                      (sortDirection === "asc" ? "↓" : "↑")}
                  </div>
                </div>
              </th>
            ))}
            {/* Delete col */}
            <th className="ct-small"></th>
          </tr>
        </thead>
        <tbody>
          {kids.map((client, index) => (
            <tr
              key={client.key ?? index}
              className={
                client.data.endDate && new Date() > new Date(client.data.endDate)
                  ? 'ct-red'
                  : 'ct-regular'
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
                    <button
                      className="ct-edit-btn"
                      onClick={() => handleEditClick(index, client.data)}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleNoEmail(client.key)}
                      title={client.data.doNotMail ? "Allow emails" : "Do not email"}
                    >
                      {client.data.doNotMail
                        ? <img id='no-email' src={noemailimg} alt="No email" />
                        : <img id='no-email' src={sendemail} alt="Send email" />}
                    </button>
                  </>
                )}
              </td>

              {/* data cells */}
              {editingRow === index ? (
                <>
                  <td>
                    <input
                      type="text"
                      value={editedData.firstName || ''}
                      onChange={(e) => handleInputChange(e, 'firstName')}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editedData.lastName || ''}
                      onChange={(e) => handleInputChange(e, 'lastName')}
                    />
                  </td>
                  <td>
                    <input
                      type="email"
                      value={editedData.parentEmail || ''}
                      onChange={(e) => handleInputChange(e, 'parentEmail')}
                    />
                  </td>
                  <td>
                    <input
                      type="tel"
                      value={editedData.phone || ''}
                      onChange={(e) => handleInputChange(e, 'phone')}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={editedData.startDate || ''}
                      onChange={(e) => handleInputChange(e, 'startDate')}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={editedData.endDate || ''}
                      onChange={(e) => handleInputChange(e, 'endDate')}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editedData.paymentStatus || ''}
                      onChange={(e) => handleInputChange(e, 'paymentStatus')}
                    />
                  </td>
                  <td>
                    <select
                      value={editedData.membershipDuration || ''}
                      onChange={(e) => handleInputChange(e, 'membershipDuration')}
                    >
                      {membershipInfo?.info?.map((membership) =>
                        !membership.free &&
                        membership.description &&
                        membership.duration ? (
                          <option
                            key={membership.description}
                            value={membership.description}
                          >
                            {membership.description}
                          </option>
                        ) : null
                      )}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editedData.parentFirstName || ''}
                      onChange={(e) => handleInputChange(e, 'parentFirstName')}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editedData.parentLastName || ''}
                      onChange={(e) => handleInputChange(e, 'parentLastName')}
                    />
                  </td>
                </>
              ) : (
                <>
                  <td><p>{client.data.firstName}</p></td>
                  <td>{client.data.lastName}</td>
                  <td>{client.data.parentEmail}</td>
                  <td>{client.data.phone}</td>
                  <td>{client.data.startDate}</td>
                  <td>{client.data.endDate}</td>
                  <td>{client.data.paymentStatus}</td>
                  <td>{client.data.membershipDuration}</td>
                  <td>{client.data.parentFirstName}</td>
                  <td>{client.data.parentLastName}</td>
                </>
              )}

              {/* delete */}
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

export default KidsTable;
