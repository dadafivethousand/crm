import { useState, useEffect } from "react";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "./firebaseConfig";

import ClientTable from "./ClientTable";
import AddClient from "./AddClient";
import LeadsTable from "./LeadsTable";
import AddLead from "./AddLead";
import KidsTable from "./KidsTable";
import LoginForm from "./LoginForm";

import "./Stylesheets/App.css";
import logo from "./Images/logos.jpg";

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [kids, setKids] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [showClientForm, setShowClientForm] = useState(false);
  const [convertToClientData, setConvertToClientData] = useState(null);
  const [showAdultClients, setShowAdultClients] = useState(false);
  const [showKidClients, setShowKidClients] = useState(false);
  const [showLeads, setShowLeads] = useState(false);
  const [membershipInfo, setMembershipInfo] = useState(null);
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
    confirmationEmail: true,
  });

  const handleLogin = (token, user) => {
    setToken(token);
    setUser(user);
  };

  const toggleShowAdultClients = () => {
    setShowAdultClients((prev) => !prev);
  };

  const toggleShowKidClients = () => {
    setShowKidClients((prev) => !prev);
  };

  const toggleShowLeads = () => {
    setShowLeads((prev) => !prev);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await getIdToken(firebaseUser);
        setUser(firebaseUser);
        setToken(token);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
      if (!user) return;
      
    async function fetchClients() {
      try {
        const idToken = await user.getIdToken(); // always fresh
        const response = await fetch("https://worker-consolidated.maxli5004.workers.dev/get-clients", 
            {
        headers: {
         "Content-Type": "application/json",
         "Authorization": `Bearer ${idToken}`
            },}
        );
        if (response.ok) {
          const data = await response.json();
          setClients(data["clients"]);
          setKids(data["kids"]);
        } else {
          console.error("Failed to fetch clients");
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoadingClients(false);
      }
    }

    async function fetchLeads() {
      try {
        const idToken = await user.getIdToken(); // always fresh

        const response = await fetch("https://worker-consolidated.maxli5004.workers.dev/get-leads", 
          {
        headers: {
         "Content-Type": "application/json",
         "Authorization": `Bearer ${idToken}`
            },}
        );
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
 
    fetchClients();
    fetchLeads();
 
  }, [user]);

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="crm-container">
  
      <img src={logo} alt="Logo" />

      {showClientForm ? (
        <AddClient
          token={token}
          user={user}
          setConvertToClientData={setConvertToClientData}
          prefilledData={convertToClientData}
          showClientForm={showClientForm}
          setClientFormData={setClientFormData}
          setShowClientForm={setShowClientForm}
          clientFormData={clientFormData}
          membershipInfo={membershipInfo}
          setClients={setClients}
        />
      ) : (
        <button className="plus" onClick={() => setShowClientForm(true)}>
          Add Client
        </button>
      )}

      <button onClick={toggleShowAdultClients} className="toggle-table-display">
        Teens & Adults
      </button>
      {loadingClients ? (
        <p>Loading Clients...</p>
      ) : (
        showAdultClients && (
          <ClientTable
            clients={clients}
            setClients={setClients}
            membershipInfo={membershipInfo}
            token={token}
            user={user}
          />
        )
      )}

      <br />
      <button onClick={toggleShowKidClients} className="toggle-table-display">
        Kids
      </button>
      {loadingClients ? (
        <p>Loading Kids...</p>
      ) : (
        showKidClients && (
          <KidsTable
            kids={kids}
            setKids={setKids}
            clients={clients}
            setClients={setClients}
            membershipInfo={membershipInfo}
            token={token}
            user={user}
          />
        )
      )}

      <br />
      <button onClick={toggleShowLeads} className="toggle-table-display">
        Leads
      </button>
      {loadingLeads ? (
        <p>Loading Leads...</p>
      ) : (
        showLeads && (
          <LeadsTable
            leads={leads}
            setLeads={setLeads}
            setShowClientForm={setShowClientForm}
            setClientFormData={setClientFormData}
            setConvertToClientData={setConvertToClientData}
            token={token}
            user={user}
          />
        )
      )}
          <button
        className="logout-button"
        onClick={async () => {
          await auth.signOut();
          setUser(null);
          setToken(null);
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default App;
