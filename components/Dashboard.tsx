/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  const routeDistanceKm = 1;

  const checkpoints = [
    { name: "Start", km: 0 },
    { name: "CP 1", km: 0.25 },
    { name: "CP 2", km: 0.5 },
    { name: "CP 3", km: 0.75 },
    { name: "Finish", km: 1 },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API_URL}/tracking`);
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date().toLocaleTimeString("id-ID"));
      } catch (error) {
        console.error("Fetch error:", error);
      }
    }

    fetchData();

    const socket = io(API_URL);

    socket.on("location-update", (newData) => {
      if (!newData?.athlete_name || !newData?.latitude || !newData?.longitude) {
        return;
      }

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
        new Date(item.timestamp).getTime() >
          new Date(previous.timestamp).getTime()
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

  const startPoint: [number, number] = [-7.4564651, 109.2621908];

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

          if (hours > 0) {
            speedKmh = dist / hours;
          }
        }

        if (speedKmh > 60) {
          speedKmh = 0;
        }

        const progress = Math.min(totalDistance / routeDistanceKm, 1);

        const nextCheckpoint =
          checkpoints.find((cp) => cp.km > progress) ||
          checkpoints[checkpoints.length - 1];

        const remainingKm = Math.max(routeDistanceKm - totalDistance, 0);

        const etaMinutes = speedKmh > 0 ? (remainingKm / speedKmh) * 60 : 0;

        return {
          ...item,
          totalDistance,
          speedKmh,
          paceMinKm: speedKmh > 0 ? 60 / speedKmh : 0,
          progress,
          nextCheckpoint,
          etaMinutes,
          status: speedKmh > 1 ? "MOVING" : "STOPPED",
        };
      })
      .sort((a, b) => b.progress - a.progress);
  }, [latestPerAthlete, validData]);

  const replayData = useMemo(() => {
    if (!replayMode) return validData;

    const sorted = [...validData].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sorted.slice(0, replayIndex + 1);
  }, [validData, replayMode, replayIndex]);

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
          <h2>Rute Google Maps</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Estimasi Jarak</p>
          <h2>±1 KM</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Elevasi</p>
          <h2>Perlu cek GPS/GPX</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Gradient</p>
          <h2>Perlu cek GPS/GPX</h2>
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

      <section
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginBottom: "12px" }}>Race Replay</h2>

        <button
          onClick={() => setReplayMode(!replayMode)}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            background: replayMode ? "#ef4444" : "#22c55e",
            color: "white",
            fontWeight: 700,
            marginRight: "12px",
          }}
        >
          {replayMode ? "Exit Replay" : "Start Replay"}
        </button>

        {replayMode && (
          <input
            type="range"
            min="0"
            max={Math.max(validData.length - 1, 0)}
            value={replayIndex}
            onChange={(e) => setReplayIndex(Number(e.target.value))}
            style={{ width: "60%" }}
          />
        )}

        {replayMode && (
          <span style={{ marginLeft: "12px", color: "#94a3b8" }}>
            Frame: {replayIndex + 1} / {validData.length}
          </span>
        )}
      </section>

      <RaceMap
        data={replayData}
        selectedAthlete={selectedAthlete}
        checkpoints={checkpoints}
      />

      <section style={{ marginTop: "24px" }}>
        <h2 style={{ marginBottom: "12px" }}>Official Race Ranking</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "70px 1fr 130px 130px 130px 120px",
            gap: "12px",
            background: "#0f172a",
            padding: "14px",
            borderRadius: "12px",
            color: "#94a3b8",
            fontWeight: 700,
            marginBottom: "10px",
          }}
        >
          <span>Rank</span>
          <span>Atlet</span>
          <span>Distance</span>
          <span>Speed</span>
          <span>Pace</span>
          <span>Status</span>
        </div>

        {leaderboard.map((item, index) => (
          <div
            key={item.athlete_name}
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 130px 130px 130px 120px",
              gap: "12px",
              background: index === 0 ? "#1e3a8a" : "#111827",
              border:
                index === 0 ? "1px solid #60a5fa" : "1px solid #334155",
              padding: "14px",
              borderRadius: "12px",
              marginBottom: "10px",
              alignItems: "center",
            }}
          >
            <strong>#{index + 1}</strong>
            <strong>{item.athlete_name}</strong>
            <span>{item.totalDistance.toFixed(2)} km</span>
            <span>{item.speedKmh.toFixed(1)} km/h</span>
            <span>
              {item.paceMinKm > 0
                ? item.paceMinKm.toFixed(1) + " min/km"
                : "-"}
            </span>
            <span
              style={{
                color: item.status === "MOVING" ? "#22c55e" : "#f97316",
              }}
            >
              {item.status}
            </span>

            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ color: "#94a3b8", margin: "6px 0" }}>
                Next: {item.nextCheckpoint.name} | ETA Finish:{" "}
                {item.etaMinutes > 0
                  ? item.etaMinutes.toFixed(1) + " menit"
                  : "-"}
              </p>

              <div
                style={{
                  height: "8px",
                  background: "#1e293b",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(item.progress * 100).toFixed(1)}%`,
                    height: "100%",
                    background: "#22c55e",
                  }}
                />
              </div>
            </div>
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