/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";

const Map = dynamic(() => import("../components/Map"), { ssr: false });

const API_URL = "https://icf-banyumas-backend-production.up.railway.app";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");

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
    (item) =>
      item.latitude !== null &&
      item.longitude !== null &&
      item.athlete_name !== null
  );

const latestPerAthlete = useMemo(() => {
  const athleteMap = new globalThis.Map<string, any>();

  validData.forEach((item) => {
    const existing = athleteMap.get(item.athlete_name);

    if (
      !existing ||
      new Date(item.timestamp).getTime() > new Date(existing.timestamp).getTime()
    ) {
      athleteMap.set(item.athlete_name, item);
    }
  });

  return Array.from(athleteMap.values());
}, [validData]);

  useEffect(() => {
    if (!selectedAthlete && latestPerAthlete.length > 0) {
      setSelectedAthlete(latestPerAthlete[0].athlete_name);
    }
  }, [latestPerAthlete, selectedAthlete]);

  const startPoint: [number, number] = [-7.4246, 109.2396];

  const leaderboard = latestPerAthlete
    .map((item) => {
      const distance = calculateDistance(
        startPoint[0],
        startPoint[1],
        Number(item.latitude),
        Number(item.longitude)
      );

      return {
        ...item,
        distance,
      };
    })
    .sort((a, b) => b.distance - a.distance);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "24px",
      }}
    >
      <section style={{ marginBottom: "24px" }}>
        <p style={{ color: "#38bdf8", fontWeight: 600 }}>
          LIVE TRACKING SYSTEM
        </p>
        <h1 style={{ fontSize: "36px", margin: "8px 0" }}>
          ICF Banyumas Training
        </h1>
        <p style={{ color: "#cbd5e1" }}>
          Dashboard pemantauan posisi atlet secara real-time.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={cardStyle}>
          <p style={labelStyle}>Total Data</p>
          <h2>{data.length}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Marker Valid</p>
          <h2>{validData.length}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Atlet Aktif</p>
          <h2>{latestPerAthlete.length}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Status</p>
          <h2 style={{ color: "#22c55e" }}>LIVE</h2>
        </div>
      </section>

      <section style={{ marginBottom: "20px" }}>
        <label style={{ color: "#cbd5e1", marginRight: "10px" }}>
          Auto Follow Atlet:
        </label>

        <select
          value={selectedAthlete}
          onChange={(e) => setSelectedAthlete(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            background: "#0f172a",
            color: "white",
            border: "1px solid #334155",
          }}
        >
          {latestPerAthlete.map((item) => (
            <option key={item.athlete_name} value={item.athlete_name}>
              {item.athlete_name}
            </option>
          ))}
        </select>
      </section>

      <Map data={data} selectedAthlete={selectedAthlete} />

      <section style={{ marginTop: "24px" }}>
        <h2 style={{ marginBottom: "12px" }}>Leaderboard Sementara</h2>

        {leaderboard.map((item, index) => (
          <div key={item.id} style={listStyle}>
            <strong>
              #{index + 1} {item.athlete_name}
            </strong>
            <br />
            Jarak dari start: {(item.distance / 1000).toFixed(2)} km
            <br />
            Koordinat terakhir: {item.latitude}, {item.longitude}
            <br />
            Update: {new Date(item.timestamp).toLocaleString("id-ID")}
          </div>
        ))}
      </section>
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

const listStyle = {
  background: "#111827",
  border: "1px solid #334155",
  padding: "14px",
  borderRadius: "12px",
  marginBottom: "10px",
};