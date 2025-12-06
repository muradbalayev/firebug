"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Azerbaijan sərhədləri (simplified)
const AZERBAIJAN_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Azerbaijan" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [44.77, 39.71], [45.00, 39.74], [45.38, 40.00], [45.56, 40.81],
          [45.18, 40.99], [44.97, 41.25], [45.22, 41.41], [45.96, 41.12],
          [46.50, 41.06], [46.64, 41.18], [46.15, 41.72], [46.40, 41.86],
          [46.69, 41.83], [47.37, 41.22], [47.82, 41.15], [47.99, 41.41],
          [48.58, 41.81], [49.11, 41.28], [49.62, 40.57], [50.08, 40.53],
          [50.39, 40.26], [49.57, 40.18], [49.40, 39.40], [49.22, 39.05],
          [48.86, 38.82], [48.88, 38.32], [48.63, 38.27], [48.01, 38.79],
          [47.37, 39.42], [46.51, 38.77], [46.14, 38.74], [45.46, 38.87],
          [44.95, 39.34], [44.77, 39.71]
        ]]
      }
    },
    // Naxçıvan
    {
      type: "Feature",
      properties: { name: "Nakhchivan" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [44.77, 39.71], [44.95, 39.34], [45.46, 38.87], [46.14, 38.74],
          [45.74, 39.32], [45.74, 39.47], [45.30, 39.47], [45.00, 39.74],
          [44.77, 39.71]
        ]]
      }
    }
  ]
};

// Component to handle map view changes
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  
  return null;
}

// Get color based on fire radiative power
function getFireColor(frp) {
  if (frp > 50) return "#ef4444"; // red - high
  if (frp > 20) return "#f97316"; // orange - medium
  return "#eab308"; // yellow - low
}

// Get size based on fire radiative power
function getFireSize(frp) {
  if (frp > 50) return 12;
  if (frp > 20) return 9;
  return 6;
}

export default function MonitoringMap({ country, hotspots, windData }) {
  const mapRef = useRef(null);

  // Calculate arrow endpoint based on wind direction
  const getWindArrow = (lat, lon, direction, length = 0.5) => {
    // Wind direction is where wind comes FROM, fire spreads in opposite direction
    const spreadDirection = (direction + 180) % 360;
    const radians = (spreadDirection * Math.PI) / 180;
    
    const endLat = lat + length * Math.cos(radians);
    const endLon = lon + length * Math.sin(radians);
    
    return [[lat, lon], [endLat, endLon]];
  };

  // Border style
  const borderStyle = {
    color: "#00ff88",
    weight: 3,
    opacity: 1,
    fillColor: "#00ff88",
    fillOpacity: 0.05,
    dashArray: "5, 5"
  };

  return (
    <MapContainer
      ref={mapRef}
      center={country?.center ? [country.center[1], country.center[0]] : [40.4, 47.5]}
      zoom={country?.zoom || 7}
      className="w-full h-full"
      style={{ background: "#143d17" }}
    >
      <MapController 
        center={country?.center ? [country.center[1], country.center[0]] : null}
        zoom={country?.zoom || 7}
      />

      {/* Satellite tile layer */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='&copy; Esri, Maxar, Earthstar Geographics'
      />

      {/* Labels overlay */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
        attribution=''
      />

      {/* Azerbaijan Border */}
      <GeoJSON 
        data={AZERBAIJAN_GEOJSON}
        style={borderStyle}
      />

      {/* Hotspots */}
      {hotspots.map((hotspot, index) => {
        const coords = hotspot.geometry?.coordinates;
        if (!coords) return null;
        
        const [lon, lat] = coords;
        const frp = hotspot.properties?.frp || 0;
        const brightness = hotspot.properties?.bright_ti4 || hotspot.properties?.brightness || 0;
        const acqTime = hotspot.properties?.acq_time || "";
        const acqDate = hotspot.properties?.acq_date || "";

        return (
          <CircleMarker
            key={`hotspot-${index}`}
            center={[lat, lon]}
            radius={getFireSize(frp)}
            fillColor={getFireColor(frp)}
            fillOpacity={0.8}
            color="#fff"
            weight={2}
            className="animate-pulse"
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-bold text-red-600 mb-2">🔥 Active Fire</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>FRP:</strong> {frp.toFixed(1)} MW</p>
                  <p><strong>Brightness:</strong> {brightness.toFixed(1)} K</p>
                  <p><strong>Location:</strong> {lat.toFixed(4)}, {lon.toFixed(4)}</p>
                  <p><strong>Time:</strong> {acqDate} {acqTime}</p>
                  {windData && (
                    <p className="text-orange-600">
                      <strong>Spreading:</strong> {getSpreadDirectionText(windData.direction)}
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Wind direction arrows for high-risk fires */}
      {windData && hotspots
        .filter(h => (h.properties?.frp || 0) > 30)
        .slice(0, 20) // Limit arrows
        .map((hotspot, index) => {
          const coords = hotspot.geometry?.coordinates;
          if (!coords) return null;
          
          const [lon, lat] = coords;
          const arrow = getWindArrow(lat, lon, windData.direction, 0.15);

          return (
            <Polyline
              key={`arrow-${index}`}
              positions={arrow}
              color="#ef4444"
              weight={3}
              opacity={0.8}
              dashArray="5, 5"
            />
          );
        })}
    </MapContainer>
  );
}

// Helper function for spread direction text
function getSpreadDirectionText(windDirection) {
  const spreadDir = (windDirection + 180) % 360;
  
  if (spreadDir >= 337.5 || spreadDir < 22.5) return "North ↑";
  if (spreadDir >= 22.5 && spreadDir < 67.5) return "Northeast ↗";
  if (spreadDir >= 67.5 && spreadDir < 112.5) return "East →";
  if (spreadDir >= 112.5 && spreadDir < 157.5) return "Southeast ↘";
  if (spreadDir >= 157.5 && spreadDir < 202.5) return "South ↓";
  if (spreadDir >= 202.5 && spreadDir < 247.5) return "Southwest ↙";
  if (spreadDir >= 247.5 && spreadDir < 292.5) return "West ←";
  if (spreadDir >= 292.5 && spreadDir < 337.5) return "Northwest ↖";
  return "Unknown";
}
