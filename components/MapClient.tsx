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
import "leaflet/dist/leaflet.css";

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
];

function FocusPoi({ selectedPoi }: any) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPoi?.point) return;

    const [lat, lng] = selectedPoi.point;

    map.flyTo([Number(lat), Number(lng)], 17, {
      duration: 1.2,
    });

    L.popup()
      .setLatLng([Number(lat), Number(lng)])
      .setContent(`
        <b>${selectedPoi.label}</b><br/>
        ${selectedPoi.detail || ""}
      `)
      .openOn(map);
  }, [selectedPoi, map]);

  return null;
}

function createAthleteIcon(label: string, color: string, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        display:flex;
        align-items:center;
        gap:6px;
        background:${selected ? "#ef4444" : color};
        color:white;
        padding:6px 10px;
        border-radius:999px;
        font-weight:800;
        border:3px solid white;
        box-shadow:0 8px 20px rgba(0,0,0,.35);
        white-space:nowrap;
        font-size:12px;
      ">
        ● ${label}
      </div>
    `,
    iconSize: [140, 34],
    iconAnchor: [20, 17],
  });
}

function createPoiIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        background:#111827;
        color:white;
        padding:6px 9px;
        border-radius:4px;
        font-weight:800;
        border:2px solid white;
        box-shadow:0 6px 16px rgba(0,0,0,.35);
        font-size:11px;
        white-space:nowrap;
      ">
        ${label}
      </div>
    `,
    iconSize: [80, 30],
    iconAnchor: [40, 15],
  });
}

function AutoFollow({ athlete }: any) {
  const map = useMap();

  useEffect(() => {
    if (!athlete) return;

    map.flyTo([Number(athlete.latitude), Number(athlete.longitude)], 16, {
      duration: 1.1,
    });
  }, [athlete, map]);

  return null;
}

function FitRoute({ route }: any) {
  const map = useMap();

  useEffect(() => {
    if (!route || route.length < 2) return;
    map.fitBounds(route, { padding: [50, 50] });
  }, [route, map]);

  return null;
}

function AnimatedMarker({ item, icon, onClick }: any) {
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
    const totalSteps = 25;

    const interval = setInterval(() => {
      step++;

      const lat = start[0] + (end[0] - start[0]) * (step / totalSteps);
      const lng = start[1] + (end[1] - start[1]) * (step / totalSteps);

      marker.setLatLng([lat, lng]);

      if (step >= totalSteps) {
        clearInterval(interval);
        prevPos.current = end;
      }
    }, 35);

    return () => clearInterval(interval);
  }, [item.latitude, item.longitude]);

  return (
    <Marker
      ref={markerRef}
      position={[Number(item.latitude), Number(item.longitude)]}
      icon={icon}
      eventHandlers={{
        click: () => onClick(item.athlete_name),
      }}
    >
      <Popup>
        <strong>{item.athlete_name}</strong>
        <br />
        Speed: {item.speed || item.speed_kmh || 0} km/h
        <br />
        Lat: {item.latitude}
        <br />
        Lng: {item.longitude}
        <br />
        {item.timestamp
          ? new Date(item.timestamp).toLocaleString("id-ID")
          : "-"}
      </Popup>
    </Marker>
  );
}

export default function MapClient({
  data = [],
  selectedAthlete = "",
  route = [],
  selectedPoi = null,
  onSelectAthlete,
}: any) {
  const fallbackRoute: [number, number][] = [
    [-7.4564651, 109.2621908],
    [-7.4563547, 109.2626408],
    [-7.4554416, 109.262382],
    [-7.4553538, 109.261572],
    [-7.4564828, 109.2614795],
    [-7.456474, 109.2622385],
  ];

  const raceRoute: [number, number][] =
    Array.isArray(route) && route.length > 0 ? route : fallbackRoute;

  const validData = Array.isArray(data)
    ? data.filter(
        (item: any) =>
          item &&
          item.athlete_name &&
          item.latitude !== null &&
          item.longitude !== null &&
          !Number.isNaN(Number(item.latitude)) &&
          !Number.isNaN(Number(item.longitude))
      )
    : [];

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

  const latestPerAthlete = Array.from(latestMap.values()).slice(0, 30);

  const selectedLatest = latestPerAthlete.find(
    (item: any) => item.athlete_name === selectedAthlete
  );

  const selectedTrack = validData
    .filter((item: any) => item.athlete_name === selectedAthlete)
    .sort(
      (a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .map((item: any) => [Number(item.latitude), Number(item.longitude)]);

  const cp1 = raceRoute[Math.floor(raceRoute.length * 0.25)];
  const cp2 = raceRoute[Math.floor(raceRoute.length * 0.5)];
  const cp3 = raceRoute[Math.floor(raceRoute.length * 0.75)];

  return (
    <LeafletMap
      center={raceRoute[0]}
      zoom={13}
      style={{
        height: "100%",
        width: "100%",
      }}
      zoomControl={true}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitRoute route={raceRoute} />
      <FocusPoi selectedPoi={selectedPoi} />
      <Polyline
        positions={raceRoute}
        pathOptions={{ color: "#16a34a", weight: 6, opacity: 0.85 }}
      />

      <Marker position={raceRoute[0]} icon={createPoiIcon("START")}>
        <Popup>Start</Popup>
      </Marker>

      {cp1 && (
        <Marker position={cp1} icon={createPoiIcon("CP1")}>
          <Popup>Checkpoint 1</Popup>
        </Marker>
      )}

      {cp2 && (
        <Marker position={cp2} icon={createPoiIcon("CP2")}>
          <Popup>Checkpoint 2</Popup>
        </Marker>
      )}

      {cp3 && (
        <Marker position={cp3} icon={createPoiIcon("CP3")}>
          <Popup>Checkpoint 3</Popup>
        </Marker>
      )}

      <Marker
        position={raceRoute[raceRoute.length - 1]}
        icon={createPoiIcon("FINISH")}
      >
        <Popup>Finish</Popup>
      </Marker>

      {selectedTrack.length > 1 && (
        <Polyline
          positions={selectedTrack as any}
          pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.95 }}
        />
      )}

      {selectedTrack.map((pos: any, index: number) => (
        <CircleMarker
          key={`track-${index}`}
          center={pos}
          radius={5}
          pathOptions={{
            color: "#0ea5e9",
            fillColor: "#0ea5e9",
            fillOpacity: 0.7,
            weight: 2,
          }}
        />
      ))}

      <AutoFollow athlete={selectedLatest} />

      {latestPerAthlete.map((item: any, index: number) => {
        const isSelected = item.athlete_name === selectedAthlete;

        const icon = createAthleteIcon(
          `${index + 1}. ${item.athlete_name}`,
          colors[index % colors.length],
          isSelected
        );

        return (
          <AnimatedMarker
            key={item.athlete_name}
            item={item}
            icon={icon}
            onClick={onSelectAthlete}
          />
        );
      })}
    </LeafletMap>
  );
}