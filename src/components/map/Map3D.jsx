"use client";

import { useState, useMemo, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore";

/**
 * Map3D Component
 * 3D visualization with deck.gl for fire monitoring
 */
export default function Map3D({ className = "" }) {
  const { 
    hotspots, 
    burnPolygons, 
    mapCenter,
    mapZoom 
  } = useMapStore();

  const [isLoaded, setIsLoaded] = useState(false);
  const [DeckGL, setDeckGL] = useState(null);
  const [GeoJsonLayer, setGeoJsonLayer] = useState(null);
  const [MapComponent, setMapComponent] = useState(null);

  const [viewState, setViewState] = useState({
    longitude: mapCenter[1],
    latitude: mapCenter[0],
    zoom: mapZoom,
    pitch: 45,
    bearing: 0
  });

  // Load deck.gl and maplibre dynamically
  useEffect(() => {
    let isMounted = true;

    const loadDependencies = async () => {
      try {
        // Load CSS
        if (!document.querySelector('link[href*="maplibre-gl.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
          document.head.appendChild(link);
        }

        // Load modules
        const [deckReact, deckLayers, mapgl] = await Promise.all([
          import("@deck.gl/react"),
          import("@deck.gl/layers"),
          import("react-map-gl/maplibre")
        ]);

        if (isMounted) {
          setDeckGL(() => deckReact.default || deckReact.DeckGL);
          setGeoJsonLayer(() => deckLayers.GeoJsonLayer);
          setMapComponent(() => mapgl.default || mapgl.Map);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load 3D dependencies:", err);
      }
    };

    loadDependencies();

    return () => {
      isMounted = false;
    };
  }, []);

  // Create layers
  const layers = useMemo(() => {
    if (!GeoJsonLayer) return [];
    
    const result = [];

    // Hotspots layer
    if (hotspots?.features?.length > 0) {
      result.push(
        new GeoJsonLayer({
          id: "hotspots-layer",
          data: hotspots,
          filled: true,
          stroked: true,
          pointType: "circle",
          getPointRadius: f => Math.max(100, ((f.properties?.brightness || 300) - 300) * 10),
          getFillColor: f => {
            const conf = f.properties?.confidence;
            if (conf === "high" || conf === "h") return [255, 0, 0, 200];
            if (conf === "nominal" || conf === "n") return [255, 140, 0, 180];
            return [255, 220, 0, 160];
          },
          getLineColor: [255, 255, 255, 150],
          lineWidthMinPixels: 1,
          pointRadiusMinPixels: 5,
          pointRadiusMaxPixels: 30,
          pickable: true
        })
      );
    }

    // Burn polygons layer
    if (burnPolygons?.features?.length > 0) {
      result.push(
        new GeoJsonLayer({
          id: "burn-polygons-layer",
          data: burnPolygons,
          filled: true,
          stroked: true,
          extruded: true,
          wireframe: true,
          getElevation: f => (f.properties?.area_ha || 5) * 50,
          getFillColor: f => {
            const conf = f.properties?.confidence;
            if (conf === "HIGH") return [180, 0, 0, 180];
            if (conf === "MEDIUM") return [220, 80, 0, 160];
            return [240, 140, 0, 140];
          },
          getLineColor: [100, 0, 0, 255],
          lineWidthMinPixels: 2,
          pickable: true
        })
      );
    }

    return result;
  }, [hotspots, burnPolygons, GeoJsonLayer]);

  // Tooltip
  const getTooltip = ({ object }) => {
    if (!object) return null;
    const props = object.properties || {};
    
    if (props.brightness) {
      return {
        html: `<div style="padding:8px;background:rgba(0,0,0,0.85);color:white;border-radius:4px;font-size:12px;">
          <strong>🔥 Fire Hotspot</strong><br/>
          Brightness: ${props.brightness}K<br/>
          Confidence: ${props.confidence || "N/A"}<br/>
          FRP: ${props.frp || "N/A"} MW
        </div>`
      };
    }
    
    if (props.area_ha !== undefined) {
      return {
        html: `<div style="padding:8px;background:rgba(0,0,0,0.85);color:white;border-radius:4px;font-size:12px;">
          <strong>🟥 Burn Area</strong><br/>
          Area: ${props.area_ha?.toFixed(2) || 0} ha<br/>
          Confidence: ${props.confidence || "N/A"}
        </div>`
      };
    }
    
    return null;
  };

  // Loading state
  if (!isLoaded || !DeckGL || !MapComponent) {
    return (
      <div className={`relative w-full h-full bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading 3D Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs)}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        glOptions={{
          preserveDrawingBuffer: true,
          depth: true
        }}
      >
        <MapComponent
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          attributionControl={false}
          onLoad={(e) => {
            const map = e.target;
            
            // OpenFreeMap uses OpenMapTiles schema with 'openmaptiles' source
            if (!map.getLayer('3d-buildings')) {
              // Find the first label layer to insert buildings below text
              const layers = map.getStyle().layers;
              const labelLayerId = layers.find(
                (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
              )?.id;

              try {
                // 3D Buildings
                map.addLayer(
                  {
                    'id': '3d-buildings',
                    'source': 'openmaptiles',
                    'source-layer': 'building',
                    'type': 'fill-extrusion',
                    'minzoom': 14,
                    'paint': {
                      'fill-extrusion-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'render_height'],
                        0, '#1a1a2e',
                        50, '#2d2d44',
                        100, '#3d3d5c',
                        200, '#4d4d6a'
                      ],
                      'fill-extrusion-height': [
                        'coalesce',
                        ['get', 'render_height'],
                        ['get', 'height'],
                        10
                      ],
                      'fill-extrusion-base': [
                        'coalesce',
                        ['get', 'render_min_height'],
                        ['get', 'min_height'],
                        0
                      ],
                      'fill-extrusion-opacity': 0.8
                    }
                  },
                  labelLayerId
                );

                // 3D Trees/Forest (parks, woods, forest areas)
                map.addLayer(
                  {
                    'id': '3d-trees',
                    'source': 'openmaptiles',
                    'source-layer': 'landcover',
                    'filter': ['in', 'class', 'wood', 'forest', 'grass', 'park'],
                    'type': 'fill-extrusion',
                    'minzoom': 14,
                    'paint': {
                      'fill-extrusion-color': [
                        'match',
                        ['get', 'class'],
                        'wood', '#1a3d1a',
                        'forest', '#1a4d1a',
                        'park', '#2d5a2d',
                        'grass', '#3d6b3d',
                        '#2d5a2d'
                      ],
                      'fill-extrusion-height': [
                        'match',
                        ['get', 'class'],
                        'wood', 15,
                        'forest', 20,
                        'park', 8,
                        'grass', 2,
                        10
                      ],
                      'fill-extrusion-base': 0,
                      'fill-extrusion-opacity': 0.7
                    }
                  },
                  '3d-buildings' // Insert below buildings
                );

                // Additional landuse layer for parks
                map.addLayer(
                  {
                    'id': '3d-parks',
                    'source': 'openmaptiles',
                    'source-layer': 'landuse',
                    'filter': ['in', 'class', 'park', 'cemetery', 'pitch'],
                    'type': 'fill-extrusion',
                    'minzoom': 14,
                    'paint': {
                      'fill-extrusion-color': '#2d5a2d',
                      'fill-extrusion-height': 5,
                      'fill-extrusion-base': 0,
                      'fill-extrusion-opacity': 0.5
                    }
                  },
                  '3d-trees'
                );

              } catch (err) {
                console.warn('Could not add 3D layers:', err.message);
              }
            }
          }}
        />
      </DeckGL>

      {/* 3D Controls */}
      <div className="absolute bottom-4 left-4 bg-black/80 rounded-lg p-3 text-white text-xs space-y-1 backdrop-blur-sm pointer-events-none">
        <p className="font-semibold mb-2 text-orange-400">3D Controls</p>
        <p>🖱️ Left Drag: Rotate</p>
        <p>⌨️ Right Drag: Pan</p>
        <p>🔄 Scroll: Zoom</p>
        <p>📐 Ctrl+Drag: Pitch</p>
      </div>

      {/* Legend */}
      <div className="absolute top-16 right-4 bg-black/80 rounded-lg p-3 text-white text-xs backdrop-blur-sm pointer-events-none">
        <p className="font-semibold mb-2 text-orange-400">Legend</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>High Confidence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Nominal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span>Low Confidence</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-600">
            <div className="w-3 h-3 bg-red-800" />
            <span>Burn Polygon</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-16 left-4 bg-black/80 rounded-lg p-4 text-white backdrop-blur-sm pointer-events-none">
        <p className="text-xs font-semibold mb-2 text-orange-400">3D Fire Visualization</p>
        <div className="flex gap-6">
          <div>
            <p className="text-3xl font-bold text-orange-500">
              {hotspots?.features?.length || 0}
            </p>
            <p className="text-xs text-gray-400">Hotspots</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-purple-500">
              {burnPolygons?.features?.length || 0}
            </p>
            <p className="text-xs text-gray-400">Burn Areas</p>
          </div>
        </div>
      </div>

      {/* View Info */}
      <div className="absolute bottom-4 right-4 bg-black/60 rounded px-2 py-1 text-white text-xs pointer-events-none">
        Pitch: {viewState.pitch?.toFixed(0)}° | Bearing: {viewState.bearing?.toFixed(0)}°
      </div>
    </div>
  );
}
