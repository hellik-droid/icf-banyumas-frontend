/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
});

export default function RaceMap(props: any = {}) {
  return (
    <MapClient
      data={props?.data ?? []}
      selectedAthlete={props?.selectedAthlete ?? ""}
      checkpoints={props?.checkpoints ?? []}
    />
  );
}