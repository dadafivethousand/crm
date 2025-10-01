import { useState, useEffect, useCallback } from "react";
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
import rhlogo from "./Images/logo-grayscale.png"

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // tenant state with localStorage persistence
  const [isMaple, setIsMaple] = useState(() => {
    const saved = localStorage.getItem("isMaple");
    return saved === "true"; // default false if null
  });
  const [forChild, setForChild] = useState(false);
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

  const toggleShowAdultClients = () => setShowAdultClients((p) => !p);
  const toggleShowKidClients = () => setShowKidClients((p) => !p);
  const toggleShowLeads = () => setShowLeads((p) => !p);

    const showKidForm = () => {
    setShowClientForm(true);
    setForChild(true);
  };

  // persist isMaple changes to localStorage
  // Persist isMaple changes, but force RH email to always be false
useEffect(() => {
  if (user?.email === "richmondhillbjj@gmail.com") {
    if (isMaple) {
      // force state correction too
      setIsMaple(false);
    }
    localStorage.setItem("isMaple", "false");
  } else {
    localStorage.setItem("isMaple", String(isMaple));
  }
}, [isMaple, user]);


  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await getIdToken(firebaseUser);
        setUser(firebaseUser);
        setToken(token);
      } else {
        setUser(null);
        setToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Lock RH for RH email (hide toggle in UI AND force isMaple=false in state)
  useEffect(() => {
    if (user?.email === "richmondhillbjj@gmail.com" && isMaple) {
      setIsMaple(false);
    }
  }, [user, isMaple]);

  // Memoized helper to build headers (adds X-Maple on every request)
  const buildHeaders = useCallback(async () => {
    const idToken = user ? await user.getIdToken() : null;
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      "X-Maple": String(isMaple), // <- maple boolean included in header
    };
  }, [user, isMaple]);

  // Fetch data whenever user or isMaple changes
  useEffect(() => {
    if (!user) return;

    async function fetchClients() {
      setLoadingClients(true);
      try {
        const headers = await buildHeaders();
        const response = await fetch(
          "https://worker-consolidated.maxli5004.workers.dev/get-clients",
          { headers }
        );
        if (response.ok) {
          const data = await response.json();
          setClients(data["clients"] || []);
          setKids(data["kids"] || []);
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
      setLoadingLeads(true);
      try {
        const headers = await buildHeaders();
        const response = await fetch(
          "https://worker-consolidated.maxli5004.workers.dev/get-leads",
          { headers }
        );
        if (response.ok) {
          const data = await response.json();
          setLeads(data || []);
        } else {
          console.error("Failed to fetch leads");
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setLoadingLeads(false);
      }
    }

    async function fetchMembershipInfo() {
      try {
        const headers = await buildHeaders();
        const response = await fetch(
          "https://worker-consolidated.maxli5004.workers.dev/membership-info",
          { headers }
        );
        if (response.ok) {
          const data = await response.json();
          setMembershipInfo(data?.[0] ?? null);
          console.log(data);
        } else {
          console.error("Failed to fetch membership info");
        }
      } catch (error) {
        console.error("Error fetching Membership Info:", error);
      }
    }

    fetchMembershipInfo();
    fetchClients();
    fetchLeads();
  }, [user, isMaple, buildHeaders]);

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const showTenantToggle = user?.email !== "richmondhillbjj@gmail.com";

  return (
    <div className="crm-container">
 

      {/* Toggle gyms only if user is not the RH email */}
      {showTenantToggle ? (
        <div style={{ margin: "8px 0" }}>
          <div className="flex">

            <button
              className={`toggle-table-display ${!isMaple ? "bright-and-center" : "not-dim"}`}
              onClick={() => setIsMaple(false)}
              disabled={!isMaple}
            >
            <img src={rhlogo} />
            </button>

            <button
              className={`toggle-table-display ${isMaple ? "bright-and-center" : "not-dim"}`}
              onClick={() => setIsMaple(true)}
              disabled={isMaple}
              style={{ marginLeft: 8 }}
            >
            <img src={logo} />
            </button>

          </div>
 
        </div>
      ) :
        <img src={rhlogo} />
    
    }

      {showClientForm ? (
        <AddClient
        setForChild={setForChild}
          forChild={forChild}
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
          isMaple={isMaple}
          buildHeaders={buildHeaders}
        />
      ) : (
        <div className="adding-client-buttons flex"> 
        <button className="plus" onClick={() => setShowClientForm(true)}>
          New Adult Client
        </button>
        <button className="plus" onClick={() => showKidForm(true)}>
          New Kid Client
        </button>
        </div>
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
            isMaple={isMaple}
            buildHeaders={buildHeaders}
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
            isMaple={isMaple}
            buildHeaders={buildHeaders}
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
            isMaple={isMaple}
            buildHeaders={buildHeaders}
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
