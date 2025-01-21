import { useState, useEffect } from 'react';
import ClientTable from './ClientTable';
import AddClient from './AddClient';
import './Stylesheets/App.css';
import logo from './Images/logos.jpg'
import LeadsTable from './LeadsTable';
import Schedule from './Schedule';
import AddLead from './AddLead';
import KidsTable from './KidsTable'

function App() {
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [showClientForm, setShowClientForm] = useState(false);
  const [convertToClientData, setConvertToClientData] = useState(null);
  const [showAdultClients, setShowAdultClients]=useState(false)
  const [showKidClients, setShowKidClients]=useState(false)
  const [showLeads, setShowLeads]=useState(false)
  const [membershipInfo, setMembershipInfo] = useState(null)
  const [clientFormData, setClientFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    startDate: "",
    membershipDuration: "1-month",
    endDate: "",
    expiringSoon: false,
    timestamp: "",
  });

  const toggleShowAdultClients=()=>{
    setShowAdultClients(prev => !prev);
  }
 

  const toggleShowKidClients=()=>{
    setShowKidClients(prev => !prev);
  }

  const toggleShowLeads=()=>{
    setShowLeads(prev => !prev);
  }


  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch("https://worker-consolidated.maxli5004.workers.dev/get-clients");
        if (response.ok) {
          const data = await response.json();
          setClients(data);
        } else {
          console.error("Failed to fetch clients");
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoadingClients(false);
      }
    }
    fetchClients();

    async function fetchLeads() {
      try {
        const response = await fetch("https://worker-consolidated.maxli5004.workers.dev/get-leads");
        if (response.ok) {
          const data = await response.json();
          setLeads(data);
        } else {
          console.error("Failed to fetch leads");
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setLoadingLeads(false);
      }
    }
    fetchLeads();


    async function fetchMembershipInfo() {
      try {
        const response = await fetch("https://worker-consolidated.maxli5004.workers.dev/membership-info");
        if (response.ok) {
          const data = await response.json();
          console.log(data)
          setMembershipInfo(data[0]);
        } else {
          console.error("Failed to fetch membership info");
        }
      } catch (error) {
        console.error("Error fetching Membership Info:", error);
      }  

    }
      fetchMembershipInfo();

 

  }, []);

  return (
    <div>
      <img src={logo}/>
    <button onClick={toggleShowAdultClients} className='toggle-table-display'> Toggle Client Display  </button> 
      {loadingClients ? <p>Loading Clients...</p> : 
          showAdultClients &&     <ClientTable
                clients={clients}
                setClients={setClients}
                membershipInfo={membershipInfo}
            
              /> 
      }

{showClientForm ? <AddClient 
       setConvertToClientData={setConvertToClientData}
       prefilledData={convertToClientData}
      showClientForm={showClientForm} 
      setClientFormData={setClientFormData}
      setShowClientForm={setShowClientForm}
      clientFormData={clientFormData} 
      membershipInfo={membershipInfo}
      setClients={setClients} /> :  
      <button className='plus' onClick={() => setShowClientForm(true)}>Add Adult/Teen Client</button>}


<button onClick={toggleShowKidClients} className='toggle-table-display'> Toggle Kids Display  </button> 
{loadingLeads ? <p>Loading Leads...</p> : 
      showKidClients &&
        <KidsTable
                clients={clients}
                setClients={setClients}
                membershipInfo={membershipInfo}
            
              /> 
      }
      <AddLead />


<button onClick={toggleShowLeads} className='toggle-table-display'> Toggle Leads Display  </button> 

      {loadingLeads ? <p>Loading Leads...</p> : 
      showLeads &&
           <LeadsTable
           leads={leads}
           setLeads={setLeads}
           setShowClientForm={setShowClientForm}
           setClientFormData={setClientFormData}
           setConvertToClientData={setConvertToClientData}
         />}

    

 {/*
      <Schedule />
   */ }
    </div>
  );
}

export default App;
