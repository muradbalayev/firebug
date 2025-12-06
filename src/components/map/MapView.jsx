"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { useMapStore } from "@/store/useMapStore";
import DrawControls from "./DrawControls";
import HotspotLayer from "./HotspotLayer";
import BurnPolygonLayer from "./BurnPolygonLayer";
import RouteLayer from "./RouteLayer";
import AOILayer from "./AOILayer";
import FireSpreadLayer from "./FireSpreadLayer";

// Import CSS via link tag to avoid Turbopack issues
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// Fix Leaflet default icons
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Base Layer konfiqurasiyaları
const BASE_LAYERS = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>'
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  }
};

/**
 * Map event handler component
 */
function MapEventHandler() {
  const { setMapCenter, setMapZoom } = useMapStore();
  
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      setMapCenter([center.lat, center.lng]);
    },
    zoomend: (e) => {
      setMapZoom(e.target.getZoom());
    }
  });

  return null;
}

/**
 * Map bounds updater - AOI seçildikdə zoom
 */
function BoundsUpdater() {
  const map = useMap();
  const { aoiBounds } = useMapStore();

  useEffect(() => {
    if (aoiBounds) {
      map.fitBounds(aoiBounds, { padding: [50, 50] });
    }
  }, [aoiBounds, map]);

  return null;
}

/**
 * MapView Component
 * Main Leaflet map view
 */
export default function MapView() {
  const { 
    mapCenter, 
    mapZoom, 
    baseLayer,
    visibleLayers 
  } = useMapStore();

  const currentBaseLayer = BASE_LAYERS[baseLayer] || BASE_LAYERS.osm;

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      zoomControl={false}
      className="w-full h-full z-0"
      style={{ background: "#1a1a2e" }}
    >
      {/* Base Layer */}
      <TileLayer
        url={currentBaseLayer.url}
        attribution={currentBaseLayer.attribution}
      />

      {/* Zoom Controls */}
      <ZoomControl position="bottomright" />

      {/* Drawing Controls */}
      <DrawControls />

      {/* AOI Layer */}
      <AOILayer />

      {/* Data Layers */}
      {visibleLayers.hotspots && <HotspotLayer />}
      {visibleLayers.burnPolygons && <BurnPolygonLayer />}
      {visibleLayers.fireSpread && <FireSpreadLayer />}
      {visibleLayers.route && <RouteLayer />}

      {/* Event Handlers */}
      <MapEventHandler />
      <BoundsUpdater />
    </MapContainer>
  );
}
