"use client";

import { useEffect, useRef, useState } from "react";
import { CircleMarker, Popup, useMap, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import { useMapStore } from "@/store/useMapStore";
import { getConfidenceColor } from "@/lib/utils";

/**
 * HotspotLayer Component
 * FIRMS hotspot nöqtələrini xəritədə göstərir
 * Click edəndə yayılma istiqamətini arrow ilə göstərir
 */
export default function HotspotLayer() {
  const { hotspots, hotspotFilters, windData } = useMapStore();
  const map = useMap();
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [spreadArrow, setSpreadArrow] = useState(null);

  // Yayılma istiqamətini hesabla
  const calculateSpreadDirection = (windDirection) => {
    return (windDirection + 180) % 360;
  };

  // Hotspot click handler - yayılma oxunu göstər
  const handleHotspotClick = (feature, lat, lng) => {
    setSelectedHotspot({ lat, lng, feature });
    
    if (windData) {
      const spreadDir = calculateSpreadDirection(windData.windDirection);
      const spreadRadians = (spreadDir * Math.PI) / 180;
      
      // 2km uzunluğunda ox
      const distance = 0.02; // ~2km in degrees
      const endLat = lat + distance * Math.cos(spreadRadians);
      const endLng = lng + distance * Math.sin(spreadRadians);
      
      setSpreadArrow({
        start: [lat, lng],
        end: [endLat, endLng],
        direction: spreadDir
      });
    }
  };

  if (!hotspots?.features?.length) return null;

  // Filter hotspots by confidence
  const filteredHotspots = hotspots.features.filter(feature => {
    const conf = feature.properties?.confidence?.toLowerCase();
    const minConf = hotspotFilters.minConfidence;
    
    if (minConf === "high") return conf === "high";
    if (minConf === "nominal") return conf === "high" || conf === "nominal";
    return true;
  });

  // Arrow icon for spread direction
  const createArrowIcon = (angle) => L.divIcon({
    className: "spread-arrow-icon",
    html: `
      <div style="
        transform: rotate(${angle}deg);
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 14h5v8h6v-8h5L12 2z" fill="#dc2626" stroke="#fff" stroke-width="2"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  return (
    <>
      {/* Hotspot markers */}
      {filteredHotspots.map((feature, index) => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        const color = getConfidenceColor(props.confidence);
        const brightness = props.brightness || 300;
        const radius = Math.min(12, Math.max(4, (brightness - 250) / 25));

        return (
          <CircleMarker
            key={`hotspot-${index}-${lat}-${lng}`}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.7,
              weight: 2
            }}
            eventHandlers={{
              click: () => handleHotspotClick(feature, lat, lng)
            }}
          >
            <Popup>
              <div style={{ minWidth: "220px", fontFamily: "system-ui" }}>
                <h4 style={{ 
                  fontWeight: 600, 
                  marginBottom: "10px", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  color: "#111"
                }}>
                  <span style={{ 
                    width: "12px", 
                    height: "12px", 
                    borderRadius: "50%", 
                    backgroundColor: color 
                  }} />
                  🔥 Fire Hotspot
                </h4>
                
                <div style={{ fontSize: "13px", display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Location:</span>
                    <span style={{ fontFamily: "monospace" }}>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Brightness:</span>
                    <span style={{ fontWeight: 600 }}>{brightness.toFixed(1)} K</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Confidence:</span>
                    <span style={{ 
                      padding: "2px 8px", 
                      borderRadius: "4px", 
                      fontSize: "11px", 
                      fontWeight: 500, 
                      color: "white",
                      backgroundColor: color 
                    }}>
                      {props.confidence?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Date:</span>
                    <span>{props.acq_date}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Time:</span>
                    <span>{formatTime(props.acq_time)}</span>
                  </div>
                  {props.frp > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#666" }}>FRP:</span>
                      <span style={{ fontWeight: 600 }}>{props.frp.toFixed(1)} MW</span>
                    </div>
                  )}
                </div>

                {/* Spread Direction in Popup */}
                {windData && (
                  <div style={{ 
                    marginTop: "12px", 
                    paddingTop: "12px", 
                    borderTop: "1px solid #eee",
                    background: "#fef2f2",
                    margin: "12px -10px -10px -10px",
                    padding: "10px",
                    borderRadius: "0 0 4px 4px"
                  }}>
                    <div style={{ 
                      fontWeight: 600, 
                      color: "#dc2626", 
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      <span>🔥</span> Fire Spread Direction
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "50px",
                        height: "50px",
                        background: "#dc2626",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: `rotate(${calculateSpreadDirection(windData.windDirection)}deg)`
                      }}>
                        <span style={{ fontSize: "24px", color: "white" }}>⬆</span>
                      </div>
                      <div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#dc2626" }}>
                          {Math.round(calculateSpreadDirection(windData.windDirection))}°
                        </div>
                        <div style={{ fontSize: "11px", color: "#666" }}>
                          Wind: {Math.round(windData.windSpeed)} km/h
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {props.isDemo && (
                  <div style={{ 
                    marginTop: "8px", 
                    fontSize: "11px", 
                    color: "#d97706", 
                    background: "#fef3c7", 
                    padding: "4px 8px", 
                    borderRadius: "4px" 
                  }}>
                    ⚠️ Demo data
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Spread Arrow Line */}
      {spreadArrow && (
        <>
          {/* White border line */}
          <Polyline
            positions={[spreadArrow.start, spreadArrow.end]}
            pathOptions={{
              color: "#ffffff",
              weight: 8,
              opacity: 0.8
            }}
          />
          {/* Red main line */}
          <Polyline
            positions={[spreadArrow.start, spreadArrow.end]}
            pathOptions={{
              color: "#dc2626",
              weight: 5,
              opacity: 1
            }}
          />
          {/* Arrow head marker */}
          <Marker
            position={spreadArrow.end}
            icon={createArrowIcon(spreadArrow.direction)}
          />
        </>
      )}
    </>
  );
}

/**
 * HHMM formatını HH:MM formatına çevirmək
 */
function formatTime(time) {
  if (!time) return "--:--";
  const str = String(time).padStart(4, "0");
  return `${str.slice(0, 2)}:${str.slice(2, 4)}`;
}
