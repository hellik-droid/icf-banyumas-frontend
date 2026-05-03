/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";

const LeafletMap = MapContainer as any;

const colors = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#14b8a6",
  "#eab308",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

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

function getSpeedColor(speed: number) {
  if (speed > 25) return "#dc2626";
  if (speed > 18) return "#f97316";
  if (speed > 12) return "#eab308";
  if (speed > 6) return "#22c55e";
  return "#3b82f6";
}

function createIcon(label: number, color: string, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${selected ? "42px" : "34px"};
        height:${selected ? "42px" : "34px"};
        border-radius:999px;
        background:${color};
        color:white;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:800;
        border:4px solid ${selected ? "white" : "#020617"};
        box-shadow:0 8px 20px rgba(0,0,0,.35);
        transform: translate(-50%, -50%);
      ">
        ${label}
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function createCheckpointIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        background:#0f172a;
        color:white;
        padding:6px 10px;
        border-radius:999px;
        font-weight:700;
        border:3px solid #38bdf8;
        box-shadow:0 4px 12px rgba(0,0,0,.35);
        white-space:nowrap;
      ">
        ${label}
      </div>
    `,
  });
}

const startIcon = createCheckpointIcon("START");
const finishIcon = createCheckpointIcon("FINISH");

function AutoFollow({ athlete }: any) {
  const map = useMap();

  useEffect(() => {
    if (!athlete) return;

    map.flyTo(
      [Number(athlete.latitude), Number(athlete.longitude)],
      17,
      { duration: 1.2 }
    );
  }, [athlete, map]);

  return null;
}

function FitRoute({ route }: any) {
  const map = useMap();

  useEffect(() => {
    if (!route || route.length === 0) return;
    map.fitBounds(route, { padding: [40, 40] });
  }, [route, map]);

  return null;
}

function AnimatedMarker({ item, icon }: any) {
  const markerRef = useRef<any>(null);
  const prevPos = useRef<[number, number]>([
    Number(item.latitude),
    Number(item.longitude),
  ]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const start = prevPos.current;
    const end: [number, number] = [
      Number(item.latitude),
      Number(item.longitude),
    ];

    let step = 0;
    const totalSteps = 20;

    const interval = setInterval(() => {
      step++;

      const lat = start[0] + (end[0] - start[0]) * (step / totalSteps);
      const lng = start[1] + (end[1] - start[1]) * (step / totalSteps);

      marker.setLatLng([lat, lng]);

      if (step >= totalSteps) {
        clearInterval(interval);
        prevPos.current = end;
      }
    }, 40);

    return () => clearInterval(interval);
  }, [item.latitude, item.longitude]);

  return (
    <Marker
      ref={markerRef}
      position={[Number(item.latitude), Number(item.longitude)]}
      icon={icon}
    >
      <Popup>
        <strong>{item.athlete_name}</strong>
        <br />
        Latitude: {item.latitude}
        <br />
        Longitude: {item.longitude}
        <br />
        Update: {new Date(item.timestamp).toLocaleString("id-ID")}
      </Popup>
    </Marker>
  );
}

export default function MapClient({ data, selectedAthlete }: any) {
  const validData = data.filter(
    (item: any) =>
      item &&
      item.athlete_name &&
      item.latitude !== null &&
      item.longitude !== null &&
      !Number.isNaN(Number(item.latitude)) &&
      !Number.isNaN(Number(item.longitude))
  );

  const latestMap = new globalThis.Map<string, any>();

  validData.forEach((item: any) => {
    const existing = latestMap.get(item.athlete_name);

    if (
      !existing ||
      new Date(item.timestamp).getTime() >
        new Date(existing.timestamp).getTime()
    ) {
      latestMap.set(item.athlete_name, item);
    }
  });

  const latestPerAthlete = Array.from(latestMap.values()).slice(0, 10);

  const selectedLatest = latestPerAthlete.find(
    (item: any) => item.athlete_name === selectedAthlete
  );

  const selectedTrack = validData
    .filter((item: any) => item.athlete_name === selectedAthlete)
    .sort(
      (a: any, b: any) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    )
    .map((item: any) => [Number(item.latitude), Number(item.longitude)]);

  const speedPoints = validData
    .filter((item: any) => item.athlete_name === selectedAthlete)
    .sort(
      (a: any, b: any) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    )
    .map((item: any, index: number, arr: any[]) => {
      if (index === 0) return { ...item, speed: 0 };

      const prev = arr[index - 1];

      const dist = distanceKm(
        Number(prev.latitude),
        Number(prev.longitude),
        Number(item.latitude),
        Number(item.longitude)
      );

      const hours =
        (new Date(item.timestamp).getTime() -
          new Date(prev.timestamp).getTime()) /
        1000 /
        3600;

      let speed = hours > 0 ? dist / hours : 0;

      if (speed > 60) speed = 0;

      return { ...item, speed };
    });

  const raceRoute: [number, number][] = [
    [-7.4564651, 109.2621908],
    [-7.4563547, 109.2626408],
    [-7.4554416, 109.262382],
    [-7.4553538, 109.261572],
    [-7.4564828, 109.2614795],
    [-7.456474, 109.2622385],
  ];

  const checkpointPositions: [number, number][] = [
    raceRoute[0],
    raceRoute[Math.floor(raceRoute.length * 0.25)],
    raceRoute[Math.floor(raceRoute.length * 0.5)],
    raceRoute[Math.floor(raceRoute.length * 0.75)],
    raceRoute[raceRoute.length - 1],
  ];

  return (
    <LeafletMap
      center={raceRoute[0]}
      zoom={17}
      style={{
        height: "640px",
        width: "100%",
        marginTop: "20px",
        borderRadius: "18px",
        overflow: "hidden",
        border: "1px solid #1e293b",
      }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <FitRoute route={raceRoute} />

      <Polyline
        positions={raceRoute}
        pathOptions={{ color: "#16a34a", weight: 6, opacity: 0.85 }}
      />

      <Marker position={raceRoute[0]} icon={startIcon}>
        <Popup>Start</Popup>
      </Marker>

      <Marker position={raceRoute[raceRoute.length - 1]} icon={finishIcon}>
        <Popup>Finish</Popup>
      </Marker>

      {checkpointPositions.map((pos, index) => {
        if (index === 0 || index === checkpointPositions.length - 1) {
          return null;
        }

        return (
          <Marker
            key={`checkpoint-${index}`}
            position={pos}
            icon={createCheckpointIcon(`CP ${index}`)}
          >
            <Popup>Checkpoint {index}</Popup>
          </Marker>
        );
      })}

      {selectedTrack.length > 1 && (
        <Polyline
          positions={selectedTrack as any}
          pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.9 }}
        />
      )}

      {speedPoints.map((point: any, index: number) => (
        <CircleMarker
          key={`speed-${index}`}
          center={[Number(point.latitude), Number(point.longitude)]}
          radius={7}
          pathOptions={{
            color: getSpeedColor(point.speed),
            fillColor: getSpeedColor(point.speed),
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Popup>
            <strong>{point.athlete_name}</strong>
            <br />
            Speed: {point.speed.toFixed(1)} km/h
            <br />
            {point.latitude}, {point.longitude}
          </Popup>
        </CircleMarker>
      ))}

      <AutoFollow athlete={selectedLatest} />

      {latestPerAthlete.map((item: any, index: number) => {
        const isSelected = item.athlete_name === selectedAthlete;
        const icon = createIcon(
          index + 1,
          colors[index % colors.length],
          isSelected
        );

        return (
          <AnimatedMarker
            key={item.athlete_name}
            item={item}
            icon={icon}
          />
        );
      })}
    </LeafletMap>
  );
}