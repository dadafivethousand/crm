import React, { useState, useEffect } from 'react';
import './Stylesheets/ClientTable.css';
import noemailimg from './Images/noemail.avif'
import sendemail from "./Images/sendemail.png"

function ClientTable({ membershipInfo, clients, setClients }) {
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortColumn, setSortColumn] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

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

  useEffect(() => {
    setClients(sortClients(clients, sortColumn, sortDirection));
  }, [sortColumn, sortDirection]);

  const sortClients = (clients, column, direction) => {
    return [...clients].sort((a, b) => {
      let valueA = a.data[column]?.toString().toLowerCase() || "";
      let valueB = b.data[column]?.toString().toLowerCase() || "";
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

  const updateEndDate = (duration, membershipInfo, startDate) => {
    if (!startDate) return "";
    const date = new Date(startDate);
    const match = membershipInfo.info.find((m) => m.description === duration);
    if (match) {
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
      const res = await fetch(`https://worker-consolidated.maxli5004.workers.dev/edit-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data: editedData }),
      });
      if (res.ok) {
        setClients((prev) =>
          prev.map((c) => (c.key === key ? { ...c, data: editedData } : c))
        );
        handleCancelEdit();
      }
    } catch (err) {
      console.error('Error saving changes:', err);
    }
  };

  const handleDelete = async (key) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        const res = await fetch(`https://worker-consolidated.maxli5004.workers.dev/delete-client`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });
        if (res.ok) {
          setClients((prev) => prev.filter((c) => c.key !== key));
        }
      } catch (err) {
        console.error('Error deleting record:', err);
      }
    }
  };

  const handleNoEmail = async (key, type) => {
    try {
      const res = await fetch(`https://worker-consolidated.maxli5004.workers.dev/do-not-mail-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, type }),
      });
      if (res.ok) {
        setClients((prev) =>
          prev.map((c) =>
            c.key === key ? { ...c, data: { ...c.data, doNotMail: true } } : c
          )
        );
      }
    } catch (err) {
      console.error('Error updating do-not-mail list:', err);
    }
  };

  return (
    <div className="ct-client-table-container">
      <h1>{clients.length} Adult & Teen Students</h1>
      <table className="ct-client-table">
        <thead>
          <tr>
            <th className="ct-small"></th>
            {headers.map((header) => (
            <th key={header.key} onClick={() => handleSort(header.key)} className={`ct-th-${header.key}`}>
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
          {clients
            .filter((client) => client?.data && !client.data.kidsMembership)
            .map((client, index) => (
              <tr
                key={index}
                className={
                  client.data.endDate && new Date() >= new Date(client.data.endDate)
                    ? "ct-red"
                    : "ct-regular"
                }
              >
                <td className="ct-small">
                  {editingRow === index ? (
                    <>
                      <button className="ct-save-btn" onClick={() => handleSaveChanges(client.key)}>✅</button>
                      <button className="ct-cancel-btn" onClick={handleCancelEdit}>❌</button>
                    </>
                  ) : (
                    <>
                      <div className="ct-button-flex">
                        <button className="ct-edit-btn" onClick={() => handleEditClick(index, client.data)}>✏️</button>
                      </div>
                      <button
                         onClick={() => handleNoEmail(client.key, "student")}
                         id='ct-no-email-button'
                      >
                       {client.data.doNotMail ? <img id='no-email' src={noemailimg} /> : <img id='no-email' src={sendemail} />}
                      </button>
                    </>
                  )}
                </td>

                {editingRow === index ? (
                  <>
                    {headers.map((header) => (
                      <td key={header.key}>
                        {header.key === "membershipDuration" ? (
                          <select
                            value={editedData[header.key] || ""}
                            onChange={(e) => handleInputChange(e, header.key)}
                          >
                            {membershipInfo.info.map((m) =>
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

                <td className="ct-small">
                  <button className="ct-delete-btn" onClick={() => handleDelete(client.key)}>🗑️</button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default ClientTable;
