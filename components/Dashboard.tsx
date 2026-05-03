/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";

const RaceMap = dynamic(() => import("./MapClient"), { ssr: false });

const API_URL = "https://icf-banyumas-backend-production.up.railway.app";

function formatDuration(ms: number) {
  if (!ms || ms < 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function Dashboard() {
  const [tracking, setTracking] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [search, setSearch] = useState("");
  const [isReplay, setIsReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [showAthleteCard, setShowAthleteCard] = useState(true);

  async function fetchAll() {
    try {
      const [trackingRes, leaderRes, checkpointRes] = await Promise.all([
        fetch(`${API_URL}/tracking?raceId=1`),
        fetch(`${API_URL}/pro/leaderboard?raceId=1`),
        fetch(`${API_URL}/pro/checkpoints`),
      ]);

      const trackingJson = await trackingRes.json();
      const leaderJson = await leaderRes.json();
      const checkpointJson = await checkpointRes.json();

      setTracking(Array.isArray(trackingJson) ? trackingJson : []);
      setLeaderboard(leaderJson?.data || []);
      setRouteInfo(checkpointJson || null);

      if (!selectedAthlete && leaderJson?.data?.length > 0) {
        setSelectedAthlete(leaderJson.data[0].athlete_name);
        setShowAthleteCard(true);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }

  useEffect(() => {
    fetchAll();

    const socket = io(API_URL);

    socket.on("location-update", (newData) => {
      setTracking((prev) => [newData, ...prev]);

      fetch(`${API_URL}/pro/leaderboard?raceId=1`)
        .then((res) => res.json())
        .then((json) => setLeaderboard(json?.data || []));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredAthletes = useMemo(() => {
    return leaderboard.filter((item) =>
      item.athlete_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [leaderboard, search]);

  const replayData = useMemo(() => {
    if (!isReplay) return tracking;

    const sorted = [...tracking].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sorted.slice(0, replayIndex + 1);
  }, [tracking, isReplay, replayIndex]);

  const selectedData = useMemo(() => {
    return tracking
      .filter((item) => item.athlete_name === selectedAthlete)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [tracking, selectedAthlete]);

  const selectedLeader = leaderboard.find(
    (item) => item.athlete_name === selectedAthlete
  );

  const selectedLatest =
    selectedData.length > 0 ? selectedData[selectedData.length - 1] : null;

  const firstTime =
    selectedData.length > 0 ? new Date(selectedData[0].timestamp).getTime() : 0;

  const elapsedTime = firstTime ? formatDuration(now - firstTime) : "00:00:00";

  const totalDistance = routeInfo?.distanceKm || 1;

  function handleSelectAthlete(name: string) {
    setSelectedAthlete(name);
    setShowAthleteCard(true);
  }

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0f172a",
        color: "#0f172a",
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        gridTemplateRows: "1fr 92px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <aside
        style={{
          gridRow: "1 / 3",
          background: "#f8fafc",
          borderRight: "1px solid #cbd5e1",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px", display: "flex", gap: "8px" }}>
          <input
            placeholder="Search athlete..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "12px",
              border: "1px solid #94a3b8",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />
          <button style={iconButton}>⚙</button>
          <button onClick={fetchAll} style={iconButton}>
            ↻
          </button>
        </div>

        <PanelTitle title="Points of interest" />
        <PoiItem label="START / FINISH" />
        <PoiItem label="CP 1" />
        <PoiItem label="CP 2" />
        <PoiItem label="CP 3" />

        <PanelTitle title="Athletes" />

        <div style={{ overflowY: "auto", flex: 1 }}>
          {filteredAthletes.map((item, index) => (
            <button
              key={item.athlete_name}
              onClick={() => handleSelectAthlete(item.athlete_name)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "14px",
                border: "none",
                borderBottom: "1px solid #e2e8f0",
                background:
                  selectedAthlete === item.athlete_name ? "#dbeafe" : "white",
                cursor: "pointer",
              }}
            >
              <strong>
                {index + 1}. {item.athlete_name}
              </strong>
              <div style={{ fontSize: "13px", color: "#475569", marginTop: 4 }}>
                {item.distance_km?.toFixed?.(2) || item.distance_km} km ·{" "}
                {item.status}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Speed {item.speed_kmh || 0} km/h · Progress{" "}
                {item.progress_percent || 0}%
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section style={{ position: "relative", overflow: "hidden" }}>
        <RaceMap
          data={replayData}
          selectedAthlete={selectedAthlete}
          route={routeInfo?.route || []}
          checkpoints={routeInfo?.checkpoints || []}
          onSelectAthlete={handleSelectAthlete}
        />

        <div
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            zIndex: 800,
            display: "flex",
            gap: "10px",
          }}
        >
          <button style={mapButton}>🔍</button>
          <button style={mapButton}>Recenter selection</button>
        </div>

        {showAthleteCard && selectedAthlete && (
          <div
            style={{
              position: "absolute",
              right: 24,
              top: 24,
              width: "420px",
              background: "rgba(15, 23, 42, 0.9)",
              color: "white",
              borderRadius: "18px",
              padding: "18px",
              zIndex: 900,
              backdropFilter: "blur(8px)",
              boxShadow: "0 20px 50px rgba(0,0,0,.35)",
              border: "1px solid rgba(255,255,255,.12)",
            }}
          >
            <button
              onClick={() => setShowAthleteCard(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                width: 30,
                height: 30,
                borderRadius: "999px",
                border: "none",
                background: "rgba(255,255,255,.15)",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <h2 style={{ margin: "0 36px 8px 0" }}>{selectedAthlete}</h2>

            <p style={{ margin: "0 0 14px 0", color: "#cbd5e1" }}>
              Detail posisi atlet real-time
            </p>

            <div style={detailGrid}>
              <DetailItem
                label="Jarak ditempuh"
                value={`${selectedLeader?.distance_km || 0} / ${totalDistance} KM`}
              />
              <DetailItem
                label="Kecepatan"
                value={`${selectedLeader?.speed_kmh || 0} km/h`}
              />
              <DetailItem label="Waktu tempuh" value={elapsedTime} />
              <DetailItem
                label="ETA"
                value={`${selectedLeader?.eta_minutes || 0} min`}
              />
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: "rgba(2, 6, 23, .45)",
                border: "1px solid rgba(148, 163, 184, .25)",
              }}
            >
              <div style={{ color: "#93c5fd", fontWeight: 700 }}>
                Koordinat lokasi atlet
              </div>
              <div style={{ marginTop: 6, color: "#e0f2fe" }}>
                Lat: {selectedLatest?.latitude || "-"}
              </div>
              <div style={{ marginTop: 4, color: "#e0f2fe" }}>
                Lng: {selectedLatest?.longitude || "-"}
              </div>
              <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 13 }}>
                Last update:{" "}
                {selectedLatest?.timestamp
                  ? new Date(selectedLatest.timestamp).toLocaleString("id-ID")
                  : "-"}
              </div>
            </div>
          </div>
        )}
      </section>

      <footer
        style={{
          gridColumn: "2 / 3",
          background: "#f8fafc",
          borderTop: "1px solid #cbd5e1",
          display: "grid",
          gridTemplateColumns: "140px 1fr 260px",
          alignItems: "center",
          gap: "18px",
          padding: "12px 20px",
        }}
      >
        <button
          onClick={() => setIsReplay(!isReplay)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "18px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isReplay ? "▶ REPLAY" : "▌▌ LIVE"}
        </button>

        <input
          type="range"
          min="0"
          max={Math.max(tracking.length - 1, 0)}
          value={isReplay ? replayIndex : Math.max(tracking.length - 1, 0)}
          onChange={(e) => {
            setIsReplay(true);
            setReplayIndex(Number(e.target.value));
          }}
          style={{ width: "100%" }}
        />

        <div style={{ fontWeight: 700, color: "#334155" }}>
          {elapsedTime} · {selectedLeader?.distance_km || 0}/{totalDistance} KM
        </div>
      </footer>
    </main>
  );
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div
      style={{
        background: "#dbeafe",
        padding: "12px 14px",
        fontWeight: 700,
        borderTop: "1px solid #cbd5e1",
        borderBottom: "1px solid #cbd5e1",
      }}
    >
      {title}
    </div>
  );
}

function PoiItem({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "13px 14px",
        borderBottom: "1px solid #e2e8f0",
        background: "white",
        fontWeight: 700,
      }}
    >
      🏁 {label}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(2, 6, 23, .45)",
        border: "1px solid rgba(148, 163, 184, .25)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: 13 }}>{label}</div>
      <div style={{ color: "white", fontSize: 18, fontWeight: 800, marginTop: 5 }}>
        {value}
      </div>
    </div>
  );
}

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const iconButton = {
  width: "48px",
  border: "1px solid #94a3b8",
  borderRadius: "8px",
  background: "white",
  cursor: "pointer",
};

const mapButton = {
  border: "none",
  borderRadius: "10px",
  background: "white",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(0,0,0,.18)",
};