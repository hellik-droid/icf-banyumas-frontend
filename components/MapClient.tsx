/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

const LeafletMap = MapContainer as any;

export default function MapClient({ data }: any) {
  const validData = data.filter(
    (item: any) => item.latitude !== null && item.longitude !== null
  );

  const center: [number, number] = [-7.4246, 109.2396];

  return (
    <LeafletMap center={center} zoom={13} style={{ height: "500px", width: "100%", marginTop: "20px" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {validData.map((item: any, index: number) => (
        <Marker key={index} position={[Number(item.latitude), Number(item.longitude)]}>
          <Popup>
            {item.athlete_name}
            <br />
            {item.latitude}, {item.longitude}
          </Popup>
        </Marker>
      ))}
    </LeafletMap>
  );
}