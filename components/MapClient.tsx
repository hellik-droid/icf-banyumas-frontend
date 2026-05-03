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

const startIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      background:#22c55e;
      color:white;
      padding:6px 10px;
      border-radius:999px;
      font-weight:700;
      border:3px solid white;
      box-shadow:0 4px 12px rgba(0,0,0,.3);
    ">START</div>
  `,
});

const finishIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      background:#ef4444;
      color:white;
      padding:6px 10px;
      border-radius:999px;
      font-weight:700;
      border:3px solid white;
      box-shadow:0 4px 12px rgba(0,0,0,.3);
    ">FINISH</div>
  `,
});

function AutoFollow({ athlete }: any) {
  const map = useMap();

  useEffect(() => {
    if (!athlete) return;

    map.flyTo(
      [Number(athlete.latitude), Number(athlete.longitude)],
      15,
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

export default function MapClient({ data, selectedAthlete, routeData }: any) {
  const validData = data.filter(
    (item: any) =>
      item &&
      item.athlete_name &&
      item.latitude !== null &&
      item.longitude !== null &&
      !isNaN(Number(item.latitude)) &&
      !isNaN(Number(item.longitude))
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

  const fallbackRoute: [number, number][] = [
    [-7.4098, 109.2428],
    [-7.4028, 109.2398],
    [-7.3942, 109.2372],
    [-7.3844, 109.2346],
    [-7.3735, 109.2324],
    [-7.3615, 109.2306],
    [-7.3485, 109.2293],
    [-7.336, 109.2286],
    [-7.318161, 109.228742],
  ];

  const raceRoute: [number, number][] =
    routeData && routeData.length > 0 ? routeData : fallbackRoute;

  const center: [number, number] = [-7.4246, 109.2396];

  return (
    <LeafletMap
      center={center}
      zoom={13}
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
        <Popup>Start: Rektorat UNSOED</Popup>
      </Marker>

      <Marker position={raceRoute[raceRoute.length - 1]} icon={finishIcon}>
        <Popup>Finish: Bundaran Baturraden</Popup>
      </Marker>

      {selectedTrack.length > 1 && (
        <Polyline
          positions={selectedTrack as any}
          pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.9 }}
        />
      )}

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