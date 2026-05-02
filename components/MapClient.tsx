/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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

function AutoFollow({ athlete }: any) {
  const map = useMap();

  if (!athlete) return null;

  map.setView([Number(athlete.latitude), Number(athlete.longitude)], 15, {
    animate: true,
  });

  return null;
}

export default function MapClient({ data, selectedAthlete }: any) {
  const validData = data.filter(
    (item: any) =>
      item.latitude !== null &&
      item.longitude !== null &&
      item.athlete_name !== null
  );

  const latestPerAthlete = validData.reduce((acc: any[], item: any) => {
    const exists = acc.find((a) => a.athlete_name === item.athlete_name);
    if (!exists) acc.push(item);
    return acc;
  }, []);

  const selectedLatest = latestPerAthlete.find(
    (item: any) => item.athlete_name === selectedAthlete
  );

  const selectedTrack = validData
    .filter((item: any) => item.athlete_name === selectedAthlete)
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((item: any) => [Number(item.latitude), Number(item.longitude)]);

  const raceRoute: [number, number][] = [
    [-7.4246, 109.2396],
    [-7.4215, 109.2415],
    [-7.419, 109.244],
    [-7.4165, 109.247],
  ];

  const center: [number, number] = [-7.4246, 109.2396];

  return (
    <LeafletMap
      center={center}
      zoom={13}
      style={{
        height: "600px",
        width: "100%",
        marginTop: "20px",
        borderRadius: "16px",
        overflow: "hidden",
      }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <Polyline positions={raceRoute} />

      {selectedTrack.length > 1 && <Polyline positions={selectedTrack as any} />}

      <AutoFollow athlete={selectedLatest} />

      {latestPerAthlete.map((item: any) => {
        const position: [number, number] = [
          Number(item.latitude),
          Number(item.longitude),
        ];

        const isSelected = item.athlete_name === selectedAthlete;

        return (
          <Marker
            key={item.athlete_name}
            position={position}
            icon={isSelected ? redIcon : blueIcon}
          >
            <Popup>
              <strong>{item.athlete_name}</strong>
              <br />
              {isSelected ? "Sedang di-follow" : "Atlet aktif"}
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
  );
}