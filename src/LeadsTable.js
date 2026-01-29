import React, { useState, useEffect, useRef } from 'react';
import './Stylesheets/ClientTable.css';
import AddLead from './AddLead';
import EmailComposer from './Components/EmailComposer';
import TextComposer from './Components/TextComposer';

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

  // ✅ SORTING (same pattern as ClientTable / KidsTable)
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

  // initialize
  const [selected, setSelected] = useState(() => new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);
  // email modal state
  const [textOpen, setTextOpen] = useState(false);
  const [textBody, setTextBody] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [textSending, setTextSending] = useState(false);
  const emailRef = useRef(null);

  // Close dropdown when clicking outside + handle Escape key
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

  // toggle one key
  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev); // copy so we don't mutate prev
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(prev => {
      // Create a set of all lead keys
      const allKeys = new Set(leads.map(lead => lead.key));

      // Check if there is at least one key not selected
      const hasUnselected = [...allKeys].some(key => !prev.has(key));

      if (hasUnselected) {
        // Select all
        return allKeys;
      } else {
        // All were already selected, so deselect all
        return new Set();
      }
    });
  };

  // check if selected
  const isSelected = (key) => selected.has(key);

  // clear
  const clearSelection = () => setSelected(new Set());

  // get array of keys
  const selectedKeys = () => Array.from(selected);

  const handleSendText = async () => {
    const keys = Array.from(selected);
    if (!keys.length) {
      alert('Select at least one lead to text.');
      return;
    }

    // open the compose modal if not already open
    setTextOpen(true);
  };

  const handleSendEmail = async () => {
    const keys = Array.from(selected);
    if (!keys.length) {
      alert('Select at least one lead to email.');
      return;
    }

    // open the compose modal if not already open
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
      const headers =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      headers.set('Content-Type', 'application/json');

      for (const recipients of batches) {
        const payload = {
          message: textBody,      // worker expects `message`
          recipients,
          listType: "leads",
        };

        console.log('[LeadsTable submitText] batch payload ->', payload);

        const res = await fetch(
          'https://worker-consolidated.maxli5004.workers.dev/text',
          {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          }
        );

        const responseText = await res.text().catch(() => '');
        let responseJson = null;
        try { responseJson = JSON.parse(responseText); } catch (_) {}

        if (!res.ok) {
          console.error('Text API error (leads batch):', res.status, 'body:', responseText);
          alert('Some text batches failed — check console for details.');
          break;
        } else {
          console.log('[LeadsTable submitText] batch response:', responseJson || responseText);
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
      const headers =
        baseHeaders instanceof Headers ? baseHeaders : new Headers(baseHeaders || {});
      headers.set('Content-Type', 'application/json');

      for (const recipients of batches) {
        const payload = {
          subject: emailSubject,
          body: emailBody,      // required by worker
          message: emailBody,   // backwards compatibility
          recipients,
          listType: "leads",
        };

        console.log('[LeadsTable submitEmail] batch payload ->', payload);

        const res = await fetch(
          'https://worker-consolidated.maxli5004.workers.dev/email',
          {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          }
        );

        const responseText = await res.text().catch(() => '');
        let responseJson = null;
        try { responseJson = JSON.parse(responseText); } catch (_) {}

        if (!res.ok) {
          console.error('Email API error (leads batch):', res.status, 'body:', responseText);
          alert('Some email batches failed — check console for details.');
          break;
        } else {
          console.log('[LeadsTable submitEmail] batch response:', responseJson || responseText);
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
      const res = await fetch(
        `https://worker-consolidated.maxli5004.workers.dev/edit-lead`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ key, data: editedData }),
        }
      );

      if (res.ok) {
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.key === key ? { ...lead, data: { ...editedData } } : lead
          )
        );
        handleCancelEdit();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Error saving changes', err);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  // --- unified delete handler (replace your handleDelete & handleMassDelete) ---
  const handleDelete = async (keyOrKeys) => {
    // normalize to array
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    if (!keys.length) return;

    // confirmation message depends on count
    const confirmMsg =
      keys.length === 1
        ? 'Are you sure you want to delete this record?'
        : `Delete ${keys.length} selected lead(s)? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const headers = await buildHeaders();
      // send array of keys; backend should handle single-or-multiple
      const res = await fetch(
        `https://worker-consolidated.maxli5004.workers.dev/delete-lead`, // keep endpoint or change to /delete-leads if you like
        {
          method: 'DELETE', // you can also use POST if your worker prefers; keep consistent with backend
          headers,
          body: JSON.stringify({ keys }), // always send an array
        }
      );

      if (res.ok) {
        // remove all deleted keys from local state
        const keySet = new Set(keys);
        setLeads((prevLeads) => prevLeads.filter((lead) => !keySet.has(lead.key)));

        // clear selection if any of the deleted items were selected
        setSelected((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });

        // close actions menu if it was open
        setActionsOpen(false);
      } else {
        // try to get error message, fallback gracefully
        const err = await res.json().catch(() => ({}));
        console.error('Error deleting record(s):', err);
        alert('Delete failed — check console for details.');
      }
    } catch (error) {
      console.error('Network error deleting record(s):', error);
      alert('Network error during delete. See console.');
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
    if (!keys.length) return alert('Select at least one lead to mark.');
    setLeads((prev) => prev.map((l) => (selected.has(l.key) ? { ...l, data: { ...l.data, contacted: true } } : l)));
    clearSelection();
    setActionsOpen(false);
  };

  return (
    <div className="ct-client-table-container">
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

      <h1>Leads</h1>

      {/* Toolbar with Actions dropdown */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div ref={actionsRef} style={{ position: 'relative' }}>
          <button
            className="mass-actions-btn"
            onClick={() => setActionsOpen(s => !s)}
            title={selected.size === 0 ? 'Select rows to enable actions' : `${selected.size} selected`}
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

              <div style={{ padding: '6px 12px', fontSize: 12, color: '#666' }}>
                {selected.size === 0 ? 'No rows selected' : `${selected.size} selected`}
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
              <button className='select-all-button' onClick={() => selectAll()}>
                Select <br /> All
              </button>
            </th>

            <th className="small"></th>

            {/* ✅ sortable headers (same look/arrow pattern as your other tables) */}
            <th onClick={() => handleSort('firstName')}>
              <div className="ct-header">
                <div className="ct-table-header"><p>First Name</p></div>
                <div className="ct-header-arrow">
                  {sortColumn === 'firstName' && (sortDirection === 'asc' ? '↓' : '↑')}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort('lastName')}>
              <div className="ct-header">
                <div className="ct-table-header">Last Name</div>
                <div className="ct-header-arrow">
                  {sortColumn === 'lastName' && (sortDirection === 'asc' ? '↓' : '↑')}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort('email')}>
              <div className="ct-header">
                <div className="ct-table-header">Email</div>
                <div className="ct-header-arrow">
                  {sortColumn === 'email' && (sortDirection === 'asc' ? '↓' : '↑')}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort('phone')}>
              <div className="ct-header">
                <div className="ct-table-header">Phone</div>
                <div className="ct-header-arrow">
                  {sortColumn === 'phone' && (sortDirection === 'asc' ? '↓' : '↑')}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort('notes')}>
              <div className="ct-header">
                <div className="ct-table-header">Notes</div>
                <div className="ct-header-arrow">
                  {sortColumn === 'notes' && (sortDirection === 'asc' ? '↓' : '↑')}
                </div>
              </div>
            </th>

            <th onClick={() => handleSort('createdAt')}>
              <div className="ct-header">
                <div className="ct-table-header">TimeStamp</div>
                <div className="ct-header-arrow">
                  {sortColumn === 'createdAt' && (sortDirection === 'asc' ? '↓' : '↑')}
                </div>
              </div>
            </th>

            <th className="small"></th>
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
                    onChange={() => {
                      setSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(lead.key)) next.delete(lead.key);
                        else next.add(lead.key);
                        return next;
                      });
                    }}
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
                        value={editedData.email || ''}
                        onChange={(e) => handleInputChange(e, 'email')}
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
                      <textarea
                        type="text"
                        value={editedData.notes || ''}
                        onChange={(e) => handleInputChange(e, 'notes')}
                      />
                    </td>
                    <td>
                      <td>
                        {lead.data.createdAt
                          ? (() => {
                              const d = new Date(lead.data.createdAt);
                              if (isNaN(d)) return '';
                              const month = d.toLocaleString('en-US', { month: 'short' }).toLowerCase();
                              const day = String(d.getDate()).padStart(2, '0');
                              const year = d.getFullYear();
                              return `${month}-${day}-${year}`;
                            })()
                          : ''}
                      </td>
                    </td>
                  </>
                ) : (
                  <>
                    <td><p>{lead.data.firstName}</p></td>
                    <td>{lead.data.lastName}</td>
                    <td>{lead.data.email}</td>
                    <td>{lead.data.phone}</td>
                    <td>{lead.data.notes}</td>
                    <td>
                      {lead.data.createdAt
                        ? (() => {
                            const d = new Date(lead.data.createdAt);
                            if (isNaN(d)) return '';
                            const month = d.toLocaleString('en-US', { month: 'short' }).toLowerCase();
                            const day = String(d.getDate()).padStart(2, '0');
                            const year = d.getFullYear();
                            return `${month}-${day}-${year}`;
                          })()
                        : ''}
                    </td>
                  </>
                )}

                <td className="small">
                  <button className="delete-btn" onClick={() => handleDelete(lead.key)}>
                    🗑️
                  </button>
                </td>

                <td className="small">
                  <button
                    className="convert-btn"
                    onClick={() => handleConvertToClient(lead)}
                    title="Convert to Client"
                  >
                    ➡️
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* Add Lead modal/inline form */}
      <AddLead setLeads={setLeads} buildHeaders={buildHeaders} />
    </div>
  );
}

export default LeadsTable;
