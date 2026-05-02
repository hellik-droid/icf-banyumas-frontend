/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

const LeafletMap = MapContainer as any;

const redIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const blueIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function AutoFitBounds({ data }: any) {
  const map = useMap();

  const valid = data.filter(
    (item: any) => item.latitude !== null && item.longitude !== null
  );

  if (valid.length === 0) return null;

  const bounds = valid.map((item: any) => [
    Number(item.latitude),
    Number(item.longitude),
  ]);

  map.fitBounds(bounds, {
    padding: [40, 40],
  });

  return null;
}

export default function MapClient({ data }: any) {
  const validData = data.filter(
    (item: any) =>
      item.latitude !== null &&
      item.longitude !== null &&
      item.athlete_name !== null
  );

  const center: [number, number] = [-7.4246, 109.2396];

  const latest = validData[0];

  return (
    <div>
      <LeafletMap
        center={center}
        zoom={13}
        style={{
          height: "550px",
          width: "100%",
          marginTop: "20px",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <AutoFitBounds data={validData} />

        {validData.map((item: any) => {
          const position: [number, number] = [
            Number(item.latitude),
            Number(item.longitude),
          ];

          const isLatest = item.id === latest?.id;

          return (
            <Marker
              key={item.id}
              position={position}
              icon={isLatest ? redIcon : blueIcon}
            >
              <Popup>
                <strong>{item.athlete_name}</strong>
                <br />
                Latitude: {item.latitude}
                <br />
                Longitude: {item.longitude}
                <br />
                Status: {isLatest ? "Posisi terbaru" : "Data sebelumnya"}
                <br />
                Waktu: {new Date(item.timestamp).toLocaleString("id-ID")}
              </Popup>
            </Marker>
          );
        })}
      </LeafletMap>

      <div style={{ marginTop: "20px" }}>
        <h2 style={{ marginBottom: "12px" }}>Daftar Atlet Terpantau</h2>

        {validData.map((item: any) => {
          const isLatest = item.id === latest?.id;

          return (
            <div
              key={item.id}
              style={{
                padding: "14px",
                marginBottom: "10px",
                background: isLatest ? "#7f1d1d" : "#111827",
                border: isLatest ? "1px solid #ef4444" : "1px solid #374151",
                borderRadius: "12px",
                color: "white",
              }}
            >
              <strong>{item.athlete_name}</strong>{" "}
              {isLatest && <span style={{ color: "#fca5a5" }}>● Terbaru</span>}
              <br />
              Koordinat: {item.latitude}, {item.longitude}
              <br />
              Waktu: {new Date(item.timestamp).toLocaleString("id-ID")}
            </div>
          );
        })}
      </div>
    </div>
  );
}