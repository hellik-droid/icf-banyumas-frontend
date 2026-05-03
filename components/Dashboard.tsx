"use client";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState("");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(
        "https://icf-banyumas-backend-production.up.railway.app/tracking"
      );
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date().toLocaleTimeString("id-ID"));
    }

    fetchData();
  }, []);

return (
  <main
    style={{
      padding: "24px",
      background: "#020617",
      color: "white",
      minHeight: "100vh",
    }}
  >
    <h1>ICF Banyumas Training</h1>
    <p>Last update: {lastUpdate}</p>
    <p>Total data: {data.length}</p>
  </main>
);
}
