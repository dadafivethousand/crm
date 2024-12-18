import './Stylesheets/AddClient.css';
import { useState, useEffect } from 'react';

export default function AddClient({setClients}) {
    // Initialize state
    const [showForm, setShowForm] = useState(() => {
        const savedShowForm = localStorage.getItem("showForm");
        console.log("Loaded showForm from localStorage:", savedShowForm);
        return savedShowForm === "true";
    });

    const [formData, setFormData] = useState(() => {
        const savedFormData = localStorage.getItem("formData");
      
        return savedFormData ? JSON.parse(savedFormData) : {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            dob: "",
            startDate: "",
            membershipDuration: "1-month",
            endDate: "",
            expiringSoon: false,
            timestamp: "", // Add this fiel
        };
    });


    const closeForm=()=>{
        setShowForm(false)
        setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                dob: "",
                startDate: "",
                membershipDuration: "1-month",
                endDate: "",
                expiringSoon: false,
                timestamp: "", // Add this fiel
            })
    }

    

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("showForm", showForm.toString());
        localStorage.setItem("formData", JSON.stringify(formData));
    }, [showForm, formData]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
    
        // Update formData with the new value
        setFormData((prevData) => {
            const updatedData = { ...prevData, [name]: value };
    
            // If either 'membershipDuration' or 'startDate' is updated, recalculate the end date
            if (name === "membershipDuration" || name === "startDate") {
                updateEndDate(
                    name === "membershipDuration" ? value : prevData.membershipDuration,
                    name === "startDate" ? value : prevData.startDate
                );
            }
    
            return updatedData;
        });
    };
    

    // Update end date based on membership duration
    const updateEndDate = (duration, startDate) => {
        if (!startDate) return;
    
        const date = new Date(startDate);
        switch (duration) {
            case "1-month":
                date.setMonth(date.getMonth() + 1);
                break;
            case "6-month":
                date.setMonth(date.getMonth() + 6);
                break;
            case "annual":
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                return;
        }
    
        const endDate = date.toISOString().split("T")[0];
        setFormData((prevData) => ({
            ...prevData,
            endDate,
            expiringSoon: checkExpiringSoon(endDate),
        }));
    };
    

    // Check if the membership is expiring within one month
    const checkExpiringSoon = (endDate) => {
        const currentDate = new Date();
        const expirationDate = new Date(endDate);
        const oneMonthFromNow = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        return expirationDate <= oneMonthFromNow;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
    
        // Set the timestamp at the time of form submission
        const timestamp = new Date().toISOString();
    
        try {
            const response = await fetch("https://my-cloudflare-worker.maxli5004.workers.dev/add-client", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...formData, timestamp }), // Include the timestamp
            });
    
            if (response.ok) {
                const newClientKey = `student:${formData.email}`;
                const newClientData = { key: newClientKey, data: { ...formData, timestamp } };
            
                setClients((prevClients) => [
                    ...prevClients,
                    newClientData // Add the new client to the list
                ]);
                 setShowForm(false);
                setFormData({
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
                });
                localStorage.removeItem("showForm");
                localStorage.removeItem("formData");
 
            } else {
                const errorData = await response.json();
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
            <button className='plus' onClick={() => setShowForm(true)}>+</button>

            {showForm && (
                <div className="overlay">
                    <form className="user-form" onSubmit={handleSubmit}>
                        <h2>Add New Client</h2>

                        <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First Name"   />
                        <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last Name"   />
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email"   />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone Number"   /> 
                        <label>Date of Birth:</label>
                        <input type="date" name="dob" value={formData.dob} onChange={handleInputChange}   /> <br></br>
                        <label>Membership Start Date:</label>
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange}   />
                        <label>Membership Duration:</label>
                        <select name="membershipDuration" value={formData.membershipDuration} onChange={handleInputChange}>
                            <option value="1-month">1-Month</option>
                            <option value="6-month">6-Month</option>
                            <option value="annual">Annual</option>
                        </select>
                        <label>Membership End Date:</label>
                        <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange}/>
                        <button type="submit">Save</button>
                        <button type="button" onClick={() => closeForm()}>Cancel</button>
                    </form>
                </div>
            )}
        </div>
    );
}
