"use client";

import { GeoJSON, CircleMarker, Popup, Marker, useMap } from "react-leaflet";
import { useMapStore } from "@/store/useMapStore";
import { formatDistance, formatDuration } from "@/services/routing.service";
import L from "leaflet";

// Custom marker icons
const startIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div class="w-6 h-6 bg-green-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
    <span class="text-white text-xs font-bold">A</span>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const endIcon = new L.DivIcon({
  className: "custom-marker", 
  html: `<div class="w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
    <span class="text-white text-xs font-bold">B</span>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

/**
 * RouteLayer Component
 * Hesablanmış marşrutu xəritədə göstərir
 */
export default function RouteLayer() {
  const { currentRoute, routeStart, routeEnd } = useMapStore();
  const map = useMap();

  // Route xəttinin style-ı
  const getRouteStyle = (route) => {
    if (route?.isSafe === false) {
      return {
        color: "#ef4444",
        weight: 5,
        opacity: 0.8,
        dashArray: "10, 10"
      };
    }
    
    if (route?.type === "detour") {
      return {
        color: "#f59e0b",
        weight: 5,
        opacity: 0.8
      };
    }

    return {
      color: "#3b82f6",
      weight: 5,
      opacity: 0.8
    };
  };

  return (
    <>
      {/* Start marker */}
      {routeStart && (
        <Marker 
          position={[routeStart[1], routeStart[0]]} 
          icon={startIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>Başlanğıc nöqtəsi</strong>
              <div className="text-gray-500 font-mono text-xs mt-1">
                {routeStart[1].toFixed(4)}, {routeStart[0].toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* End marker */}
      {routeEnd && (
        <Marker 
          position={[routeEnd[1], routeEnd[0]]} 
          icon={endIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>Son nöqtə</strong>
              <div className="text-gray-500 font-mono text-xs mt-1">
                {routeEnd[1].toFixed(4)}, {routeEnd[0].toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Route line */}
      {currentRoute?.features?.[0] && (
        <>
          <GeoJSON
            key={JSON.stringify(currentRoute)}
            data={currentRoute.features[0]}
            style={getRouteStyle(currentRoute)}
          />
          
          {/* Route info popup - route-un ortasında */}
          {currentRoute.metadata && (
            <RouteInfoPopup route={currentRoute} />
          )}
        </>
      )}

      {/* Waypoint marker (detour üçün) */}
      {currentRoute?.waypoint && (
        <CircleMarker
          center={[currentRoute.waypoint[1], currentRoute.waypoint[0]]}
          radius={8}
          pathOptions={{
            color: "#f59e0b",
            fillColor: "#fbbf24",
            fillOpacity: 1,
            weight: 2
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong>Detour nöqtəsi</strong>
              <div className="text-amber-600 text-xs mt-1">
                Yanmış ərazidən yan keçmək üçün
              </div>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {/* Warning overlay for unsafe routes */}
      {currentRoute?.isSafe === false && (
        <RouteWarningOverlay route={currentRoute} />
      )}
    </>
  );
}

/**
 * Route info popup component
 */
function RouteInfoPopup({ route }) {
  const { metadata } = route;
  if (!metadata) return null;

  // Route-un orta nöqtəsini tap
  const coords = route.features[0]?.geometry?.coordinates || [];
  if (coords.length === 0) return null;
  
  const midIndex = Math.floor(coords.length / 2);
  const midPoint = coords[midIndex];
  if (!midPoint) return null;

  return (
    <CircleMarker
      center={[midPoint[1], midPoint[0]]}
      radius={0}
      pathOptions={{ opacity: 0 }}
    >
      <Popup>
        <div className="min-w-[180px]">
          <h4 className="font-semibold text-gray-900 mb-2">
            Marşrut Məlumatı
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Məsafə:</span>
              <span className="font-semibold">
                {formatDistance(metadata.distance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Müddət:</span>
              <span className="font-semibold">
                {formatDuration(metadata.duration)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Profil:</span>
              <span>{metadata.profile}</span>
            </div>
            {route.type && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tip:</span>
                <span className={
                  route.type === "unsafe" ? "text-red-500" :
                  route.type === "detour" ? "text-amber-500" : "text-green-500"
                }>
                  {route.type === "direct" && "Birbaşa"}
                  {route.type === "avoided" && "Təhlükəsiz"}
                  {route.type === "detour" && "Yan keçmə"}
                  {route.type === "unsafe" && "Təhlükəli"}
                </span>
              </div>
            )}
          </div>
          {metadata.isDemo && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              ⚠️ Demo data
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}

/**
 * Unsafe route warning overlay
 */
function RouteWarningOverlay({ route }) {
  const map = useMap();

  if (!route.warning) return null;

  return null; // Warning sidebar-da göstəriləcək
}
