"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapStore } from "@/store/useMapStore";

/**
 * FireSpreadLayer Component
 * Yanğın yayılma proqnozunu xəritədə göstərir
 */
export default function FireSpreadLayer() {
  const map = useMap();
  const { fireSpreadPrediction, visibleLayers, windData } = useMapStore();
  const layerRef = useRef(null);
  const arrowLayerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Əvvəlki layerləri sil
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (arrowLayerRef.current) {
      map.removeLayer(arrowLayerRef.current);
      arrowLayerRef.current = null;
    }

    // Görünürlük yoxla
    if (!visibleLayers.fireSpread || !fireSpreadPrediction?.features?.length) {
      return;
    }

    // Polygon layeri
    const polygonFeatures = fireSpreadPrediction.features.filter(
      f => f.geometry.type === "Polygon"
    );

    if (polygonFeatures.length > 0) {
      const polygonLayer = L.geoJSON(
        { type: "FeatureCollection", features: polygonFeatures },
        {
          style: (feature) => {
            const hours = feature.properties?.hours || 6;
            let color = "#ffcc00";
            let opacity = 0.3;

            if (hours <= 1) {
              color = "#ff0000";
              opacity = 0.5;
            } else if (hours <= 3) {
              color = "#ff4444";
              opacity = 0.4;
            } else if (hours <= 6) {
              color = "#ff8800";
              opacity = 0.35;
            } else if (hours <= 12) {
              color = "#ffaa00";
              opacity = 0.25;
            }

            return {
              fillColor: color,
              fillOpacity: opacity,
              color: color,
              weight: 1,
              opacity: 0.6
            };
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;
            layer.bindPopup(`
              <div class="text-sm">
                <p class="font-bold text-orange-600">Fire Spread Zone</p>
                <p><strong>Time:</strong> ${props.hours}h ahead</p>
                <p><strong>Spread Rate:</strong> ${props.spreadRate} m/h</p>
                <p><strong>Distance:</strong> ${props.distance}m</p>
              </div>
            `);
          }
        }
      );

      polygonLayer.addTo(map);
      layerRef.current = polygonLayer;
    }

    // Arrow layeri (yayılma istiqaməti)
    const arrowFeatures = fireSpreadPrediction.features.filter(
      f => f.geometry.type === "LineString" && f.properties?.type === "arrow"
    );

    if (arrowFeatures.length > 0) {
      const arrowLayer = L.geoJSON(
        { type: "FeatureCollection", features: arrowFeatures },
        {
          style: {
            color: "#ff0000",
            weight: 3,
            opacity: 0.8,
            dashArray: "5, 10"
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;
            
            // Arrow head əlavə et
            const coords = feature.geometry.coordinates;
            if (coords.length >= 2) {
              const end = coords[coords.length - 1];
              const prev = coords[coords.length - 2];
              
              // Angle hesabla
              const angle = Math.atan2(
                end[1] - prev[1],
                end[0] - prev[0]
              ) * (180 / Math.PI);

              // Arrow marker
              const arrowIcon = L.divIcon({
                className: "fire-spread-arrow",
                html: `<div style="
                  transform: rotate(${angle - 90}deg);
                  color: #ff0000;
                  font-size: 20px;
                  font-weight: bold;
                ">▲</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              });

              L.marker([end[1], end[0]], { icon: arrowIcon }).addTo(map);
            }

            layer.bindPopup(`
              <div class="text-sm">
                <p class="font-bold text-red-600">Spread Direction</p>
                <p><strong>Direction:</strong> ${Math.round(props.spreadDirection)}°</p>
                <p><strong>Rate:</strong> ${props.spreadRate} m/h</p>
              </div>
            `);
          }
        }
      );

      arrowLayer.addTo(map);
      arrowLayerRef.current = arrowLayer;
    }

    // Wind direction indicator (map corner)
    if (windData) {
      // Bu hissəni MapToolbar-da göstərəcəyik
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
      if (arrowLayerRef.current) {
        map.removeLayer(arrowLayerRef.current);
      }
    };
  }, [map, fireSpreadPrediction, visibleLayers.fireSpread, windData]);

  return null;
}
