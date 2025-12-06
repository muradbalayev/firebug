"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapStore } from "@/store/useMapStore";

// Professional arrow SVG
const createArrowSVG = (angle, size = 32) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform: rotate(${angle}deg);">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path 
      d="M12 2L4 14h5v8h6v-8h5L12 2z" 
      fill="#dc2626" 
      stroke="#fff" 
      stroke-width="1.5"
      filter="url(#shadow)"
    />
  </svg>
`;

// Animated pulsing circle for hotspot origin
const createPulsingDot = () => `
  <div style="position: relative; width: 20px; height: 20px;">
    <div style="
      position: absolute;
      width: 20px;
      height: 20px;
      background: #dc2626;
      border-radius: 50%;
      animation: pulse 1.5s ease-out infinite;
    "></div>
    <div style="
      position: absolute;
      top: 5px;
      left: 5px;
      width: 10px;
      height: 10px;
      background: #fff;
      border-radius: 50%;
      border: 2px solid #dc2626;
    "></div>
  </div>
  <style>
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }
  </style>
`;

/**
 * FireSpreadLayer Component
 * Yanğın yayılma proqnozunu xəritədə göstərir - professional oxlar və animasiyalar
 */
export default function FireSpreadLayer() {
  const map = useMap();
  const { fireSpreadPrediction, visibleLayers, windData } = useMapStore();
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Əvvəlki layerləri sil
    if (layerGroupRef.current) {
      if (layerGroupRef.current._windIndicator) {
        map.removeControl(layerGroupRef.current._windIndicator);
      }
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }

    // Görünürlük yoxla
    if (!visibleLayers.fireSpread || !fireSpreadPrediction?.features?.length) {
      return;
    }

    const layerGroup = L.layerGroup();
    const metadata = fireSpreadPrediction.metadata;

    // 1. Yayılma zonaları (gradient polygons)
    const polygonFeatures = fireSpreadPrediction.features.filter(
      f => f.geometry.type === "Polygon"
    );

    polygonFeatures.forEach(feature => {
      const hours = feature.properties?.hours || 6;
      let color, fillOpacity, weight;

      if (hours <= 1) {
        color = "#ef4444"; fillOpacity = 0.4; weight = 3;
      } else if (hours <= 3) {
        color = "#f97316"; fillOpacity = 0.3; weight = 2;
      } else if (hours <= 6) {
        color = "#eab308"; fillOpacity = 0.25; weight = 2;
      } else {
        color = "#fbbf24"; fillOpacity = 0.15; weight = 1;
      }

      const polygon = L.geoJSON(feature, {
        style: {
          fillColor: color,
          fillOpacity,
          color,
          weight,
          opacity: 0.8,
          dashArray: hours > 6 ? "5, 5" : null
        }
      });

      polygon.bindPopup(`
        <div style="font-family: system-ui; font-size: 13px; min-width: 180px;">
          <div style="font-weight: 600; color: #dc2626; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 16px;">🔥</span> Fire Spread Zone
          </div>
          <div style="display: grid; gap: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Time:</span>
              <strong>${feature.properties.hours}h ahead</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Spread Rate:</span>
              <strong>${feature.properties.spreadRate} m/h</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Distance:</span>
              <strong>${(feature.properties.distance / 1000).toFixed(1)} km</strong>
            </div>
          </div>
        </div>
      `);

      layerGroup.addLayer(polygon);
    });

    // 2. Professional ox xətləri - hər hotspot üçün yayılma istiqaməti
    const arrowFeatures = fireSpreadPrediction.features.filter(
      f => f.geometry.type === "LineString" && f.properties?.type === "arrow"
    );

    console.log(`Drawing ${arrowFeatures.length} spread arrows`);

    arrowFeatures.forEach((feature, index) => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;
      const start = coords[0];
      const end = coords[coords.length - 1];

      // Ağ border xətt (daha qalın)
      const borderLine = L.polyline(
        coords.map(c => [c[1], c[0]]),
        {
          color: "#ffffff",
          weight: 6,
          opacity: 0.8,
          lineCap: "round"
        }
      );
      layerGroup.addLayer(borderLine);

      // Əsas qırmızı xətt
      const mainLine = L.polyline(
        coords.map(c => [c[1], c[0]]),
        {
          color: "#dc2626",
          weight: 4,
          opacity: 1,
          lineCap: "round",
          lineJoin: "round"
        }
      );

      mainLine.bindPopup(`
        <div style="font-family: system-ui; font-size: 13px; min-width: 160px;">
          <div style="font-weight: 600; color: #dc2626; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 16px;">🔥</span> Fire Spread Direction
          </div>
          <div style="display: grid; gap: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Direction:</span>
              <strong>${Math.round(props.spreadDirection)}°</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Speed:</span>
              <strong>${props.spreadRate} m/h</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Distance:</span>
              <strong>${(props.arrowLength / 1000).toFixed(1)} km</strong>
            </div>
          </div>
        </div>
      `);
      layerGroup.addLayer(mainLine);

      // Ox başı - böyük və aydın
      if (coords.length >= 2) {
        const prev = coords[0]; // start point
        const angle = Math.atan2(end[0] - prev[0], end[1] - prev[1]) * (180 / Math.PI);

        const arrowIcon = L.divIcon({
          className: "fire-arrow-head",
          html: createArrowSVG(angle, 32),
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const arrowMarker = L.marker([end[1], end[0]], {
          icon: arrowIcon,
          interactive: false,
          zIndexOffset: 1000
        });
        layerGroup.addLayer(arrowMarker);
      }

      // Başlanğıc nöqtəsi marker (hər 5-ci hotspot üçün)
      if (index % 5 === 0) {
        const startIcon = L.divIcon({
          className: "fire-start-point",
          html: `<div style="
            width: 12px;
            height: 12px;
            background: #dc2626;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const startMarker = L.marker([start[1], start[0]], {
          icon: startIcon,
          interactive: false
        });
        layerGroup.addLayer(startMarker);
      }
    });

    // 3. Wind indicator panel
    if (metadata?.windData) {
      const windIndicator = L.control({ position: "topleft" });
      windIndicator.onAdd = function() {
        const div = L.DomUtil.create("div", "wind-indicator-panel");
        div.innerHTML = `
          <div style="
            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: system-ui;
            font-size: 12px;
            margin-top: 80px;
            min-width: 160px;
          ">
            <div style="font-weight: 600; margin-bottom: 10px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">🌬️</span> Wind Conditions
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
              <div style="
                width: 40px;
                height: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <span style="
                  font-size: 24px;
                  transform: rotate(${metadata.windData.windDirection}deg);
                  display: inline-block;
                ">⬇️</span>
              </div>
              <div>
                <div style="font-size: 20px; font-weight: 700;">${Math.round(metadata.windData.windSpeed)} <span style="font-size: 12px; font-weight: 400;">km/h</span></div>
                <div style="color: #94a3b8; font-size: 11px;">from ${Math.round(metadata.windData.windDirection)}°</div>
              </div>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: #f87171; display: flex; align-items: center; gap: 4px;">
                  <span>🔥</span> Fire Spread
                </span>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="
                    font-size: 18px;
                    transform: rotate(${metadata.spreadDirection - 90}deg);
                    display: inline-block;
                  ">➡️</span>
                  <strong>${Math.round(metadata.spreadDirection)}°</strong>
                </div>
              </div>
            </div>

            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
              <div style="display: flex; gap: 8px; font-size: 10px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <div style="width: 12px; height: 12px; background: #ef4444; border-radius: 2px;"></div>
                  <span>1-3h</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <div style="width: 12px; height: 12px; background: #f97316; border-radius: 2px;"></div>
                  <span>3-6h</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <div style="width: 12px; height: 12px; background: #eab308; border-radius: 2px;"></div>
                  <span>6h+</span>
                </div>
              </div>
            </div>
          </div>
        `;
        return div;
      };
      windIndicator.addTo(map);
      layerGroup._windIndicator = windIndicator;
    }

    layerGroup.addTo(map);
    layerGroupRef.current = layerGroup;

    return () => {
      if (layerGroupRef.current) {
        if (layerGroupRef.current._windIndicator) {
          map.removeControl(layerGroupRef.current._windIndicator);
        }
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, fireSpreadPrediction, visibleLayers.fireSpread, windData]);

  return null;
}
