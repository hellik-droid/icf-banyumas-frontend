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

    // auto refresh tiap 5 detik
    const interval = setInterval(fetchTracking, 5000);

    // realtime socket
    const socket = io(API_URL);

    socket.on("location-update", (newData) => {
      setData((prev) => [newData, ...prev]);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  return (
    <main style={{ padding: "20px", background: "#020617", minHeight: "100vh", color: "white" }}>
      <h1>ICF Banyumas Training</h1>
      <p>Live tracking atlet ICF Banyumas</p>

      <Map data={data} />
    </main>
  );
}
