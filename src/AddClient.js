import './Stylesheets/AddClient.css';
import { useState, useEffect } from 'react';

export default function AddClient() {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dob: "",
        startDate: "",
        membershipDuration: "1-month",
        endDate: "",
        expiringSoon: false,
    });

    // Load state from local storage on mount
    useEffect(() => {
        const savedShowForm = localStorage.getItem("showForm");
        const savedFormData = localStorage.getItem("formData");

        if (savedShowForm === "true") setShowForm(true);
        if (savedFormData) setFormData(JSON.parse(savedFormData));
    }, []);

    // Save state to local storage on change
    useEffect(() => {
        localStorage.setItem("showForm", showForm);
        localStorage.setItem("formData", JSON.stringify(formData));
    }, [showForm, formData]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === "startDate" || name === "membershipDuration") {
            updateEndDate(value, name === "startDate" ? value : formData.startDate);
        }
    };

    // Update end date based on membership duration
    const updateEndDate = (duration, startDate) => {
        if (!startDate) return;

        const date = new Date(startDate);
        switch (duration) {
            case "1-month":
                date.setMonth(date.getMonth() + 1);
                break;
            case "3-month":
                date.setMonth(date.getMonth() + 3);
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
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Submitting form:", formData);
        setShowForm(false);
        localStorage.removeItem("showForm");
        localStorage.removeItem("formData");
    };

    return (
        <div className='add-client-container'>
            <button onClick={() => setShowForm(true)}>Add Client</button>

            {showForm && (
                <div className="overlay">
                    <form className="user-form" onSubmit={handleSubmit}>
                        <h2>Add New Client</h2>

                        <div className="form-row">
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                placeholder="First Name"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                placeholder="Last Name"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Email"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="Phone Number"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <label>Date of Birth:</label>
                            <input
                                type="date"
                                name="dob"
                                value={formData.dob}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-row">
                            <label>Membership Start Date:</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-row">
                            <label>Membership Duration:</label>
                            <select
                                name="membershipDuration"
                                value={formData.membershipDuration}
                                onChange={handleInputChange}
                            >
                                <option value="1-month">1-Month</option>
                                <option value="3-month">3-Month</option>
                                <option value="annual">Annual</option>
                            </select>
                        </div>

                        <div className="form-row">
                            <label>Membership End Date:</label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                readOnly
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
