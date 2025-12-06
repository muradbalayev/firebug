import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind class-larını birləşdirmək üçün utility function
 * @param {...string} inputs - CSS class-ları
 * @returns {string} - Birləşdirilmiş class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Koordinatları format etmək
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} precision - Onluq dəqiqliyi
 * @returns {string}
 */
export function formatCoordinates(lat, lng, precision = 4) {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Sahəni hektara çevirmək
 * @param {number} areaInSquareMeters - Kvadrat metr
 * @returns {number} - Hektar
 */
export function squareMetersToHectares(areaInSquareMeters) {
  return areaInSquareMeters / 10000;
}

/**
 * GeoJSON bounding box hesablamaq
 * @param {Object} geojson - GeoJSON object
 * @returns {Array} - [minLng, minLat, maxLng, maxLat]
 */
export function getBoundingBox(geojson) {
  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;

  const processCoord = (coord) => {
    const [lng, lat] = coord;
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  };

  const processGeometry = (geometry) => {
    if (geometry.type === "Point") {
      processCoord(geometry.coordinates);
    } else if (geometry.type === "LineString" || geometry.type === "MultiPoint") {
      geometry.coordinates.forEach(processCoord);
    } else if (geometry.type === "Polygon" || geometry.type === "MultiLineString") {
      geometry.coordinates.forEach(ring => ring.forEach(processCoord));
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach(polygon => 
        polygon.forEach(ring => ring.forEach(processCoord))
      );
    }
  };

  if (geojson.type === "FeatureCollection") {
    geojson.features.forEach(f => processGeometry(f.geometry));
  } else if (geojson.type === "Feature") {
    processGeometry(geojson.geometry);
  } else {
    processGeometry(geojson);
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Tarixi format etmək
 * @param {Date|string} date - Tarix
 * @param {string} format - Format tipi
 * @returns {string}
 */
export function formatDate(date, format = "short") {
  const d = new Date(date);
  
  if (format === "short") {
    return d.toLocaleDateString("az-AZ");
  } else if (format === "long") {
    return d.toLocaleDateString("az-AZ", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } else if (format === "iso") {
    return d.toISOString().split("T")[0];
  }
  
  return d.toLocaleDateString();
}

/**
 * Debounce function
 * @param {Function} func - İcra ediləcək function
 * @param {number} wait - Gözləmə müddəti (ms)
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Rəng dəyərini brightness-ə görə almaq (hotspotlar üçün)
 * @param {number} brightness - Parlaqlıq dəyəri
 * @returns {string} - HEX rəng
 */
export function getBrightnessColor(brightness) {
  if (brightness >= 400) return "#ff0000"; // Çox yüksək
  if (brightness >= 350) return "#ff4500"; // Yüksək
  if (brightness >= 300) return "#ff8c00"; // Orta-yüksək
  if (brightness >= 250) return "#ffa500"; // Orta
  return "#ffcc00"; // Aşağı
}

/**
 * Confidence dəyərini rəngə çevirmək
 * @param {string} confidence - HIGH, MEDIUM, LOW
 * @returns {string} - HEX rəng
 */
export function getConfidenceColor(confidence) {
  const colors = {
    HIGH: "#ef4444",
    MEDIUM: "#f59e0b",
    LOW: "#22c55e",
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#22c55e",
    nominal: "#f59e0b",
    h: "#ef4444",
    n: "#f59e0b",
    l: "#22c55e"
  };
  return colors[confidence] || "#6b7280";
}
