"use client";

import { GeoJSON, Popup, useMap } from "react-leaflet";
import { useMapStore } from "@/store/useMapStore";
import { getConfidenceColor } from "@/lib/utils";

/**
 * BurnPolygonLayer Component
 * Yanmış ərazilərin polygon-larını göstərir
 */
export default function BurnPolygonLayer() {
  const { burnPolygons, setSelectedBurnPolygon } = useMapStore();
  const map = useMap();

  if (!burnPolygons?.features?.length) return null;

  // Style function - hər polygon üçün confidence-ə görə rəng
  const getStyle = (feature) => {
    const confidence = feature.properties?.confidence || "LOW";
    const color = getConfidenceColor(confidence);
    
    return {
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.4,
      dashArray: confidence === "LOW" ? "5, 5" : null
    };
  };

  // Click handler
  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    
    layer.on({
      click: () => {
        setSelectedBurnPolygon(feature);
      },
      mouseover: (e) => {
        e.target.setStyle({
          fillOpacity: 0.6,
          weight: 3
        });
      },
      mouseout: (e) => {
        e.target.setStyle(getStyle(feature));
      }
    });

    // Popup content
    const popupContent = `
      <div class="min-w-[220px]">
        <h4 class="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <span class="w-3 h-3 rounded" style="background-color: ${getConfidenceColor(props.confidence)}"></span>
          Yanmış Ərazi
        </h4>
        <div class="space-y-1.5 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Sahə:</span>
            <span class="font-semibold">${(props.area_ha || 0).toFixed(2)} ha</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Confidence:</span>
            <span class="px-2 py-0.5 rounded text-xs font-medium text-white" 
                  style="background-color: ${getConfidenceColor(props.confidence)}">
              ${props.confidence || "N/A"}
            </span>
          </div>
          ${props.hotspotCount !== undefined ? `
          <div class="flex justify-between">
            <span class="text-gray-500">Hotspot sayı:</span>
            <span>${props.hotspotCount}</span>
          </div>
          ` : ""}
          ${props.date ? `
          <div class="flex justify-between">
            <span class="text-gray-500">Tarix:</span>
            <span>${props.date}</span>
          </div>
          ` : ""}
          ${props.dnbr_mean ? `
          <div class="flex justify-between">
            <span class="text-gray-500">dNBR (orta):</span>
            <span>${props.dnbr_mean.toFixed(3)}</span>
          </div>
          ` : ""}
        </div>
      </div>
    `;
    
    layer.bindPopup(popupContent);
  };

  return (
    <GeoJSON
      key={JSON.stringify(burnPolygons)}
      data={burnPolygons}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  );
}
