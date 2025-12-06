// Map Components Index
// Note: Components with Leaflet/deck.gl are loaded dynamically to avoid SSR issues

// MapContainer - wrapper that dynamically loads MapView (Leaflet)
export { default as MapContainer } from "./MapContainer";

// Map3DView - uses deck.gl, should be imported dynamically in consuming components
// Do NOT export here - use dynamic(() => import("@/components/map/Map3DView")) instead
// export { default as Map3DView } from "./Map3DView";
