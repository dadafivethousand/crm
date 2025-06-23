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

  const day = "Thursday";

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
    async function fetchClients() {
      try {
        const response = await fetch("https://worker-consolidated.maxli5004.workers.dev/get-clients");
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

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="crm-container">
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
      <img src={logo} alt="Logo" />



      {showClientForm ? (
        <AddClient
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
          <ClientTable clients={clients} setClients={setClients} membershipInfo={membershipInfo} />
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
          />
        )
      )}
    </div>
  );
}

export default App;
