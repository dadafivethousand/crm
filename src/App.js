import { useState, useEffect } from 'react';
import ClientTable from './ClientTable';
import AddClient from './AddClient';
import './Stylesheets/App.css';

function App() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch("https://my-cloudflare-worker.maxli5004.workers.dev/");
        if (response.ok) {
          const data = await response.json();
          setClients(data);
        } else {
          console.error("Failed to fetch clients");
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  return (
    <div>
      <h1>Gym CRM</h1>
      {loading ? <p>Loading...</p> : <ClientTable clients={clients} setClients={setClients} />}
      <AddClient setClients={setClients}/>
    </div>
  );
}

export default App;
