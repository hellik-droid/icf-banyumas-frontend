/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export default function Map({ data }: any) {
  return (
    <MapContainer
      center={[-7.4246, 109.2396]}
      zoom={13}
      style={{ height: "500px", width: "100%", marginTop: "20px" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {data.map((item: any, index: number) => (
        <Marker key={index} position={[item.latitude, item.longitude]}>
          <Popup>
            {item.athlete_name}
            <br />
            {item.latitude}, {item.longitude}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}