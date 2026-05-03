"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";

const RaceMap = dynamic(() => import("./MapClient"), {
  ssr: false,
});

const API_URL = "https://icf-banyumas-backend-production.up.railway.app";

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`${API_URL}/tracking`);
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date().toLocaleTimeString("id-ID"));
    }

    fetchData();

    const socket = io(API_URL);

    socket.on("location-update", (newData) => {
      if (!newData?.athlete_name || !newData?.latitude || !newData?.longitude) return;

      setData((prev) => [newData, ...prev]);
      setLastUpdate(new Date().toLocaleTimeString("id-ID"));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const validData = useMemo(() => {
    return data.filter(
      (item) =>
        item &&
        item.athlete_name &&
        item.latitude !== null &&
        item.longitude !== null &&
        !Number.isNaN(Number(item.latitude)) &&
        !Number.isNaN(Number(item.longitude))
    );
  }, [data]);

  const latestPerAthlete = useMemo(() => {
    const athleteMap = new globalThis.Map<string, any>();

    validData.forEach((item) => {
      const previous = athleteMap.get(item.athlete_name);

      if (
        !previous ||
        new Date(item.timestamp).getTime() > new Date(previous.timestamp).getTime()
      ) {
        athleteMap.set(item.athlete_name, item);
      }
    });

    return Array.from(athleteMap.values()).slice(0, 10);
  }, [validData]);

  useEffect(() => {
    if (!selectedAthlete && latestPerAthlete.length > 0) {
      setSelectedAthlete(latestPerAthlete[0].athlete_name);
    }
  }, [latestPerAthlete, selectedAthlete]);

  const startPoint: [number, number] = [-7.4098, 109.2428];

  const leaderboard = useMemo(() => {
    return latestPerAthlete
      .map((item) => {
        const history = validData
          .filter((d) => d.athlete_name === item.athlete_name)
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime()
          );

        const current = history[0];
        const previous = history[1];

        const totalDistance = distanceKm(
          startPoint[0],
          startPoint[1],
          Number(item.latitude),
          Number(item.longitude)
        );

        let speedKmh = 0;

        if (current && previous) {
          const dist = distanceKm(
            Number(previous.latitude),
            Number(previous.longitude),
            Number(current.latitude),
            Number(current.longitude)
          );

          const hours =
            (new Date(current.timestamp).getTime() -
              new Date(previous.timestamp).getTime()) /
            1000 /
            3600;

          if (hours > 0) speedKmh = dist / hours;
        }

        return {
          ...item,
          totalDistance,
          speedKmh,
        };
      })
      .sort((a, b) => b.totalDistance - a.totalDistance);
  }, [latestPerAthlete, validData]);

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
        <p style={{ color: "#38bdf8", fontWeight: 700 }}>
          LIVE TRACKING SYSTEM
        </p>
        <h1 style={{ fontSize: "40px", margin: "8px 0" }}>
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
          <p style={labelStyle}>Realtime</p>
          <h2 style={{ color: "#22c55e" }}>LIVE</h2>
        </div>
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
          <p style={labelStyle}>Rute</p>
          <h2>Rektorat UNSOED - Baturraden</h2>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Estimasi Jarak</p>
          <h2>±13 KM</h2>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Elevasi</p>
          <h2>±500 m</h2>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Gradient</p>
          <h2>±4–6%</h2>
        </div>
      </section>

      <section style={{ marginBottom: "20px" }}>
        <label style={{ marginRight: "10px", color: "#cbd5e1" }}>
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

        <span style={{ marginLeft: "16px", color: "#94a3b8" }}>
          Last update: {lastUpdate || "-"}
        </span>
      </section>

      <RaceMap data={validData} selectedAthlete={selectedAthlete} />

      <section style={{ marginTop: "24px" }}>
        <h2>Leaderboard Sementara</h2>

        {leaderboard.map((item, index) => (
          <div key={item.athlete_name} style={listStyle}>
            <strong>
              #{index + 1} {item.athlete_name}
            </strong>
            <br />
            Jarak dari start: {item.totalDistance.toFixed(2)} km
            <br />
            Kecepatan: {item.speedKmh.toFixed(1)} km/h
            <br />
            Koordinat: {item.latitude}, {item.longitude}
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