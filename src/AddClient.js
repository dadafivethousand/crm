import KidsForm from './KidsForm';
import './Stylesheets/AddClient.css';
import { useState, useEffect } from 'react';

export default function AddClient({
   setForChild,
  forChild,
  membershipInfo,
  setConvertToClientData,
  clientFormData,
  showClientForm,
  setShowClientForm,
  setClients,
  setClientFormData,
  prefilledData = {},
  token,           // still available if you need it elsewhere
  user,            // still available if you need it elsewhere
  isMaple,         // not directly needed here since buildHeaders carries it, but fine to keep
  buildHeaders,    // <-- injected from App; must be passed in
}) {

  const [kidsFormData, setKidsFormData] = useState([{ firstName: '', lastName: '' }]);

  const closeForm = () => {
    setShowClientForm(false);
    setForChild(false)
    setConvertToClientData(null);
    setClientFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      startDate: "",
      membershipDuration: "1-month",
      endDate: "",
      expiringSoon: false,
      timestamp: "",
      confirmationEmail: true,
    });
  };
  console.log(forChild)
 

  // Persist minimal UI state
  useEffect(() => {
    localStorage.setItem("showClientForm", showClientForm.toString());
    localStorage.setItem("clientFormData", JSON.stringify(clientFormData));
  }, [showClientForm, clientFormData]);

  // Apply prefilled data (lead -> client conversion)
  useEffect(() => {
    setClientFormData((prev) => ({
      ...prev,
      ...prefilledData,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep kidsMembership flag in the formData
  useEffect(() => {
    setClientFormData((prev) => ({
      ...prev,
      kidsMembership: forChild,
    }));
  }, [forChild, setClientFormData]);

  // Sync kids array into the parent formData
  useEffect(() => {
    setClientFormData((prev) => ({
      ...prev,
      kids: kidsFormData,
    }));
  }, [kidsFormData, setClientFormData]);

  // Recompute endDate when startDate changes
  useEffect(() => {
    updateEndDate('1 Month', membershipInfo, clientFormData.startDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientFormData.startDate]);

  // Handle input updates
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setClientFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "membershipDuration" || name === "startDate") {
        updateEndDate(
          name === "membershipDuration" ? value : prev.membershipDuration,
          membershipInfo,
          name === "startDate" ? value : prev.startDate
        );
      }
      return updated;
    });
  };

  // Compute end date based on selected duration in membershipInfo
  const updateEndDate = (duration, membershipInfo, startDate) => {
    if (!startDate || !membershipInfo?.info?.length) return;

    const date = new Date(startDate);
    const matching = membershipInfo.info.find(
      (m) => m.description === duration
    );

    if (matching?.duration) {
      date.setMonth(date.getMonth() + matching.duration);
    }

    const endDate = date.toISOString().split("T")[0];
    setClientFormData((prev) => ({
      ...prev,
      endDate,
    }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    const timestamp = new Date().toISOString();
    const formDataToSend = {
      ...clientFormData,
      timestamp,
    };

    if (forChild) {
      formDataToSend.kids = kidsFormData;
    } else {
      delete formDataToSend.kids;
    }

    try {
      const headers = await buildHeaders(); // <-- use shared header builder
      const response = await fetch(
        "https://worker-consolidated.maxli5004.workers.dev/add-client",
        {
          method: "POST",
          headers,
          body: JSON.stringify(formDataToSend),
        }
      );

      if (response.ok) {
        const newClientKey = `student:${clientFormData.email}`;
        const newClientData = { key: newClientKey, data: { ...clientFormData, timestamp } };

        setClients((prev) => [...prev, newClientData]);

        setClientFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          dob: "",
          startDate: "",
          membershipDuration: "1-month",
          endDate: "",
          expiringSoon: false,
          timestamp: "",
          confirmationEmail: true,
        });

        localStorage.removeItem("showClientForm");
        localStorage.removeItem("clientFormData");

        setShowClientForm(false);
        window.location.reload();

        // If you later re-enable lead deletion after conversion:
        // if (prefilledData.email) {
        //   const delHeaders = await buildHeaders();
        //   await fetch(
        //     "https://worker-consolidated.maxli5004.workers.dev/delete-lead",
        //     {
        //       method: "DELETE",
        //       headers: delHeaders,
        //       body: JSON.stringify({ key: `lead:${prefilledData.email}` }),
        //     }
        //   );
        // }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error:", errorData);
        alert("Failed to add client.");
      }
    } catch (error) {
      console.error("Request failed:", error);
      alert("An error occurred while adding the client.");
    }
  };

  return (
    <div className='add-client-container'>
      <div className="overlay">
        <form className="user-form" onSubmit={handleSubmit}>
              {forChild && (
            <KidsForm
              kidsFormData={kidsFormData}
              setKidsFormData={setKidsFormData}
            />
          )}
{forChild?  <h2 className='new-client-title'>Parent's Info</h2>
:
          <h2 className='new-client-title'>Add New Client</h2>
}
          <div>
            <input
              type="text"
              name="firstName"
              value={clientFormData.firstName}
              onChange={handleInputChange}
              placeholder="First Name"
            />
            <input
              type="text"
              name="lastName"
              value={clientFormData.lastName}
              onChange={handleInputChange}
              placeholder="Last Name"
            />
            <input
              type="email"
              name="email"
              value={clientFormData.email}
              onChange={handleInputChange}
              placeholder="Email"
            />
            <input
              type="tel"
              name="phone"
              value={clientFormData.phone}
              onChange={handleInputChange}
              placeholder="Phone Number"
            />
            <br />
          </div>

     

      
          <br />
          <label>Membership Start Date:</label>
          <input
            type="date"
            name="startDate"
            value={clientFormData.startDate}
            onChange={handleInputChange}
          />
          <br />

          <label>Membership Duration:</label>
          <select
            name="membershipDuration"
            value={clientFormData.membershipDuration}
            onChange={handleInputChange}
          >
            {membershipInfo?.info?.map((membership) =>
              !membership.free && membership.description && membership.duration ? (
                <option key={membership.description} value={membership.description}>
                  {membership.description}
                </option>
              ) : null
            )}
          </select>

          <br />
          <label>Membership End Date:</label>
          <input
            type="date"
            name="endDate"
            value={clientFormData.endDate}
            onChange={handleInputChange}
          />
          <br />

          <div className="welcome-email">
            <label>
              <input
                id="email-checkbox"
                type="checkbox"
                checked={!clientFormData.confirmationEmail} // checked means "do not send"
                onChange={() =>
                  setClientFormData((prev) => ({
                    ...prev,
                    confirmationEmail: !prev.confirmationEmail,
                  }))
                }
              />
              Do not send welcome email
            </label>
          </div>

          <div className='save-and-submit-buttons'>
            <button type="submit">Save</button>
            <button type="button" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
