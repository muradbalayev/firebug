"use client";

import { GeoJSON, useMap } from "react-leaflet";
import { useMapStore } from "@/store/useMapStore";
import { useEffect } from "react";

/**
 * AOILayer Component
 * Seçilmiş Area of Interest-i göstərir
 */
export default function AOILayer() {
  const { aoi } = useMapStore();
  const map = useMap();

  // AOI style
  const aoiStyle = {
    color: "#f97316",
    weight: 3,
    fillColor: "#f97316",
    fillOpacity: 0.1,
    dashArray: "5, 10"
  };

  if (!aoi) return null;

  return (
    <GeoJSON
      key={JSON.stringify(aoi)}
      data={aoi}
      style={aoiStyle}
    />
  );
}
