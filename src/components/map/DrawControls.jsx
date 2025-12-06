"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useMapStore } from "@/store/useMapStore";
import L from "leaflet";
import "leaflet-draw";

/**
 * DrawControls Component
 * AOI (Area of Interest) çəkmək üçün Leaflet Draw plugin
 */
export default function DrawControls() {
  const map = useMap();
  const { setAOI, aoi } = useMapStore();
  const drawnItemsRef = useRef(null);
  const drawControlRef = useRef(null);

  useEffect(() => {
    if (!map || !L) return;

    // Feature group yaratmaq
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Draw control konfiqurasiyası
    const drawControl = new L.Control.Draw({
      position: "topleft",
      draw: {
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polygon: {
          allowIntersection: false,
          drawError: {
            color: "#e74c3c",
            message: "<strong>Xəta:</strong> Kəsişən xətt çəkə bilməzsiniz!"
          },
          shapeOptions: {
            color: "#f97316",
            fillColor: "#f97316",
            fillOpacity: 0.2,
            weight: 2
          }
        },
        rectangle: {
          shapeOptions: {
            color: "#f97316",
            fillColor: "#f97316",
            fillOpacity: 0.2,
            weight: 2
          }
        }
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
        edit: true
      }
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Draw event handlers
    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      
      // Əvvəlki layer-ləri sil
      drawnItems.clearLayers();
      
      // Yeni layer əlavə et
      drawnItems.addLayer(layer);

      // GeoJSON formatına çevir və store-a göndər
      const geojson = layer.toGeoJSON();
      setAOI(geojson);
    });

    map.on(L.Draw.Event.EDITED, (e) => {
      const layers = e.layers;
      layers.eachLayer((layer) => {
        const geojson = layer.toGeoJSON();
        setAOI(geojson);
      });
    });

    map.on(L.Draw.Event.DELETED, (e) => {
      if (drawnItems.getLayers().length === 0) {
        setAOI(null);
      }
    });

    // Cleanup
    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.EDITED);
      map.off(L.Draw.Event.DELETED);
    };
  }, [map, setAOI]);

  // Mövcud AOI varsa, xəritədə göstər
  useEffect(() => {
    if (!drawnItemsRef.current || !aoi) return;

    drawnItemsRef.current.clearLayers();
    
    const geoJsonLayer = L.geoJSON(aoi, {
      style: {
        color: "#f97316",
        fillColor: "#f97316",
        fillOpacity: 0.2,
        weight: 2
      }
    });

    geoJsonLayer.eachLayer((layer) => {
      drawnItemsRef.current.addLayer(layer);
    });
  }, [aoi]);

  return null;
}
