/**
 * Map Store - Zustand ilə global state management
 * AOI, hotspots, burn polygons, routes və s. üçün
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

const initialState = {
  // AOI (Area of Interest)
  aoi: null, // GeoJSON Polygon/Rectangle
  aoiBounds: null, // [[south, west], [north, east]]
  
  // Map Settings
  mapCenter: [40.4093, 49.8671], // Bakı default
  mapZoom: 10,
  baseLayer: "osm", // osm, satellite, terrain
  
  // FIRMS Hotspots
  hotspots: null, // GeoJSON FeatureCollection
  hotspotsLoading: false,
  hotspotsError: null,
  hotspotFilters: {
    minConfidence: "low", // low, nominal, high
    dayRange: 2,
    source: "VIIRS_NOAA20_NRT"
  },
  
  // Sentinel Imagery
  preFireDate: null,
  postFireDate: null,
  preFireImage: null,
  postFireImage: null,
  sentinelLoading: false,
  
  // Burn Polygons
  burnPolygons: null, // GeoJSON FeatureCollection
  burnPolygonsLoading: false,
  selectedBurnPolygon: null,
  
  // Route Planning
  routeStart: null, // [lng, lat]
  routeEnd: null,
  currentRoute: null,
  routeLoading: false,
  routeProfile: "driving-car",
  
  // UI State
  activePanel: "hotspots", // hotspots, imagery, analysis, route, report
  showLayerControl: true,
  visibleLayers: {
    hotspots: true,
    burnPolygons: true,
    route: true,
    preFireImage: false,
    postFireImage: false
  },
  
  // Report Data
  reportData: null
};

export const useMapStore = create(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ============ AOI Actions ============
        setAOI: (geojson) => set({ 
          aoi: geojson,
          aoiBounds: geojson ? calculateBounds(geojson) : null
        }),
        
        clearAOI: () => set({ 
          aoi: null, 
          aoiBounds: null,
          hotspots: null,
          burnPolygons: null,
          preFireImage: null,
          postFireImage: null
        }),

        // ============ Map Actions ============
        setMapCenter: (center) => set({ mapCenter: center }),
        setMapZoom: (zoom) => set({ mapZoom: zoom }),
        setBaseLayer: (layer) => set({ baseLayer: layer }),
        
        // ============ Hotspot Actions ============
        setHotspots: (data) => set({ 
          hotspots: data, 
          hotspotsLoading: false, 
          hotspotsError: null 
        }),
        setHotspotsLoading: (loading) => set({ hotspotsLoading: loading }),
        setHotspotsError: (error) => set({ hotspotsError: error, hotspotsLoading: false }),
        setHotspotFilters: (filters) => set((state) => ({
          hotspotFilters: { ...state.hotspotFilters, ...filters }
        })),

        // ============ Sentinel Actions ============
        setPreFireDate: (date) => set({ preFireDate: date }),
        setPostFireDate: (date) => set({ postFireDate: date }),
        setPreFireImage: (image) => set({ preFireImage: image }),
        setPostFireImage: (image) => set({ postFireImage: image }),
        setSentinelLoading: (loading) => set({ sentinelLoading: loading }),
        setSentinelImages: ({ preImage, postImage }) => set({
          preFireImage: preImage,
          postFireImage: postImage,
          sentinelLoading: false
        }),

        // ============ Burn Polygon Actions ============
        setBurnPolygons: (data) => set({ 
          burnPolygons: data, 
          burnPolygonsLoading: false 
        }),
        setBurnPolygonsLoading: (loading) => set({ burnPolygonsLoading: loading }),
        setSelectedBurnPolygon: (polygon) => set({ selectedBurnPolygon: polygon }),
        
        // Add confidence to burn polygons based on hotspot intersection
        calculateBurnConfidence: () => {
          const { burnPolygons, hotspots } = get();
          if (!burnPolygons?.features || !hotspots?.features) return;

          const updatedFeatures = burnPolygons.features.map(polygon => {
            const intersectingHotspots = hotspots.features.filter(hotspot => {
              return isPointInPolygon(
                hotspot.geometry.coordinates,
                polygon.geometry.coordinates
              );
            });

            let confidence = "LOW";
            if (intersectingHotspots.length > 0) {
              const hasHighConfidence = intersectingHotspots.some(
                h => h.properties.confidence === "high"
              );
              confidence = hasHighConfidence ? "HIGH" : "MEDIUM";
            }

            return {
              ...polygon,
              properties: {
                ...polygon.properties,
                confidence,
                hotspotCount: intersectingHotspots.length
              }
            };
          });

          set({
            burnPolygons: {
              ...burnPolygons,
              features: updatedFeatures
            }
          });
        },

        // ============ Route Actions ============
        setRouteStart: (point) => set({ routeStart: point }),
        setRouteEnd: (point) => set({ routeEnd: point }),
        setCurrentRoute: (route) => set({ currentRoute: route, routeLoading: false }),
        setRouteLoading: (loading) => set({ routeLoading: loading }),
        setRouteProfile: (profile) => set({ routeProfile: profile }),
        clearRoute: () => set({ 
          routeStart: null, 
          routeEnd: null, 
          currentRoute: null 
        }),

        // ============ UI Actions ============
        setActivePanel: (panel) => set({ activePanel: panel }),
        toggleLayerControl: () => set((state) => ({ 
          showLayerControl: !state.showLayerControl 
        })),
        setLayerVisibility: (layer, visible) => set((state) => ({
          visibleLayers: { ...state.visibleLayers, [layer]: visible }
        })),
        toggleLayer: (layer) => set((state) => ({
          visibleLayers: { 
            ...state.visibleLayers, 
            [layer]: !state.visibleLayers[layer] 
          }
        })),

        // ============ Report Actions ============
        generateReportData: () => {
          const state = get();
          const reportData = {
            generatedAt: new Date().toISOString(),
            aoi: state.aoi,
            hotspots: {
              total: state.hotspots?.features?.length || 0,
              data: state.hotspots
            },
            burnArea: {
              totalHectares: calculateTotalBurnArea(state.burnPolygons),
              polygonCount: state.burnPolygons?.features?.length || 0,
              data: state.burnPolygons
            },
            confidenceSummary: calculateConfidenceSummary(state.burnPolygons),
            dateRange: {
              preFireDate: state.preFireDate,
              postFireDate: state.postFireDate
            }
          };
          set({ reportData });
          return reportData;
        },

        // ============ Reset Actions ============
        resetAll: () => set(initialState),
        resetAnalysis: () => set({
          hotspots: null,
          burnPolygons: null,
          preFireImage: null,
          postFireImage: null,
          currentRoute: null,
          reportData: null
        })
      }),
      {
        name: "firemap-storage",
        partialize: (state) => ({
          // Yalnız kritik ayarları persist et
          mapCenter: state.mapCenter,
          mapZoom: state.mapZoom,
          baseLayer: state.baseLayer,
          hotspotFilters: state.hotspotFilters,
          visibleLayers: state.visibleLayers
        })
      }
    ),
    { name: "FireMapStore" }
  )
);

// ============ Helper Functions ============

function calculateBounds(geojson) {
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  const processCoord = ([lng, lat]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  };

  const processGeometry = (coords, type) => {
    if (type === "Polygon") {
      coords[0].forEach(processCoord);
    } else if (type === "MultiPolygon") {
      coords.forEach(poly => poly[0].forEach(processCoord));
    }
  };

  if (geojson.type === "Feature") {
    processGeometry(geojson.geometry.coordinates, geojson.geometry.type);
  } else if (geojson.type === "FeatureCollection") {
    geojson.features.forEach(f => 
      processGeometry(f.geometry.coordinates, f.geometry.type)
    );
  }

  return [[minLat, minLng], [maxLat, maxLng]];
}

function isPointInPolygon(point, polygonCoords) {
  const [x, y] = point;
  const ring = polygonCoords[0];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

function calculateTotalBurnArea(burnPolygons) {
  if (!burnPolygons?.features) return 0;
  
  return burnPolygons.features.reduce((total, f) => {
    return total + (f.properties?.area_ha || 0);
  }, 0);
}

function calculateConfidenceSummary(burnPolygons) {
  if (!burnPolygons?.features) {
    return { high: 0, medium: 0, low: 0 };
  }

  return burnPolygons.features.reduce((summary, f) => {
    const conf = (f.properties?.confidence || "low").toLowerCase();
    summary[conf] = (summary[conf] || 0) + 1;
    return summary;
  }, { high: 0, medium: 0, low: 0 });
}

export default useMapStore;
