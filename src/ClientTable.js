import React, { useState } from 'react';
import './Stylesheets/ClientTable.css';

function ClientTable({ clients, setClients }) {
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});

  const handleEditClick = (index, clientData) => {
    setEditingRow(index);
    setEditedData(clientData);
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const handleInputChange = (e, field) => {
    const { value } = e.target;
    setEditedData((prevData) => ({ ...prevData, [field]: value }));
  };

  const handleSaveChanges = async (key) => {
    try {
      const response = await fetch(`https://my-cloudflare-worker.maxli5004.workers.dev/edit-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data: editedData }),
      });
  
      if (response.ok) {
        setClients((prevClients) =>
          prevClients.map((client) =>
            client.key === key ? { ...client, data: { ...editedData } } : client
          )
        );
        handleCancelEdit();
      } else {
        console.error('Error saving changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };
  
  const handleDelete = async (key) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        const response = await fetch(`https://my-cloudflare-worker.maxli5004.workers.dev/delete-client`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });
  
        if (response.ok) {
          setClients((prevClients) =>
            prevClients.filter((client) => client.key !== key)
          );
        } else {
          console.error('Error deleting record');
        }
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
  };
  

  return (
    <div className="client-table-container">
      <table className="client-table">
        <thead>
          <tr>
            <th className='small'></th>
            <th><p>First Name </p></th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Membership Duration</th>
            <th>Expiring Soon</th>
            <th className='small'></th>
          </tr>
        </thead>
        <tbody>
          {clients
           .filter((client) => client && client.data)  //Filter out null or undefined clients
          .map((client, index) => (
            <tr key={index}>
              <td>
                {editingRow === index ? (
                  <>
                    <button
                      className="save-btn"
                      onClick={() => handleSaveChanges(client.key)}
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
                    onClick={() => handleEditClick(index, client.data)}
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
                    <select
                      value={editedData.membershipDuration || ''}
                      onChange={(e) => handleInputChange(e, 'membershipDuration')}
                    >
                      <option value="1-month">1-Month</option>
                      <option value="3-month">3-Month</option>
                      <option value="annual">Annual</option>
                    </select>
                  </td>
                </>
              ) : (
                <>
                  <td> <p>{client.data.firstName}</p></td>
                  <td>{client.data.lastName}</td>
                  <td>{client.data.email}</td>
                  <td>{client.data.phone}</td>
                  <td>{client.data.startDate}</td>
                  <td>{client.data.endDate}</td>
                  <td>{client.data.membershipDuration}</td>
                  <td>{client.data.expiringSoon ? "yes": 'no'
                    }</td>
                </>
              )}
              <td>
                <button
                  className="delete-btn"
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
