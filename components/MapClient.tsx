/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const LeafletMap = MapContainer as any;

const checkpointRoute: [number, number][] = [
  [-7.45495, 109.26628], // START
  [-7.45758, 109.28730], // CP1
  [-7.43835, 109.25457], // CP2
  [-7.44699, 109.25428], // CP3
  [-7.45495, 109.26621], // FINISH
];

function getPoiPoint(label: string): [number, number] | null {
  const key = label.replace(/\s/g, "").toUpperCase();

  if (key === "START") return checkpointRoute[0];
  if (key === "CP1") return checkpointRoute[1];
  if (key === "CP2") return checkpointRoute[2];
  if (key === "CP3") return checkpointRoute[3];
  if (key === "FINISH") return checkpointRoute[4];

  return null;
}

function createCheckpointIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        background:#020617;
        color:white;
        padding:8px 12px;
        border-radius:4px;
        font-weight:900;
        font-size:12px;
        border:2px solid white;
        box-shadow:0 8px 20px rgba(0,0,0,.35);
        white-space:nowrap;
      ">
        ${label}
      </div>
    `,
    iconSize: [80, 34],
    iconAnchor: [40, 17],
  });
}
function createAthleteIcon(name: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        background:#2563eb;
        color:white;
        padding:7px 12px;
        border-radius:999px;
        font-weight:900;
        font-size:12px;
        border:3px solid white;
        box-shadow:0 8px 20px rgba(0,0,0,.35);
        white-space:nowrap;
      ">
        🚴 ${name}
      </div>
    `,
    iconSize: [120, 34],
    iconAnchor: [20, 17],
  });
}
function FitRoute({ route }: any) {
  const map = useMap();
  const hasFit = useRef(false);

  useEffect(() => {
    if (hasFit.current) return;
    if (!route || route.length < 2) return;

    map.fitBounds(route, { padding: [60, 60] });
    hasFit.current = true;
  }, [route, map]);

  return null;
}

function FocusPoi({ selectedPoi }: any) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPoi?.label) return;

    const point = getPoiPoint(selectedPoi.label);
    if (!point) return;

    const [lat, lng] = point;

    map.flyTo([lat, lng], 17, {
      duration: 1.2,
    });

    L.popup()
      .setLatLng([lat, lng])
      .setContent(`<b>${selectedPoi.label}</b><br/>${selectedPoi.detail || ""}`)
      .openOn(map);
  }, [selectedPoi, map]);

  return null;
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

export default function MapClient({
  data = [],
  selectedAthlete = "",
  selectedPoi = null,
  onSelectAthlete,
}: any) {
  const [roadRoute, setRoadRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    async function loadRoute() {
      try {
        const coords = checkpointRoute
          .map(([lat, lng]) => `${lng},${lat}`)
          .join(";");

        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
        );

        const json = await res.json();

        const routeCoords = json.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        setRoadRoute(routeCoords);
      } catch (err) {
        console.error("OSRM error:", err);
        setRoadRoute(checkpointRoute);
      }
    }

    loadRoute();
  }, []);

  const raceRoute = roadRoute.length > 0 ? roadRoute : checkpointRoute;

  const latestMap = new Map();

  data.forEach((item: any) => {
    if (!item?.athlete_name) return;

    const lat = Number(item.latitude);
    const lng = Number(item.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const prev = latestMap.get(item.athlete_name);

    if (!prev || new Date(item.timestamp) > new Date(prev.timestamp)) {
      latestMap.set(item.athlete_name, item);
    }
  });

  const latestPerAthlete = Array.from(latestMap.values()).filter((item: any) => {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);

    return (
      item &&
      item.athlete_name &&
      item.latitude !== null &&
      item.longitude !== null &&
      item.latitude !== undefined &&
      item.longitude !== undefined &&
      !Number.isNaN(lat) &&
      !Number.isNaN(lng)
    );
  });

  const selectedLatest = latestPerAthlete.find(
    (a: any) => a.athlete_name === selectedAthlete
  );

  return (
    <LeafletMap
      center={checkpointRoute[0]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitRoute route={raceRoute} />
      <FocusPoi selectedPoi={selectedPoi} />
      <AutoFollow athlete={selectedLatest} />

      <Polyline
        positions={raceRoute}
        pathOptions={{ color: "#16a34a", weight: 6, opacity: 0.9 }}
      />

      <Marker position={checkpointRoute[0]} icon={createCheckpointIcon("START")}>
        <Popup>START</Popup>
      </Marker>

      <Marker position={checkpointRoute[1]} icon={createCheckpointIcon("CP1")}>
        <Popup>CP1</Popup>
      </Marker>

      <Marker position={checkpointRoute[2]} icon={createCheckpointIcon("CP2")}>
        <Popup>CP2</Popup>
      </Marker>

      <Marker position={checkpointRoute[3]} icon={createCheckpointIcon("CP3")}>
        <Popup>CP3</Popup>
      </Marker>

      <Marker
        position={checkpointRoute[4]}
        icon={createCheckpointIcon("FINISH")}
      >
        <Popup>FINISH</Popup>
      </Marker>

      {latestPerAthlete.map((item: any) => (
        <Marker
          key={item.athlete_name}
          position={[Number(item.latitude), Number(item.longitude)]}
          icon={createAthleteIcon(item.athlete_name)}
          eventHandlers={{
            click: () => onSelectAthlete(item.athlete_name),
          }}
        >
          <Popup>
            <strong>{item.athlete_name}</strong>
            <br />
            Speed: {item.speed_kmh || 0} km/h
          </Popup>
        </Marker>
      ))}
    </LeafletMap>
  );
}
