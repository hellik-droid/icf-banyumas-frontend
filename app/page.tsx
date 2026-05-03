/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";

const RaceMap = dynamic(() => import("../components/Map"), { ssr: false });

const API_URL = "https://icf-banyumas-backend-production.up.railway.app";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
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
function calculateSpeedKmh(current: any, previous: any) {
  if (!current || !previous) return 0;

  const distanceKm = calculateDistance(
    Number(previous.latitude),
    Number(previous.longitude),
    Number(current.latitude),
    Number(current.longitude)
  );

  const timeDiffHours =
    (new Date(current.timestamp).getTime() -
      new Date(previous.timestamp).getTime()) /
    1000 /
    3600;

  if (timeDiffHours <= 0) return 0;

  return distanceKm / timeDiffHours;
}
export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState("Atlet 1");
  const [lastUpdate, setLastUpdate] = useState("");

  const fetchInitialData = async () => {
    const res = await fetch(`${API_URL}/tracking`);
    const json = await res.json();
    setData(json);
    setLastUpdate(new Date().toLocaleTimeString("id-ID"));
  };

  useEffect(() => {
  fetchInitialData();
  fetchRoute();

  const socket = io(API_URL);

  socket.on("connect", () => {
    console.log("Realtime connected");
  });

  socket.on("location-update", (newData) => {
    if (!newData?.latitude || !newData?.longitude || !newData?.athlete_name) return;

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
        !isNaN(Number(item.latitude)) &&
        !isNaN(Number(item.longitude)) &&
        Number(item.latitude) >= -90 &&
        Number(item.latitude) <= 90 &&
        Number(item.longitude) >= -180 &&
        Number(item.longitude) <= 180
    );
  }, [data]);

  const latestPerAthlete = useMemo(() => {
    const athleteMap = new globalThis.Map<string, any>();

    validData.forEach((item) => {
      const existing = athleteMap.get(item.athlete_name);

      if (!existing || new Date(item.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        athleteMap.set(item.athlete_name, item);
      }
    });

    return Array.from(athleteMap.values()).slice(0, 10);
  }, [validData]);

  const startPoint: [number, number] = [-7.4246, 109.2396];

  const leaderboard = useMemo(() => {
  return latestPerAthlete
    .map((item) => {
      const athleteHistory = validData
        .filter((d) => d.athlete_name === item.athlete_name)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
        );

      const current = athleteHistory[0];
      const previous = athleteHistory[1];

      const distance = calculateDistance(
        startPoint[0],
        startPoint[1],
        Number(item.latitude),
        Number(item.longitude)
      );

      const speedKmh = calculateSpeedKmh(current, previous);

      return {
        ...item,
        distance,
        speedKmh,
      };
    })
    .sort((a, b) => b.distance - a.distance);
}, [latestPerAthlete, validData]);
const routeInfo = {
  distanceKm: 10,
  elevationGainM: 185,
  gradientPercent: 4.2,
  routeName: "ICF Banyumas 10K Training Route",
};
  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "white", padding: "24px" }}>
      <section style={{ marginBottom: "24px" }}>
        <p style={{ color: "#38bdf8", fontWeight: 700 }}>LIVE TRACKING SYSTEM</p>
        <h1 style={{ fontSize: "40px", margin: "8px 0" }}>ICF Banyumas Training</h1>
        <p style={{ color: "#cbd5e1" }}>Dashboard pemantauan posisi atlet secara real-time.</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
        <div style={cardStyle}><p style={labelStyle}>Total Data</p><h2>{data.length}</h2></div>
        <div style={cardStyle}><p style={labelStyle}>Marker Valid</p><h2>{validData.length}</h2></div>
        <div style={cardStyle}><p style={labelStyle}>Atlet Aktif</p><h2>{latestPerAthlete.length}</h2></div>
        <div style={cardStyle}><p style={labelStyle}>Realtime</p><h2 style={{ color: "#22c55e" }}>LIVE</h2></div>
      </section>

      <section style={{ marginBottom: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
        <label>Auto Follow Atlet:</label>
        <select
          value={selectedAthlete}
          onChange={(e) => setSelectedAthlete(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", color: "white" }}
        >
          {latestPerAthlete.map((item) => (
            <option key={item.athlete_name} value={item.athlete_name}>
              {item.athlete_name}
            </option>
          ))}
        </select>

        <span style={{ color: "#94a3b8" }}>Last update: {lastUpdate || "-"}</span>
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
    <p style={labelStyle}>Nama Rute</p>
    <h2>{routeInfo.routeName}</h2>
  </div>

  <div style={cardStyle}>
    <p style={labelStyle}>Total Jarak</p>
    <h2>{routeInfo.distanceKm} KM</h2>
  </div>

  <div style={cardStyle}>
    <p style={labelStyle}>Elevasi</p>
    <h2>{routeInfo.elevationGainM} m</h2>
  </div>

  <div style={cardStyle}>
    <p style={labelStyle}>Gradient</p>
    <h2>{routeInfo.gradientPercent}%</h2>
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
    <h2>{routeInfo.routeName}</h2>
  </div>

  <div style={cardStyle}>
    <p style={labelStyle}>Total Jarak</p>
    <h2>{routeInfo.distanceKm.toFixed(2)} KM</h2>
  </div>

  <div style={cardStyle}>
    <p style={labelStyle}>Elevasi Naik</p>
    <h2>{routeInfo.elevationGainM.toFixed(0)} m</h2>
  </div>

  <div style={cardStyle}>
    <p style={labelStyle}>Gradient Rata-rata</p>
    <h2>{routeInfo.gradientPercent.toFixed(1)}%</h2>
  </div>
</section>
<RaceMap
  data={validData}
  selectedAthlete={selectedAthlete || leaderboard[0]?.athlete_name || ""}
  routeData={routeData}
/>

      <section style={{ marginTop: "24px" }}>
        <h2 style={{ marginBottom: "12px" }}>Leaderboard Sementara</h2>

        {leaderboard.map((item, index) => (
          <div key={item.id} style={listStyle}>
            <strong>#{index + 1} {item.athlete_name}</strong>
            <br />
            Jarak dari start: {item.distance.toFixed(2)} km
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
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

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
const [routeData, setRouteData] = useState<any>(null);
const [routeInfo, setRouteInfo] = useState({
  routeName: "Rektorat UNSOED - Bundaran Baturraden",
  distanceKm: 0,
  elevationGainM: 0,
  gradientPercent: 0,
});
const fetchRoute = async () => {
  const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;

  const body = {
    coordinates: [
      [109.2428, -7.4098], // Rektorat UNSOED
      [109.228742, -7.318161], // Bundaran Baturraden
    ],
    elevation: true,
  };

  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/cycling-regular/geojson",
    {
      method: "POST",
      headers: {
        Authorization: apiKey || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const json = await res.json();

  const feature = json.features?.[0];
  const summary = feature?.properties?.summary;

  const coords = feature.geometry.coordinates.map((c: any) => [
    c[1],
    c[0],
  ]);

  const distanceKm = summary.distance / 1000;
  const elevationGainM = feature.properties.ascent || 0;
  const gradientPercent = elevationGainM / (distanceKm * 1000) * 100;

  setRouteData(coords);

  setRouteInfo({
    routeName: "Rektorat UNSOED - Bundaran Baturraden",
    distanceKm,
    elevationGainM,
    gradientPercent,
  });
};
