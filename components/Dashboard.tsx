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

function formatRaceTime(ms: number) {
  if (!ms || ms < 0) return "0m 00s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatTimelineLabel(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h\n${String(
      minutes
    ).padStart(2, "0")}m`;
  }

  if (hours > 0) return `${hours}h\n${String(minutes).padStart(2, "0")}m`;

  return `${minutes}m`;
}

export default function Dashboard() {
  const [tracking, setTracking] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedPoi, setSelectedPoi] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [isReplay, setIsReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [now, setNow] = useState(Date.now());

  const [showAthleteCard, setShowAthleteCard] = useState(false);
  const [showAthleteList, setShowAthleteList] = useState(true);
  const [showPoiList, setShowPoiList] = useState(true);

  const eventTitle = "ICF Banyumas Training";

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

  const selectedData = useMemo(() => {
    if (!selectedAthlete) return [];

    return tracking
      .filter((item) => item.athlete_name === selectedAthlete)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [tracking, selectedAthlete]);

  const replayData = useMemo(() => {
    if (!isReplay) return tracking;

    const sorted = [...tracking].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sorted.slice(0, replayIndex + 1);
  }, [tracking, isReplay, replayIndex]);

  const selectedLeader = leaderboard.find(
    (item) => item.athlete_name === selectedAthlete
  );

  const selectedLatest =
    selectedData.length > 0 ? selectedData[selectedData.length - 1] : null;

  const firstTime =
    selectedData.length > 0 ? new Date(selectedData[0].timestamp).getTime() : 0;

  const lastTime =
    selectedData.length > 0
      ? new Date(selectedData[selectedData.length - 1].timestamp).getTime()
      : 0;

  const elapsedMs = firstTime ? now - firstTime : 0;
  const elapsedTime = firstTime ? formatDuration(elapsedMs) : "00:00:00";

  const totalDistance = routeInfo?.distanceKm || 1;
  const athleteDistance = Number(selectedLeader?.distance_km || 0);

  const progressPercent =
    selectedAthlete && selectedLeader
      ? Math.min((athleteDistance / totalDistance) * 100, 100)
      : 0;

  const eventStartTime =
    tracking.length > 0
      ? Math.min(...tracking.map((d) => new Date(d.timestamp).getTime()))
      : 0;

  const eventDurationMs = eventStartTime ? now - eventStartTime : 0;

  const replayProgress =
    tracking.length > 1
      ? (replayIndex / Math.max(tracking.length - 1, 1)) * 100
      : 0;

  const kmMarkers = useMemo(() => {
    const totalKm = Math.max(Math.ceil(totalDistance), 1);
    return Array.from({ length: totalKm + 1 }, (_, index) => index);
  }, [totalDistance]);

  const timelineMarkers = useMemo(() => {
    const duration = Math.max(eventDurationMs, 60 * 60 * 1000);
    const markerCount = 7;

    return Array.from({ length: markerCount }, (_, index) => {
      const percent = (index / (markerCount - 1)) * 100;
      const time = (duration * percent) / 100;
      return { percent, label: formatTimelineLabel(time) };
    });
  }, [eventDurationMs]);

  const route = routeInfo?.route || [];

  const poiItems = useMemo(() => {
    if (!Array.isArray(route) || route.length < 2) {
      return [
        { label: "START", detail: "Race start point", point: null },
        { label: "CP 1", detail: "Checkpoint 1", point: null },
        { label: "CP 2", detail: "Checkpoint 2", point: null },
        { label: "CP 3", detail: "Checkpoint 3", point: null },
        { label: "FINISH", detail: "Race finish point", point: null },
      ];
    }

    return [
      { label: "START", detail: "Race start point", point: route[0] },
      {
        label: "CP 1",
        detail: "Checkpoint 1",
        point: route[Math.floor(route.length * 0.25)],
      },
      {
        label: "CP 2",
        detail: "Checkpoint 2",
        point: route[Math.floor(route.length * 0.5)],
      },
      {
        label: "CP 3",
        detail: "Checkpoint 3",
        point: route[Math.floor(route.length * 0.75)],
      },
      {
        label: "FINISH",
        detail: "Race finish point",
        point: route[route.length - 1],
      },
    ];
  }, [route]);

  function handleSelectAthlete(name: string) {
    setSelectedAthlete(name);
    setSelectedPoi(null);
    setShowAthleteCard(true);
    setShowAthleteList(true);
  }

  function handleCloseAthletes() {
    setSelectedAthlete("");
    setShowAthleteCard(false);
    setShowAthleteList(false);
  }

  function handleOpenAthletes() {
    setShowAthleteList(true);
  }

  function handleSelectPoi(item: any) {
    setSelectedPoi(item);
    setShowAthleteCard(false);
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
        gridTemplateRows: "1fr 110px",
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
        <div
          style={{
            padding: "18px 16px",
            background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
            color: "white",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 18,
              marginBottom: 10,
              border: "1px solid rgba(255,255,255,.25)",
            }}
          >
            ICF
          </div>

          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.2 }}>
            {eventTitle}
          </h2>

          <p style={{ margin: "6px 0 0 0", color: "#bfdbfe", fontSize: 13 }}>
            Live race tracking dashboard
          </p>
        </div>

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

        <PanelTitle
          title="Start / Finish"
          isOpen={showPoiList}
          onClose={() => setShowPoiList(false)}
          onOpen={() => setShowPoiList(true)}
        />

        {showPoiList ? (
          <div>
            {poiItems.map((item) => (
              <PoiItem
                key={item.label}
                label={item.label}
                detail={item.detail}
                active={selectedPoi?.label === item.label}
                onClick={() => handleSelectPoi(item)}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: 14,
              color: "#64748b",
              fontSize: 13,
              background: "white",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            Start / Finish hidden.
          </div>
        )}

        <PanelTitle
          title="Athletes"
          isOpen={showAthleteList}
          onClose={handleCloseAthletes}
          onOpen={handleOpenAthletes}
        />

        {showAthleteList ? (
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
                    selectedAthlete === item.athlete_name
                      ? "#dbeafe"
                      : "white",
                  cursor: "pointer",
                }}
              >
                <strong>
                  {index + 1}. {item.athlete_name}
                </strong>

                <div
                  style={{ fontSize: "13px", color: "#475569", marginTop: 4 }}
                >
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
        ) : (
          <div
            style={{
              flex: 1,
              padding: 18,
              color: "#475569",
              background: "#f8fafc",
              fontSize: 14,
            }}
          >
            Athlete list hidden. Semua titik atlet tetap tampil di map.
          </div>
        )}

        <div
          style={{
            padding: "14px",
            borderTop: "1px solid #cbd5e1",
            background: "white",
            color: "#64748b",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          Powered by
          <br />
          <strong style={{ color: "#0f172a", fontSize: 13 }}>
            Universitas Amikom Purwokerto
          </strong>
        </div>
      </aside>

      <section style={{ position: "relative", overflow: "hidden" }}>
<RaceMap
  data={replayData}
  selectedAthlete={selectedAthlete}
  route={route}
  checkpoints={routeInfo?.checkpoints || []}
  selectedPoi={selectedPoi}
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

        {selectedPoi && (
          <div
            style={{
              position: "absolute",
              right: 24,
              top: 24,
              width: "360px",
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
              onClick={() => setSelectedPoi(null)}
              style={closeFloatingButton}
            >
              ×
            </button>

            <h2 style={{ margin: "0 36px 8px 0" }}>{selectedPoi.label}</h2>

            <p style={{ margin: "0 0 14px 0", color: "#cbd5e1" }}>
              {selectedPoi.detail}
            </p>

<div
  style={{
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "rgba(2, 6, 23, .45)",
    border: "1px solid rgba(148, 163, 184, .25)",
  }}
>
  <div style={{ color: "#93c5fd", fontWeight: 800, marginBottom: 10 }}>
    Urutan Atlet
  </div>

  {leaderboard.length === 0 ? (
    <div style={{ color: "#cbd5e1", fontSize: 13 }}>
      Belum ada data atlet.
    </div>
  ) : (
    leaderboard.slice(0, 10).map((item, index) => (
      <div
        key={item.athlete_name}
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          padding: "8px 0",
          borderBottom: "1px solid rgba(148,163,184,.18)",
          fontSize: 13,
        }}
      >
        <span>
          {index + 1}. {item.athlete_name}
        </span>

        <span style={{ color: "#bae6fd", fontWeight: 700 }}>
          {item.distance_km || 0} KM
        </span>
      </div>
    ))
  )}
</div>
          </div>
        )}

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
              style={closeFloatingButton}
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
                value={`${athleteDistance} / ${totalDistance} KM`}
              />

              <DetailItem
                label="Kecepatan"
                value={`${selectedLeader?.speed_kmh || 0} km/h`}
              />

              <DetailItem label="Waktu tempuh" value={elapsedTime} />

              <DetailItem
                label="Progress"
                value={`${progressPercent.toFixed(1)}%`}
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
                Start:{" "}
                {firstTime ? new Date(firstTime).toLocaleString("id-ID") : "-"}
              </div>

              <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 13 }}>
                Last update:{" "}
                {lastTime ? new Date(lastTime).toLocaleString("id-ID") : "-"}
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
          gridTemplateColumns: "130px 1fr 260px",
          alignItems: "center",
          gap: "18px",
          padding: "10px 20px",
        }}
      >
        <button
          onClick={() => setIsReplay(!isReplay)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "18px",
            fontWeight: 800,
            cursor: "pointer",
            color: "#0369a1",
          }}
        >
          {isReplay ? "▶ REPLAY" : "▌▌ LIVE"}
        </button>

        <div style={{ position: "relative", height: "78px" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 6,
              height: 34,
            }}
          >
            {timelineMarkers.map((marker, index) => (
              <div
                key={`time-${index}`}
                style={{
                  position: "absolute",
                  left: `${marker.percent}%`,
                  transform: "translateX(-50%)",
                  color: "#334155",
                  fontSize: 12,
                  whiteSpace: "pre-line",
                  textAlign: "center",
                  borderLeft: "1px solid #94a3b8",
                  paddingLeft: 4,
                  lineHeight: "14px",
                }}
              >
                {marker.label}
              </div>
            ))}
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 44,
              height: 6,
              background: "#d1d5db",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${isReplay ? replayProgress : progressPercent}%`,
                background: "#0ea5e9",
                borderRadius: 999,
              }}
            />
          </div>

          <input
            type="range"
            min="0"
            max={Math.max(tracking.length - 1, 0)}
            value={isReplay ? replayIndex : Math.max(tracking.length - 1, 0)}
            onChange={(e) => {
              setIsReplay(true);
              setReplayIndex(Number(e.target.value));
            }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 35,
              width: "100%",
              opacity: 0,
              cursor: "pointer",
              zIndex: 5,
            }}
          />

          <div
            style={{
              position: "absolute",
              left: `${isReplay ? replayProgress : progressPercent}%`,
              top: 35,
              transform: "translateX(-50%)",
              zIndex: 4,
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderBottom: "9px solid #2563eb",
                margin: "0 auto",
              }}
            />

            <div
              style={{
                background: "white",
                border: "2px solid #2563eb",
                color: "#334155",
                padding: "5px 8px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                marginTop: 2,
                whiteSpace: "nowrap",
              }}
            >
              {formatRaceTime(elapsedMs)}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 18,
            }}
          >
            {kmMarkers.map((km) => (
              <div
                key={`km-${km}`}
                style={{
                  position: "absolute",
                  left: `${(km / Math.max(totalDistance, 1)) * 100}%`,
                  transform: "translateX(-50%)",
                  fontSize: 12,
                  color: "#475569",
                  fontWeight: 700,
                  borderLeft: "1px solid #94a3b8",
                  paddingLeft: 4,
                }}
              >
                {km} KM
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontWeight: 800, color: "#334155", textAlign: "right" }}>
          <div>{selectedAthlete || "All athletes"}</div>

          <div style={{ color: "#0369a1", marginTop: 4 }}>
            {selectedAthlete
              ? `${athleteDistance}/${totalDistance} KM`
              : `${leaderboard.length} athletes visible`}
          </div>
        </div>
      </footer>
    </main>
  );
}

