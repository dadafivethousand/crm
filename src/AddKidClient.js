import './Stylesheets/AddClient.css';
import { useState, useEffect } from 'react';

export default function AddKidClient(token, user) {
    // Initialize state
    const [showKidClientForm, setShowKidClientForm] = useState(() => {
        const savedShowKidClientForm = localStorage.getItem("showKidClientForm");
        console.log("Loaded kidClientForm from localStorage:", savedShowKidClientForm);
        return savedshowLeadForm === "true";
    });

    const [formData, setFormData] = useState(() => {
        const savedFormData = localStorage.getItem("formData");
        return savedFormData ? JSON.parse(savedFormData) : {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            timestamp: "", // Add this field
        };
    });

    const closeForm = () => {
        setshowLeadForm(false);
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            timestamp: "", // Add this field
        });
    };

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("showLeadForm", showLeadForm.toString());
        localStorage.setItem("formData", JSON.stringify(formData));
    }, [showLeadForm, formData]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Set the timestamp at the time of form submission
        const timestamp = new Date().toISOString();

        try {
            const response = await fetch("https://worker-consolidated.maxli5004.workers.dev/add-lead", {
                method: "POST",
                     headers: {
         "Content-Type": "application/json",
         "Authorization": `Bearer ${idToken}`
            },
                body: JSON.stringify({ ...formData, timestamp }), // Include the timestamp
            });

            if (response.ok) {
                const newLeadKey = `lead:${formData.email}`;
                const newLeadData = { key: newLeadKey, data: { ...formData, timestamp } };

                setLeads((prevLeads) => [
                    ...prevLeads,
                    newLeadData // Add the new lead to the list
                ]);
                setshowLeadForm(false);
                setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    timestamp: "",
                });
                localStorage.removeItem("showLeadForm");
                localStorage.removeItem("formData");
            } else {
                const errorData = await response.json();
                console.error("Error:", errorData);
                alert("Failed to add lead.");
            }
        } catch (error) {
            console.error("Request failed:", error);
            alert("An error occurred while adding the lead.");
        }
    };

    return (
        <div className='add-client-container'>
            <button className='plus' onClick={() => setshowLeadForm(true)}>Add Lead</button>

            {showLeadForm && (
                <div className="overlay">
                    <form className="user-form" onSubmit={handleSubmit}>
                        <h2>Add New Lead</h2>

                        <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First Name" />
                        <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last Name" />
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email" />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone Number" />

                        <button type="submit">Save</button>
                        <button type="button" onClick={() => closeForm()}>Cancel</button>
                    </form>
                </div>
            )}
        </div>
    );
}
