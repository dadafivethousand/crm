import KidsForm from './KidsForm';
import './Stylesheets/AddClient.css';
import { useState, useEffect } from 'react';

export default function AddClient({ membershipInfo, setConvertToClientData, clientFormData, showClientForm, setShowClientForm, setClients, setClientFormData, prefilledData = {} }) {
    const [forChild, setForChild] = useState(false)
  
    const [kidsFormData, setKidsFormData] = useState([{ firstName: '', lastName: '' }]);

    // Initialize state
 

    const closeForm = () => {
        setShowClientForm(false);
        setConvertToClientData(null)
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

    const clearForChild = () => {
        setForChild(false)
        setKidsFormData([{ firstName: '', lastName: '' }])
    }

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("showClientForm", showClientForm.toString());
        localStorage.setItem("clientFormData", JSON.stringify(clientFormData));
    }, [showClientForm, clientFormData]);


    useEffect(() => {
        setClientFormData((prevData) => ({
            ...prevData,
            ...prefilledData, // Override with prefilled data
        }));
    }, []);


    useEffect(() => {
        setClientFormData((prevData) => ({
            ...prevData,
            kidsMembership: forChild
        }));
    }, [ forChild]);


    useEffect(() => {
        setClientFormData((prevData) => ({
            ...prevData,
             kids: kidsFormData
        }));
    }, [kidsFormData]);

    useEffect(() => {

        updateEndDate('1 Month', membershipInfo, clientFormData.startDate) 

    }, [clientFormData.startDate]);
  

    // Handle form input changes
    const handleInputChange = (e) => {
        console.log('handlinginputchange')
        const { name, value } = e.target;
        // Update clientFormData  with the new value
        setClientFormData((prevData) => {
            const updatedData = { ...prevData, [name]: value };

            // If either 'membershipDuration' or 'startDate' is updated, recalculate the end date
            if (name === "membershipDuration" || name === "startDate") {
                updateEndDate(
                    name === "membershipDuration" ? value : prevData.membershipDuration,
                    membershipInfo,
                    name === "startDate" ? value : prevData.startDate
                );
            }

            return updatedData;
        });
        
    };

    // Update end date based on membership duration
    const updateEndDate = (duration, membershipInfo, startDate) => {
        console.log('updating end date')
        if (!startDate) return;

        const date = new Date(startDate);
        const matchingMembership = membershipInfo.info.find(
            (membership) => membership.description === duration
        );
        // If a match is found, update the date
        if (matchingMembership) {
          console.log('matchingmembershipfound', matchingMembership.duration)
            date.setMonth(date.getMonth() + matchingMembership.duration);
             
        }

        const endDate = date.toISOString().split("T")[0];
        setClientFormData((prevData) => ({
            ...prevData,
            endDate,
             
        }));
    };

    

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Set the timestamp at the time of form submission
        const timestamp = new Date().toISOString();
        const formDataToSend = {
            ...clientFormData,
            timestamp,
        };

        if (forChild) {
            formDataToSend.kids = kidsFormData;
        } else {
            delete formDataToSend.kids; // Ensure 'kids' is not sent when it's not needed
        }
 
        try {
            const response = await fetch("https://worker-consolidated.maxli5004.workers.dev/add-client", {
                
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify( formDataToSend ), // Include the timestamp
            });

            if (response.ok) {
                const newClientKey = `student:${clientFormData.email}`;
                const newClientData = { key: newClientKey, data: { ...clientFormData , timestamp } };

                setClients((prevClients) => [
                    ...prevClients,
                    newClientData // Add the new client to the list
                ]);
            
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
                });
       
                localStorage.removeItem("showClientForm");
                localStorage.removeItem("clientFormData");
                
                setShowClientForm(false);
                window.location.reload();
                // Delete the lead from KV if this was a conversion
              {/* 
                if (prefilledData.email) {
                    await fetch("https://worker-consolidated.maxli5004.workers.dev/delete-lead", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ key: `lead:${prefilledData.email}` }),
                    });
                }*/}
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
                <div className="overlay">
                    <form className="user-form" onSubmit={handleSubmit}>
                        <h2 className='new-client-title'>Add New Client</h2>
                    
                    <div>           
                        <input type="text" name="firstName" value={clientFormData.firstName} onChange={handleInputChange} placeholder="First Name" />
                        <input type="text" name="lastName" value={clientFormData.lastName} onChange={handleInputChange} placeholder="Last Name" />
                        <input type="email" name="email" value={clientFormData.email} onChange={handleInputChange} placeholder="Email" />
                        <input type="tel" name="phone" value={clientFormData.phone} onChange={handleInputChange} placeholder="Phone Number" /> <br></br>
                        </div>
                        <div className="membership-type">
                      <span>  Membership is for:  </span>
                        <label>
                            <input
                                type="radio"
                                name="membershipType"
                                value="self"
                                checked={!forChild}
                                onChange={clearForChild}
                            />
                            Self
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="membershipType"
                                value="child"
                                checked={forChild}
                                onChange={() => setForChild(true)}
                            />
                            Child
                        </label>
                    </div>

                        {forChild && 
                        <KidsForm kidsFormData={kidsFormData} setKidsFormData={setKidsFormData} />
                        }
                        <br></br>
                        <label>Membership Start Date:</label>
                        <input type="date" name="startDate" value={clientFormData.startDate} onChange={handleInputChange} />
                        <br></br>
                        <label>Membership Duration:</label>
                        <select name="membershipDuration" value={clientFormData.membershipDuration} onChange={handleInputChange}>
                        {membershipInfo.info.map((membership) => (
                            !membership.free && membership.description && membership.duration?
                            <option key={membership.description} value={membership.description}>
                                {membership.description}
                            </option> : null
            ))}
                        </select>
                        <br></br>
                        <label>Membership End Date:</label> 
                        <input type="date" name="endDate" value={clientFormData.endDate} onChange={handleInputChange} /><br></br>
                        <div className="welcome-email">
     <div className="welcome-email">
    <label>
        <input
            type="checkbox"
            checked={!clientFormData.confirmationEmail} // If checked, email is NOT sent
            onChange={() =>
                setClientFormData((prevData) => ({
                    ...prevData,
                    confirmationEmail: !prevData.confirmationEmail // Toggle between true/false
                }))
            }
        />
        Do not send welcome email
    </label>
</div>
</div>

                       
                       <div className='save-and-submit-buttons'>
                        <button type="submit">Save</button>
                        <button type="button" onClick={() => closeForm()}>Cancel</button>
                        </div>
                    </form>
                </div>
         
        </div>
    );
}
