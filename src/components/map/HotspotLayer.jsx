"use client";

import { CircleMarker, Popup, useMap } from "react-leaflet";
import { useMapStore } from "@/store/useMapStore";
import { getBrightnessColor, getConfidenceColor, formatDate } from "@/lib/utils";

/**
 * HotspotLayer Component
 * FIRMS hotspot nöqtələrini xəritədə göstərir
 */
export default function HotspotLayer() {
  const { hotspots, hotspotFilters } = useMapStore();
  const map = useMap();

  if (!hotspots?.features?.length) return null;

  // Filter hotspots by confidence
  const filteredHotspots = hotspots.features.filter(feature => {
    const conf = feature.properties?.confidence?.toLowerCase();
    const minConf = hotspotFilters.minConfidence;
    
    if (minConf === "high") return conf === "high";
    if (minConf === "nominal") return conf === "high" || conf === "nominal";
    return true; // "low" - hamısını göstər
  });

  return (
    <>
      {filteredHotspots.map((feature, index) => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        const color = getConfidenceColor(props.confidence);
        const brightness = props.brightness || 300;
        
        // Radius: brightness-ə görə 4-12 px
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
          >
            <Popup>
              <div className="min-w-[200px]">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  Yanğın Hotspot
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Koordinat:</span>
                    <span className="font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Parlaqlıq:</span>
                    <span className="font-semibold">{brightness.toFixed(1)} K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Confidence:</span>
                    <span 
                      className="px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: color }}
                    >
                      {props.confidence?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tarix:</span>
                    <span>{props.acq_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Saat:</span>
                    <span>{formatTime(props.acq_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Peyk:</span>
                    <span>{props.satellite} / {props.instrument}</span>
                  </div>
                  {props.frp > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">FRP:</span>
                      <span>{props.frp.toFixed(1)} MW</span>
                    </div>
                  )}
                </div>
                {props.isDemo && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    ⚠️ Demo data
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
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
