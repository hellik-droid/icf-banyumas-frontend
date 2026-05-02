/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

const LeafletMap = MapContainer as any;

export default function MapClient({ data }: any) {
  const validData = data.filter(
    (item: any) =>
      item.latitude !== null &&
      item.longitude !== null &&
      item.athlete_name !== null
  );

  const center: [number, number] = [-7.4246, 109.2396];

  return (
    <div>
      <LeafletMap
        center={center}
        zoom={13}
        style={{
          height: "550px",
          width: "100%",
          marginTop: "20px",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {validData.map((item: any) => {
          const position: [number, number] = [
            Number(item.latitude),
            Number(item.longitude),
          ];

          return (
            <Marker key={item.id} position={position}>
              <Popup>
                <strong>{item.athlete_name}</strong>
                <br />
                Latitude: {item.latitude}
                <br />
                Longitude: {item.longitude}
                <br />
                Waktu: {new Date(item.timestamp).toLocaleString("id-ID")}
              </Popup>
            </Marker>
          );
        })}
      </LeafletMap>

      <div style={{ marginTop: "20px" }}>
        <h2>Daftar Atlet Terpantau</h2>

        {validData.map((item: any) => (
          <div
            key={item.id}
            style={{
              padding: "12px",
              marginBottom: "10px",
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: "10px",
              color: "white",
            }}
          >
            <strong>{item.athlete_name}</strong>
            <br />
            Koordinat: {item.latitude}, {item.longitude}
            <br />
            Waktu: {new Date(item.timestamp).toLocaleString("id-ID")}
          </div>
        ))}
      </div>
    </div>
  );
}