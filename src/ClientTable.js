import React, { useState, useEffect } from 'react';
import './Stylesheets/ClientTable.css';
import AddClient from './AddClient';

function ClientTable({ membershipInfo, clients, setClients}) {
  console.log(clients)
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortColumn, setSortColumn] = useState("firstName");
const [sortDirection, setSortDirection] = useState("asc");
const [reminder, setReminderWindow] = useState(false)
 

const [headers, setHeaders] = useState([
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "startDate", label: "Start Date" },
  { key: "endDate", label: "End Date" },
  { key: "paymentStatus", label: "Payment Status" },
  { key: "membershipDuration", label: "Membership Duration" },
  { key: "expiringSoon", label: "Expiring Soon" },
 
]);



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

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((prevDirection) => (prevDirection === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };
  
  function calculatePaymentDates(startDate, endDate) {
    const paymentDates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= new Date(endDate)) {
        paymentDates.push(new Date(currentDate)); // Add current payment date to the list
        currentDate.setMonth(currentDate.getMonth() + 1); // Move to the next month
    }

    return paymentDates.map(date => date.toISOString()); // Convert to ISO strings for the backend
}

async function handleToggleInstallmentReminders(student) {
    const { startDate, endDate } = student.data;
  console.log(startDate, endDate, student.key)
    // Calculate payment dates
    const reminderDates = calculatePaymentDates(startDate, endDate);

    // Send request to backend
    const response = await fetch('https://worker-consolidated.maxli5004.workers.dev/installment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: student.key, reminderDates }),
    });

    if (response.ok) {
        console.log("Reminders successfully set!");
    } else {
        console.error("Failed to set reminders.");
    }
}


  const handleEditClick = (index, clientData) => {
    setEditingRow(index);
    setEditedData(clientData);
  };

  const updateEndDate = (duration, membershipInfo, startDate) => {
    if (!startDate) return "";

    const date = new Date(startDate);
    console.log(membershipInfo)
    // Find the membership matching the given duration
    const matchingMembership = membershipInfo.info.find(
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
      <h1>Adult & Teen Students</h1>

 
 
      <table className="client-table">
      <thead>
          <tr>
            <th className="small"></th> {/* For edit/delete buttons */}
            {headers.map((header) => (
              <th key={header.key}  onClick={() => handleSort(header.key)}>
                <div className='header'>
               <div className='table-header'> {header.label}</div>
               <div className='header-arrow'>  {sortColumn === header.key && (sortDirection === "asc" ? "↓" : "↑")}</div>
               </div>
              </th>
            ))}
            <th className="small"></th> {/* For additional actions */}
          </tr>
      </thead>

        <tbody>
          {clients
           .filter((client) => client && client.data && !client.data.kidsMembership)  //Filter out null or undefined clients
          .map((client, index) => (
            <tr key={index}
            className={`${client.data.endDate && new Date() >= new Date(client.data.endDate) ? 'red' : ''}`}
             >

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
                  <div className='button-flex'>
                  <button
                    className="edit-btn"
                    onClick={() => handleEditClick(index, client.data)}
                  >
                    ✏️
                  </button>
                  <button
                  className={`reminder-btn ${client.data.reminderDates ? 'active' : ''}`}
                  onClick={() => handleToggleInstallmentReminders(client)}
                  >
                      🔔
                  </button>
                  </div>
                     <button
                    className={`no-mail-button ${client.data.doNotMail ? 'active' : ''}`}
                    onClick={() => handleNoEmail(client.key)}
                  >
                   No Email
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
              {membershipInfo.info.map((membership) => (
                          !membership.free && membership.description && membership.duration?
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
               
  {/* {client.data.kids && client.data.kids.length > 0 ? (
    client.data.kids.map((kid, i) => (
      <div key={i}>
        {kid.firstName} {kid.lastName} ({kid.dob})
      </div>
    ))
  ) : (
    "No kids"
  )} */}
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
