import React, { useState, useEffect } from 'react';
import './Stylesheets/ClientTable.css';
import AddClient from './AddClient';

function ClientTable({ membershipInfo, clients, setClients}) {
  console.log(clients)
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortColumn, setSortColumn] = useState("firstName");
const [sortDirection, setSortDirection] = useState("asc");

useEffect(() => {
  setClients(sortClients(clients, sortColumn, sortDirection));
}, [sortColumn, sortDirection]); // Sort whenever column or direction changes

  const sortClients = (clients, column, direction) => {
    return [...clients].sort((a, b) => {
      let valueA = a.data[column]?.toString().toLowerCase() || "";
      let valueB = b.data[column]?.toString().toLowerCase() || "";
  
      if (valueA < valueB) return direction === "asc" ? -1 : 1;
      if (valueA > valueB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };
  

  const handleEditClick = (index, clientData) => {
    setEditingRow(index);
    setEditedData(clientData);
  };

  const updateEndDate = (duration, membershipInfo, startDate) => {
    if (!startDate) return "";

    const date = new Date(startDate);

    // Find the membership matching the given duration
    const matchingMembership = membershipInfo.find(
        (membership) => membership.description === duration

    );

    // If a match is found, update the date
    if (matchingMembership) {
      console.log('matchingmembershipfound')
        date.setMonth(date.getMonth() + matchingMembership.duration);
        return date.toISOString().split("T")[0]; // Return formatted date
    }

    // If no match is found, return an empty string
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

      // Recalculate end date if membershipDuration or startDate is updated
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
      const response = await fetch(`https://worker-consolidated.maxli5004.workers.dev/edit-client`, {
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
        const response = await fetch(`https://worker-consolidated.maxli5004.workers.dev/delete-client`, {
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

  //this function is to put the client on the do not mail list
  const handleNoEmail = async (key) => {

      try {
        const response = await fetch(`https://worker-consolidated.maxli5004.workers.dev/do-not-mail-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });
  
        if (response.ok) {
          setClients((prevClients) =>
            prevClients.map((client) =>
              client.key === key ? { ...client, data: { ...editedData } } : client
            )
          );
          window.location.reload();
 
        } else {
          console.error('Error adding client to the do not mail list');
        }
      } catch (error) {
        console.error('EError adding client to the do not mail list:', error);
      }
 
  };

   
 
 
  

  return (
    <div className="client-table-container">

 
 
      <table className="client-table">
        <thead>
          <tr>
            <th className='small'> </th>
            <th><p>First Name </p></th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Payment Status</th>
            <th>Membership Duration</th>
            <th>1 Week Expiration Notification Sent</th>
            <th>Kids</th>
            <th className='small'></th>
          </tr>
        </thead>
        <tbody>
          {clients
           .filter((client) => client && client.data)  //Filter out null or undefined clients
          .map((client, index) => (
            <tr key={index}>
              <td className='small'>
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
                  <>
                  <button
                    className="edit-btn"
                    onClick={() => handleEditClick(index, client.data)}
                  >
                    ✏️
                  </button>

                     <button
                    className={`no-mail-button ${client.data.doNotMail ? 'active' : ''}`}
                    onClick={() => handleNoEmail(client.key)}
                  >
                   Don't Email
                  </button>
                  </>

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
              {membershipInfo.map((membership) => (
                            !membership.free && membership.description?
                            <option key={membership.description} value={membership.description}>
                    {membership.description}
                </option> : null
            ))}
                    </select>
                  </td>
                  <td>{client.data.expiringSoon ? "yes": 'no'}</td>
                </>
              ) : (
                <>
                  <td> <p>{client.data.firstName}</p></td>
                  <td>{client.data.lastName}</td>
                  <td>{client.data.email}</td>
                  <td>{client.data.phone}</td>
                  <td>{client.data.startDate}</td>
                  <td>{client.data.endDate}</td>
                  <td>{client.data.paymentStatus}</td>
                  <td>{client.data.membershipDuration}</td>
                  <td>{client.data.expiringSoon ? "yes": 'no'}</td>
                  <td>
  {client.data.kids && client.data.kids.length > 0 ? (
    client.data.kids.map((kid, i) => (
      <div key={i}>
        {kid.firstName} {kid.lastName} ({kid.dob})
      </div>
    ))
  ) : (
    "No kids"
  )}
</td>
         
                </>
              )}
              <td className='small'>
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
