/**
 * NASA FIRMS (Fire Information for Resource Management System) API Service
 * Real-time yanğın hotspot məlumatları üçün
 * API Docs: https://firms.modaps.eosdis.nasa.gov/api/area/
 */

import axios from "axios";

const FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area";
const FIRMS_MAP_KEY = process.env.NEXT_PUBLIC_FIRMS_API_KEY;

/**
 * Data source konfiqurasiyaları
 * MODIS - 1km resolution, 2x daily
 * VIIRS_NOAA20 - 375m resolution, 2x daily
 * VIIRS_SNPP - 375m resolution, 2x daily
 */
export const FIRMS_SOURCES = {
  MODIS_NRT: "MODIS_NRT",
  VIIRS_NOAA20_NRT: "VIIRS_NOAA20_NRT", 
  VIIRS_SNPP_NRT: "VIIRS_SNPP_NRT",
  LANDSAT_NRT: "LANDSAT_NRT"
};

/**
 * AOI daxilindəki hotspotları əldə etmək
 * @param {Object} params - Parametrlər
 * @param {Array} params.bbox - [west, south, east, north] bounding box
 * @param {string} params.source - Data source (default: VIIRS_NOAA20_NRT)
 * @param {number} params.dayRange - Son neçə günün datası (1-10)
 * @param {string} params.date - Spesifik tarix (YYYY-MM-DD)
 * @returns {Promise<Object>} - GeoJSON FeatureCollection
 */
export async function getHotspots({ bbox, source = "VIIRS_NOAA20_NRT", dayRange = 2, date = null }) {
  if (!FIRMS_MAP_KEY) {
    console.warn("FIRMS API key təyin edilməyib. Demo data istifadə olunur.");
    return generateDemoHotspots(bbox);
  }

  try {
    const [west, south, east, north] = bbox;
    const areaParam = `${west},${south},${east},${north}`;
    
    const url = `${FIRMS_BASE_URL}/csv/${FIRMS_MAP_KEY}/${source}/${areaParam}/${dayRange}`;
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "Accept": "text/csv"
      }
    });

    // CSV-ni GeoJSON-a çevir
    const geojson = csvToGeoJSON(response.data);
    return geojson;

  } catch (error) {
    console.error("FIRMS API xətası:", error.message);
    
    // Fallback: demo data qaytar
    if (error.response?.status === 401) {
      throw new Error("FIRMS API key yanlışdır və ya müddəti bitib");
    }
    
    return generateDemoHotspots(bbox);
  }
}

/**
 * CSV datasını GeoJSON formatına çevirmək
 * @param {string} csvData - CSV string
 * @returns {Object} - GeoJSON FeatureCollection
 */
function csvToGeoJSON(csvData) {
  const lines = csvData.trim().split("\n");
  if (lines.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const features = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    if (values.length !== headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim();
    });

    // Koordinatları yoxla
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    
    if (isNaN(lat) || isNaN(lng)) continue;

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat]
      },
      properties: {
        latitude: lat,
        longitude: lng,
        brightness: parseFloat(row.bright_ti4 || row.brightness) || 300,
        scan: parseFloat(row.scan) || 1,
        track: parseFloat(row.track) || 1,
        acq_date: row.acq_date || new Date().toISOString().split("T")[0],
        acq_time: row.acq_time || "0000",
        satellite: row.satellite || "N20",
        instrument: row.instrument || "VIIRS",
        confidence: normalizeConfidence(row.confidence),
        version: row.version || "2.0NRT",
        frp: parseFloat(row.frp) || 0, // Fire Radiative Power
        daynight: row.daynight || "D"
      }
    });
  }

  return {
    type: "FeatureCollection",
    features,
    metadata: {
      source: "NASA FIRMS",
      count: features.length,
      fetchedAt: new Date().toISOString()
    }
  };
}

/**
 * Confidence dəyərini normallaşdırmaq
 * @param {string|number} confidence 
 * @returns {string}
 */
function normalizeConfidence(confidence) {
  if (!confidence) return "nominal";
  
  const conf = String(confidence).toLowerCase();
  if (conf === "h" || conf === "high" || parseInt(conf) >= 80) return "high";
  if (conf === "l" || conf === "low" || parseInt(conf) < 50) return "low";
  return "nominal";
}

/**
 * Demo hotspot datası generasiya etmək (API olmadıqda)
 * @param {Array} bbox - Bounding box
 * @returns {Object} - GeoJSON FeatureCollection
 */
function generateDemoHotspots(bbox) {
  const [west, south, east, north] = bbox;
  const features = [];
  
  // Random hotspotlar generasiya et
  const count = Math.floor(Math.random() * 15) + 5;
  
  for (let i = 0; i < count; i++) {
    const lat = south + Math.random() * (north - south);
    const lng = west + Math.random() * (east - west);
    
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat]
      },
      properties: {
        latitude: lat,
        longitude: lng,
        brightness: 280 + Math.random() * 150,
        scan: 0.5 + Math.random() * 1,
        track: 0.5 + Math.random() * 1,
        acq_date: new Date().toISOString().split("T")[0],
        acq_time: String(Math.floor(Math.random() * 2400)).padStart(4, "0"),
        satellite: Math.random() > 0.5 ? "N20" : "SNPP",
        instrument: "VIIRS",
        confidence: ["high", "nominal", "low"][Math.floor(Math.random() * 3)],
        version: "2.0NRT",
        frp: Math.random() * 100,
        daynight: Math.random() > 0.5 ? "D" : "N",
        isDemo: true
      }
    });
  }

  return {
    type: "FeatureCollection",
    features,
    metadata: {
      source: "Demo Data",
      count: features.length,
      fetchedAt: new Date().toISOString(),
      isDemo: true
    }
  };
}

/**
 * Hotspot statistikalarını hesablamaq
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Object} - Statistikalar
 */
export function calculateHotspotStats(geojson) {
  const features = geojson?.features || [];
  
  if (features.length === 0) {
    return {
      total: 0,
      highConfidence: 0,
      nominalConfidence: 0,
      lowConfidence: 0,
      avgBrightness: 0,
      avgFRP: 0,
      satellites: {}
    };
  }

  const stats = {
    total: features.length,
    highConfidence: 0,
    nominalConfidence: 0,
    lowConfidence: 0,
    totalBrightness: 0,
    totalFRP: 0,
    satellites: {}
  };

  features.forEach(f => {
    const props = f.properties;
    
    // Confidence
    if (props.confidence === "high") stats.highConfidence++;
    else if (props.confidence === "low") stats.lowConfidence++;
    else stats.nominalConfidence++;
    
    // Brightness & FRP
    stats.totalBrightness += props.brightness || 0;
    stats.totalFRP += props.frp || 0;
    
    // Satellites
    const sat = props.satellite || "Unknown";
    stats.satellites[sat] = (stats.satellites[sat] || 0) + 1;
  });

  return {
    total: stats.total,
    highConfidence: stats.highConfidence,
    nominalConfidence: stats.nominalConfidence,
    lowConfidence: stats.lowConfidence,
    avgBrightness: Math.round(stats.totalBrightness / stats.total),
    avgFRP: Math.round(stats.totalFRP / stats.total * 10) / 10,
    satellites: stats.satellites
  };
}

export default {
  getHotspots,
  calculateHotspotStats,
  FIRMS_SOURCES
};
