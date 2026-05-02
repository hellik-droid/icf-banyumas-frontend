/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
});

export default function Map({ data, selectedAthlete }: any) {
  return <MapClient data={data} selectedAthlete={selectedAthlete} />;
}