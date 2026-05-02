/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";

const Map = dynamic(() => import("../components/Map"), { ssr: false });

const API_URL = "https://icf-banyumas-backend-production.up.railway.app";

export default function Home() {
  const [data, setData] = useState<any[]>([]);

  const fetchTracking = async () => {
    const res = await fetch(`${API_URL}/tracking`);
    const result = await res.json();
    setData(result);
  };

  useEffect(() => {
    fetchTracking();

    const interval = setInterval(fetchTracking, 5000);
    const socket = io(API_URL);

    socket.on("location-update", (newData) => {
      setData((prev) => [newData, ...prev]);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const validData = data.filter(
    (item) => item.latitude !== null && item.longitude !== null
  );

  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "white", padding: "24px" }}>
      <section style={{ marginBottom: "24px" }}>
        <p style={{ color: "#38bdf8", fontWeight: 600 }}>LIVE TRACKING SYSTEM</p>
        <h1 style={{ fontSize: "36px", margin: "8px 0" }}>ICF Banyumas Race Map</h1>
        <p style={{ color: "#cbd5e1" }}>
          Dashboard pemantauan posisi atlet secara real-time.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
        <div style={cardStyle}>
          <p style={labelStyle}>Total Data</p>
          <h2>{data.length}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Marker Valid</p>
          <h2>{validData.length}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Status</p>
          <h2 style={{ color: "#22c55e" }}>LIVE</h2>
        </div>
      </section>

      <Map data={data} />
    </main>
  );
}

const cardStyle = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "16px",
  padding: "20px",
};

const labelStyle = {
  color: "#94a3b8",
  marginBottom: "8px",
};