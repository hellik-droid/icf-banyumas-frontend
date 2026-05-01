"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("../components/Map"), { ssr: false });

export default function Home() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("https://icf-banyumas-backend-production.up.railway.app/tracking")
      .then((res) => res.json())
      .then((res) => setData(res));
  }, []);

  return (
    <main style={{ padding: "20px" }}>
      <h1>ICF Banyumas Race Map</h1>
      <p>Live tracking atlet ICF Banyumas</p>
      <Map data={data} />
    </main>
  );
}