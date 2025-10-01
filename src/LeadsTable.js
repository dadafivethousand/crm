import React, { useState } from 'react';
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

  const handleDelete = async (key) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const headers = await buildHeaders();
      const res = await fetch(
        `https://worker-consolidated.maxli5004.workers.dev/delete-lead`,
        {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ key }),
        }
      );

      if (res.ok) {
        setLeads((prevLeads) => prevLeads.filter((lead) => lead.key !== key));
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Error deleting record', err);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const handleConvertToClient = (lead) => {
    setConvertToClientData(lead.data);
    setShowClientForm(true);
  };

  return (
    <div className="client-table-container">
      <h1>Free Trial</h1>
      <table className="client-table">
        <thead>
          <tr>
            <th className="small"> </th>
            <th><p>First Name</p></th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th className="small"></th>
            <th className="small"></th>
          </tr>
        </thead>
        <tbody>
          {leads
            ?.filter((lead) => lead && lead.data)
            .map((lead, index) => (
              <tr key={lead.key ?? index}>
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
                  </>
                ) : (
                  <>
                    <td><p>{lead.data.firstName}</p></td>
                    <td>{lead.data.lastName}</td>
                    <td>{lead.data.email}</td>
                    <td>{lead.data.phone}</td>
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
