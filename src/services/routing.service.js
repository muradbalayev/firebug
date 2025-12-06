/**
 * OpenRouteService API - Safe Route Planning
 * Yanmış ərazilərdən yan keçən marşrut hesablama
 * API Docs: https://openrouteservice.org/dev/#/api-docs
 */

import axios from "axios";
import * as turf from "@turf/turf";

const ORS_BASE_URL = "https://api.openrouteservice.org/v2";
const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

/**
 * Profil seçimləri
 */
export const ROUTE_PROFILES = {
  DRIVING_CAR: "driving-car",
  DRIVING_HGV: "driving-hgv", // Heavy goods vehicle
  CYCLING_REGULAR: "cycling-regular",
  FOOT_WALKING: "foot-walking",
  FOOT_HIKING: "foot-hiking"
};

/**
 * İki nöqtə arasında marşrut hesablamaq
 * @param {Object} params
 * @param {Array} params.start - [lng, lat] başlanğıc
 * @param {Array} params.end - [lng, lat] son nöqtə
 * @param {string} params.profile - Nəqliyyat növü
 * @param {Object} params.avoidPolygons - GeoJSON FeatureCollection (burn polygons)
 * @returns {Promise<Object>} - Route GeoJSON
 */
export async function getRoute({ start, end, profile = "driving-car", avoidPolygons = null }) {
  if (!ORS_API_KEY) {
    console.warn("OpenRouteService API key təyin edilməyib. Demo route istifadə olunur.");
    return generateDemoRoute(start, end);
  }

  try {
    const body = {
      coordinates: [start, end],
      instructions: true,
      geometry: true,
      elevation: true,
      preference: "recommended"
    };

    // Avoid polygons əlavə et (burn areas)
    if (avoidPolygons && avoidPolygons.features?.length > 0) {
      body.options = {
        avoid_polygons: combinePolygons(avoidPolygons)
      };
    }

    const response = await axios.post(
      `${ORS_BASE_URL}/directions/${profile}/geojson`,
      body,
      {
        headers: {
          "Authorization": ORS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    const route = response.data;
    
    // Burn polygons ilə kəsişmə yoxla
    if (avoidPolygons) {
      route.intersectsWithBurnArea = checkRouteIntersection(route, avoidPolygons);
    }

    return {
      ...route,
      metadata: {
        distance: route.features[0]?.properties?.summary?.distance || 0,
        duration: route.features[0]?.properties?.summary?.duration || 0,
        profile
      }
    };

  } catch (error) {
    console.error("ORS Route xətası:", error.message);
    
    // Avoid polygons ilə işləmədisə, onlarsız cəhd et
    if (error.response?.status === 400 && avoidPolygons) {
      console.warn("Avoid polygons ilə route tapılmadı, alternativ axtarılır...");
      return getRoute({ start, end, profile, avoidPolygons: null });
    }
    
    return generateDemoRoute(start, end);
  }
}

/**
 * Çoxlu waypoint-li marşrut
 * @param {Object} params
 * @param {Array} params.coordinates - [[lng, lat], ...] nöqtələr
 * @param {string} params.profile - Nəqliyyat növü
 * @param {Object} params.avoidPolygons - Qarşısını almaq üçün polygonlar
 * @returns {Promise<Object>}
 */
export async function getRouteWithWaypoints({ coordinates, profile = "driving-car", avoidPolygons = null }) {
  if (!ORS_API_KEY || coordinates.length < 2) {
    return generateDemoRoute(coordinates[0], coordinates[coordinates.length - 1]);
  }

  try {
    const body = {
      coordinates,
      instructions: true,
      geometry: true,
      elevation: true
    };

    if (avoidPolygons?.features?.length > 0) {
      body.options = {
        avoid_polygons: combinePolygons(avoidPolygons)
      };
    }

    const response = await axios.post(
      `${ORS_BASE_URL}/directions/${profile}/geojson`,
      body,
      {
        headers: {
          "Authorization": ORS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {
    console.error("ORS Waypoints route xətası:", error.message);
    return generateDemoRoute(coordinates[0], coordinates[coordinates.length - 1]);
  }
}

/**
 * Polygonları OpenRouteService formatına çevirmək
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Object} - Birləşdirilmiş MultiPolygon
 */
function combinePolygons(geojson) {
  if (!geojson?.features?.length) return null;

  const polygons = geojson.features
    .filter(f => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon")
    .map(f => f.geometry);

  if (polygons.length === 0) return null;
  if (polygons.length === 1) return polygons[0];

  // Bütün polygonları MultiPolygon-a çevir
  const allCoordinates = [];
  polygons.forEach(p => {
    if (p.type === "Polygon") {
      allCoordinates.push(p.coordinates);
    } else if (p.type === "MultiPolygon") {
      allCoordinates.push(...p.coordinates);
    }
  });

  return {
    type: "MultiPolygon",
    coordinates: allCoordinates
  };
}

/**
 * Route-un burn polygon ilə kəsişdiyini yoxlamaq
 * @param {Object} route - Route GeoJSON
 * @param {Object} burnPolygons - Burn polygons GeoJSON
 * @returns {Object} - {intersects, intersectionPoints}
 */
function checkRouteIntersection(route, burnPolygons) {
  if (!route?.features?.[0]?.geometry || !burnPolygons?.features?.length) {
    return { intersects: false, intersectionPoints: [] };
  }

  const routeLine = route.features[0];
  const intersectionPoints = [];

  burnPolygons.features.forEach(polygon => {
    if (polygon.geometry?.type !== "Polygon" && polygon.geometry?.type !== "MultiPolygon") {
      return;
    }

    try {
      const intersection = turf.lineIntersect(routeLine, polygon);
      if (intersection.features.length > 0) {
        intersectionPoints.push(...intersection.features.map(f => ({
          coordinates: f.geometry.coordinates,
          polygonId: polygon.properties?.id || "unknown"
        })));
      }
    } catch (e) {
      console.warn("Intersection check xətası:", e.message);
    }
  });

  return {
    intersects: intersectionPoints.length > 0,
    intersectionPoints
  };
}

/**
 * Alternativ təhlükəsiz marşrut tapmaq
 * Burn polygon ilə kəsişən route üçün waypoint əlavə edərək
 * @param {Object} params
 * @param {Array} params.start - Başlanğıc
 * @param {Array} params.end - Son
 * @param {Object} params.burnPolygons - Burn polygons
 * @param {string} params.profile - Profil
 * @returns {Promise<Object>}
 */
export async function findSafeAlternativeRoute({ start, end, burnPolygons, profile = "driving-car" }) {
  // Əvvəlcə birbaşa route al
  const directRoute = await getRoute({ start, end, profile });
  
  // Burn polygons yoxdursa, birbaşa route qaytar
  if (!burnPolygons?.features?.length) {
    return { ...directRoute, isSafe: true, type: "direct" };
  }

  // Avoid polygons ilə cəhd et
  const avoidRoute = await getRoute({ start, end, profile, avoidPolygons: burnPolygons });
  
  if (avoidRoute && !avoidRoute.intersectsWithBurnArea?.intersects) {
    return { ...avoidRoute, isSafe: true, type: "avoided" };
  }

  // Manual detour hesabla
  const intersection = checkRouteIntersection(directRoute, burnPolygons);
  
  if (!intersection.intersects) {
    return { ...directRoute, isSafe: true, type: "direct" };
  }

  // Waypoint əlavə etməklə alternativ tap
  const waypoint = calculateDetourWaypoint(
    directRoute.features[0].geometry.coordinates,
    burnPolygons,
    intersection.intersectionPoints[0]?.coordinates
  );

  if (waypoint) {
    const detourRoute = await getRouteWithWaypoints({
      coordinates: [start, waypoint, end],
      profile,
      avoidPolygons: burnPolygons
    });

    return {
      ...detourRoute,
      isSafe: true,
      type: "detour",
      waypoint,
      originalRoute: directRoute
    };
  }

  // Heç bir alternativ tapılmadı
  return {
    ...directRoute,
    isSafe: false,
    type: "unsafe",
    warning: "Bu marşrut yanmış ərazidən keçir. Diqqətli olun!"
  };
}

/**
 * Detour waypoint hesablamaq
 */
function calculateDetourWaypoint(routeCoords, burnPolygons, intersectionPoint) {
  if (!intersectionPoint || !burnPolygons?.features?.length) return null;

  try {
    // Burn polygon-un centroid-ini tap
    const burnCentroid = turf.centroid(burnPolygons);
    const burnCenter = burnCentroid.geometry.coordinates;
    
    // İntersection point-dən burn center-ə vektor
    const dx = intersectionPoint[0] - burnCenter[0];
    const dy = intersectionPoint[1] - burnCenter[1];
    
    // Əks istiqamətdə waypoint (burn polygon-dan uzaqlaşma)
    const offset = 0.05; // ~5km offset
    const waypoint = [
      intersectionPoint[0] + dx * offset * 10,
      intersectionPoint[1] + dy * offset * 10
    ];

    return waypoint;
  } catch (e) {
    console.warn("Detour hesablama xətası:", e.message);
    return null;
  }
}

/**
 * Demo route generasiya etmək
 */
function generateDemoRoute(start, end) {
  const coordinates = [
    start,
    [
      (start[0] + end[0]) / 2 + (Math.random() - 0.5) * 0.01,
      (start[1] + end[1]) / 2 + (Math.random() - 0.5) * 0.01
    ],
    end
  ];

  const distance = turf.distance(turf.point(start), turf.point(end), { units: "meters" });
  const duration = distance / 15; // ~15 m/s ortalama sürət

  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates
      },
      properties: {
        summary: {
          distance,
          duration
        }
      }
    }],
    metadata: {
      distance,
      duration,
      profile: "driving-car",
      isDemo: true
    }
  };
}

/**
 * Marşrut məsafəsini formatlamaq
 * @param {number} meters - Metr
 * @returns {string}
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Marşrut müddətini formatlamaq
 * @param {number} seconds - Saniyə
 * @returns {string}
 */
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} saat ${minutes} dəq`;
  }
  return `${minutes} dəqiqə`;
}

const RoutingService = {
  getRoute,
  getRouteWithWaypoints,
  findSafeAlternativeRoute,
  formatDistance,
  formatDuration,
  ROUTE_PROFILES
};

export default RoutingService;
