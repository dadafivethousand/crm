import React, { useState, useEffect } from 'react';
import './Stylesheets/ClientTable.css';
import AddClient from './AddClient';
import noemailimg from './Images/noemail.avif'
import sendemail from "./Images/sendemail.png"

function KidsTable({ membershipInfo, clients, setClients, kids, setKids, token, user }) {
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortColumn, setSortColumn] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

  const [headers, setHeaders] = useState([
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
  ]);

  useEffect(() => {
    setKids(sortClients(kids, sortColumn, sortDirection));
  }, [sortColumn, sortDirection]);

  const sortClients = (kids, column, direction) => {
    return [...kids].sort((a, b) => {
      let valueA = a.data[column]?.toString().toLowerCase() || "";
      let valueB = b.data[column]?.toString().toLowerCase() || "";
      if (valueA < valueB) return direction === "asc" ? -1 : 1;
      if (valueA > valueB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((prevDirection) => (prevDirection === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const handleEditClick = (index, clientData) => {
    setEditingRow(index);
    setEditedData(clientData);
  };

  const updateEndDate = (duration, membershipInfo, startDate) => {
    if (!startDate) return "";
    const date = new Date(startDate);
    const matchingMembership = membershipInfo.find(
      (membership) => membership.description === duration
    );
    if (matchingMembership) {
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
      const idToken = await user.getIdToken(); // always fresh
      const response = await fetch(`https://worker-consolidated.maxli5004.workers.dev/edit-kid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ key, data: editedData }),
      });

      if (response.ok) {
        setKids((prevKids) =>
          prevKids.map((client) =>
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

  const handleDelete = async (key, client) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        const idToken = await user.getIdToken(); // always fresh
        const response = await fetch(`https://worker-consolidated.maxli5004.workers.dev/delete-kid`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${idToken}` },
          body: JSON.stringify({ key }),
        });

        const data = await response.json();

        if (response.ok) {
          setKids((prevKids) =>
            prevKids.filter((kid) => kid.key !== key)
          );
        } else {
          console.error('Error deleting record:', data);
        }
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
  };

  const handleNoEmail = async (key, type) => {
    try {
      const idToken = await user.getIdToken(); // always fresh
      const response = await fetch(`https://worker-consolidated.maxli5004.workers.dev/do-not-mail-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' , "Authorization": `Bearer ${idToken}`},
        body: JSON.stringify({ key, type }),
      });

      if (response.ok) {
        setClients((prevClients) =>
          prevClients.map((client) =>
            client.key === key ? { ...client, data: { ...editedData } } : client
          )
        );
      } else {
        console.error('Error updating do-not-mail list');
      }
    } catch (error) {
      console.error('Error updating do-not-mail list:', error);
    }
  };

  return (
    <div className="ct-client-table-container">
      <h1>{kids.length} Kid Students</h1>
      <table className="ct-client-table">
        <thead>
          <tr>
            <th className="ct-small"> </th>
            {headers.map((header) => (
              <th key={header.key} onClick={() => handleSort(header.key)}>
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
          {kids.map((client, index) => (
            <tr
              key={index}
              className={`${
                client.data.endDate && new Date() >= new Date(client.data.endDate)
                  ? 'ct-red'
                  : ''
              }`}
            >
              <td className="ct-small">
                {editingRow === index ? (
                  <>
                    <button className="ct-save-btn" onClick={() => handleSaveChanges(client.key)}>✅</button>
                    <button className="ct-cancel-btn" onClick={handleCancelEdit}>❌</button>
                  </>
                ) : (
                  <>
                    <button className="ct-edit-btn" onClick={() => handleEditClick(index, client.data)}>✏️</button>
                             <button
                         onClick={() => handleNoEmail(client.key, "student")}
                      >
                       {client.data.doNotMail ? <img id='no-email' src={noemailimg} /> : <img id='no-email' src={sendemail} />}
                      </button>
                  </>
                )}
              </td>

              {editingRow === index ? (
                <>
                  <td><input type="text" value={editedData.firstName || ''} onChange={(e) => handleInputChange(e, 'firstName')} /></td>
                  <td><input type="text" value={editedData.lastName || ''} onChange={(e) => handleInputChange(e, 'lastName')} /></td>
                  <td><input type="email" value={editedData.email || ''} onChange={(e) => handleInputChange(e, 'email')} /></td>
                  <td><input type="tel" value={editedData.phone || ''} onChange={(e) => handleInputChange(e, 'phone')} /></td>
                  <td><input type="date" value={editedData.startDate || ''} onChange={(e) => handleInputChange(e, 'startDate')} /></td>
                  <td><input type="date" value={editedData.endDate || ''} onChange={(e) => handleInputChange(e, 'endDate')} /></td>
                  <td><input type="text" value={editedData.paymentStatus || ''} onChange={(e) => handleInputChange(e, 'paymentStatus')} /></td>
                  <td>
                    <select value={editedData.membershipDuration || ''} onChange={(e) => handleInputChange(e, 'membershipDuration')}>
                      {membershipInfo.info.map((membership) =>
                        !membership.free ? (
                          <option key={membership.description} value={membership.description}>
                            {membership.description}
                          </option>
                        ) : null
                      )}
                    </select>
                  </td>
                  <td><input type="text" value={editedData.parentFirstName || ''} onChange={(e) => handleInputChange(e, 'parentFirstName')} /></td>
                  <td><input type="text" value={editedData.parentLastName || ''} onChange={(e) => handleInputChange(e, 'parentLastName')} /></td>
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

              <td className="ct-small">
                <button className="ct-delete-btn" onClick={() => handleDelete(client.key, client)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default KidsTable;