function PanelTitle({
  title,
  isOpen,
  onClose,
  onOpen,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      style={{
        background: "#dbeafe",
        padding: "12px 14px",
        fontWeight: 700,
        borderTop: "1px solid #cbd5e1",
        borderBottom: "1px solid #cbd5e1",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span>{title}</span>

      {isOpen ? (
        <button onClick={onClose} style={miniCloseButton}>
          ×
        </button>
      ) : (
        <button onClick={onOpen} style={miniOpenButton}>
          Show
        </button>
      )}
    </div>
  );
}

function PoiItem({
  label,
  detail,
  active,
  onClick,
}: {
  label: string;
  detail: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "13px 14px",
        border: "none",
        borderBottom: "1px solid #e2e8f0",
        background: active ? "#dbeafe" : "white",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      🏁 {label}
      <div
        style={{
          marginTop: 4,
          color: "#64748b",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {detail}
      </div>
    </button>
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

      <div
        style={{
          color: "white",
          fontSize: 18,
          fontWeight: 800,
          marginTop: 5,
        }}
      >
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

const miniCloseButton = {
  width: 26,
  height: 26,
  borderRadius: 999,
  border: "1px solid #94a3b8",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const miniOpenButton = {
  border: "1px solid #94a3b8",
  background: "white",
  borderRadius: 999,
  padding: "4px 10px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};

const closeFloatingButton = {
  position: "absolute" as const,
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
};