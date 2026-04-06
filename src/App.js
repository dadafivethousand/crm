import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "./firebaseConfig";

import ClientTable from "./ClientTable";
import AddClient from "./AddClient";
import LeadsTable from "./LeadsTable";
import KidsTable from "./KidsTable";
import LoginForm from "./LoginForm";
import { ToastProvider } from "./Components/Toast";

import "./Stylesheets/App.css";
import logo from "./Images/whitelogonobg.png";
import rhlogo from "./Images/new_logo.png";

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const isLeadsReadOnlyUser = user?.email?.toLowerCase() === "maxli5004@gmail.com";

  const [isMaple, setIsMaple] = useState(() => {
    const saved = localStorage.getItem("isMaple");
    return saved === "true";
  });
  const [forChild, setForChild] = useState(false);
  const [clients, setClients] = useState([]);
  const [kids, setKids] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [showClientForm, setShowClientForm] = useState(false);
  const [convertToClientData, setConvertToClientData] = useState(null);
  const [activeTab, setActiveTab] = useState("adults");
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

  const showKidForm = () => {
    setShowClientForm(true);
    setForChild(true);
    setActiveTab("kids");
  };

  const showAdultForm = () => {
    setShowClientForm(true);
    setForChild(false);
    setActiveTab("adults");
  };

  useEffect(() => {
    if (user?.email === "richmondhillbjj@gmail.com") {
      if (isMaple) setIsMaple(false);
      localStorage.setItem("isMaple", "false");
    } else {
      localStorage.setItem("isMaple", String(isMaple));
    }
  }, [isMaple, user]);

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

  useEffect(() => {
    if (user?.email === "richmondhillbjj@gmail.com" && isMaple) {
      setIsMaple(false);
    }
  }, [user, isMaple]);

  const buildHeaders = useCallback(async () => {
    const idToken = user ? await user.getIdToken() : null;
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      "X-Maple": String(isMaple),
    };
  }, [user, isMaple]);

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

    if (isLeadsReadOnlyUser) {
      fetchLeads();
      return;
    }

    fetchMembershipInfo();
    fetchClients();
    fetchLeads();
  }, [user, isMaple, buildHeaders, isLeadsReadOnlyUser]);

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const showTenantToggle = user?.email !== "richmondhillbjj@gmail.com";

  const gymToggle = showTenantToggle ? (
    <div className="crm-gym-toggle">
      <button
        className={`crm-gym-btn ${!isMaple ? "crm-gym-btn--active" : ""}`}
        onClick={() => setIsMaple(false)}
        disabled={!isMaple}
        aria-label="Richmond Hill"
      >
        <img src={rhlogo} alt="Richmond Hill" />
      </button>
      <button
        className={`crm-gym-btn ${isMaple ? "crm-gym-btn--active" : ""}`}
        onClick={() => setIsMaple(true)}
        disabled={isMaple}
        aria-label="Maple"
      >
        <img src={logo} alt="Maple" />
      </button>
    </div>
  ) : (
    <img className="crm-logo" src={rhlogo} alt="Richmond Hill" />
  );

  const logoutButton = (
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
  );

  /* ── Leads-only view ── */
  if (isLeadsReadOnlyUser) {
    return (
      <div className="crm-container">
        <header className="crm-header">
          <div className="crm-header-left">{gymToggle}</div>
          <div className="crm-header-right">{logoutButton}</div>
        </header>
        <div className="crm-content">
          {loadingLeads ? (
            <p className="crm-loading">Loading leads…</p>
          ) : (
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
              readOnly
            />
          )}
        </div>
      </div>
    );
  }

  /* ── Main view ── */
  const tabs = [
    { id: "adults", label: "Teens & Adults", count: clients.length },
    { id: "kids",   label: "Kids",           count: kids.length },
    { id: "leads",  label: "Leads",          count: leads.length },
  ];

  const isLoading = activeTab === "leads" ? loadingLeads : loadingClients;

  return (
    <div className="crm-container">

      {/* ── Top header ── */}
      <header className="crm-header">
        <div className="crm-header-left">{gymToggle}</div>
        <div className="crm-header-right">{logoutButton}</div>
      </header>

      {/* ── Nav bar ── */}
      <div className="crm-nav-bar">
        <div className="crm-nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`crm-nav-tab${activeTab === tab.id ? " crm-nav-tab--active" : ""}`}
              onClick={() => {
                setActiveTab(tab.id);
                setShowClientForm(false);
              }}
            >
              {tab.label}
              <span className="crm-nav-badge">{tab.count}</span>
            </button>
          ))}
        </div>

        {activeTab !== "leads" && !showClientForm && (
          <div className="crm-nav-actions">
            <button className="plus" onClick={showAdultForm}>
              + Adult
            </button>
            <button className="plus" onClick={showKidForm}>
              + Kid
            </button>
          </div>
        )}

        {showClientForm && (
          <div className="crm-nav-actions">
            <button
              className="logout-button"
              onClick={() => {
                setShowClientForm(false);
                setConvertToClientData(null);
              }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="crm-content">
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
        ) : isLoading ? (
          <p className="crm-loading">Loading…</p>
        ) : (
          <>
            {activeTab === "adults" && (
              <ClientTable
                clients={clients}
                setClients={setClients}
                membershipInfo={membershipInfo}
                token={token}
                user={user}
                isMaple={isMaple}
                buildHeaders={buildHeaders}
              />
            )}
            {activeTab === "kids" && (
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
            )}
            {activeTab === "leads" && (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
