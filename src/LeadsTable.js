import React, { useState, useEffect, useRef } from 'react';
import './Stylesheets/ClientTable.css';
import AddLead from './AddLead';

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
  // initialize
const [selected, setSelected] = useState(() => new Set());
 const [actionsOpen, setActionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const actionsRef = useRef(null);

  
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

// check if selected
const isSelected = (key) => selected.has(key);

// clear
const clearSelection = () => setSelected(new Set());

// get array of keys
const selectedKeys = () => Array.from(selected);

    const handleSendEmail = async () => {
    const keys = Array.from(selected);
    if (!keys.length) return alert('Select at least one lead to email.');
    // TODO: implement actual email flow (open modal, call API, etc.)
    console.log('Send email to keys:', keys);
    setActionsOpen(false);
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
      <h1>Free Trial</h1>
      
      {/* Toolbar with Actions dropdown */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
       <div ref={actionsRef} style={{ position: 'relative' }}>
  {/* Always enabled so user can open menu; show reason in title */}
  <button
    className="mass-actions-btn"
    onClick={() => setActionsOpen(s => !s)}
    title={selected.size === 0 ? 'Select rows to enable actions' : `${selected.size} selected`}
    disabled={loading}                 // only disable while loading
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
        disabled={loading || selected.size === 0}    // disabled until selection
        aria-disabled={selected.size === 0}
      >
        Send Email
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

      {/* optional quick helper */}
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
             <th className="small"> </th>
            <th className="small"> </th>
            <th><p>First Name</p></th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Notes</th>
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
                      <button
                        className="save-btn"
                        onClick={() => handleSaveChanges(lead.key)}
                      >
                        ✅
                      </button>
                      <button className="cancel-btn" onClick={handleCancelEdit}>
                        ❌
                      </button>
                    </>
                  ) : (
                    <button
                      className="edit-btn"
                      onClick={() => handleEditClick(index, lead.data)}
                    >
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
                  </>
                ) : (
                  <>
        
                    <td><p>{lead.data.firstName}</p></td>
                    <td>{lead.data.lastName}</td>
                    <td>{lead.data.email}</td>
                    <td>{lead.data.phone}</td>
                    <td>{lead.data.notes}</td>
                  </>
                )}

                <td className="small">
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(lead.key)}
                  >
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
