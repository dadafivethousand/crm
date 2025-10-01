import './Stylesheets/AddClient.css';
import { useState, useEffect } from 'react';

export default function AddKidClient({
  buildHeaders,    // <-- from App; provides Authorization + X-Maple
  setLeads,        // <-- parent setter to append new lead
}) {
  const [showLeadForm, setShowLeadForm] = useState(() => {
    const saved = localStorage.getItem("showLeadForm");
    return saved === "true";
  });

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem("kidLeadFormData");
    return saved
      ? JSON.parse(saved)
      : {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          timestamp: "",
        };
  });

  const closeForm = () => {
    setShowLeadForm(false);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      timestamp: "",
    });
  };

  // Persist UI state
  useEffect(() => {
    localStorage.setItem("showLeadForm", String(showLeadForm));
    localStorage.setItem("kidLeadFormData", JSON.stringify(formData));
  }, [showLeadForm, formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const timestamp = new Date().toISOString();

    try {
      const headers = await buildHeaders(); // <-- includes X-Maple + Authorization
      const res = await fetch(
        "https://worker-consolidated.maxli5004.workers.dev/add-lead",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ ...formData, timestamp }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Add lead error:", err);
        alert("Failed to add lead.");
        return;
      }

      // Optimistically append to parent list (if provided)
      if (typeof setLeads === "function") {
        const newLeadKey = `lead:${formData.email}${timestamp.replace(/[-:.TZ]/g, "")}`;
        const newLeadData = { key: newLeadKey, data: { ...formData, timestamp } };
        setLeads((prev) => (Array.isArray(prev) ? [...prev, newLeadData] : [newLeadData]));
      }

      // Reset & close
      closeForm();
      localStorage.removeItem("showLeadForm");
      localStorage.removeItem("kidLeadFormData");
    } catch (error) {
      console.error("Request failed:", error);
      alert("An error occurred while adding the lead.");
    }
  };

  return (
    <div className="add-client-container">
      <button className="plus" onClick={() => setShowLeadForm(true)}>
        Add Lead
      </button>

      {showLeadForm && (
        <div className="overlay">
          <form className="user-form" onSubmit={handleSubmit}>
            <h2>Add New Lead</h2>

            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="First Name"
            />
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Last Name"
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email"
            />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Phone Number"
            />

            <div className="save-and-submit-buttons">
              <button type="submit">Save</button>
              <button type="button" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
