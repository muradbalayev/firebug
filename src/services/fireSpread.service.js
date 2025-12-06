/**
 * Fire Spread Prediction Service
 * Külək istiqaməti və hotspot-lara əsasən yanğın yayılma proqnozu
 * Open-Meteo API (pulsuz) istifadə edir
 */

import * as turf from "@turf/turf";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Külək məlumatlarını almaq
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} - Wind data
 */
export async function getWindData(lat, lng) {
  try {
    const response = await fetch(
      `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,temperature_2m&timezone=auto`
    );
    
    if (!response.ok) {
      throw new Error("Wind data fetch failed");
    }
    
    const data = await response.json();
    
    return {
      windSpeed: data.current.wind_speed_10m, // km/h
      windDirection: data.current.wind_direction_10m, // degrees (0 = N, 90 = E, 180 = S, 270 = W)
      windGusts: data.current.wind_gusts_10m, // km/h
      humidity: data.current.relative_humidity_2m, // %
      temperature: data.current.temperature_2m, // °C
      time: data.current.time
    };
  } catch (error) {
    console.error("Wind data error:", error);
    // Demo data
    return {
      windSpeed: 15 + Math.random() * 10,
      windDirection: Math.floor(Math.random() * 360),
      windGusts: 25 + Math.random() * 15,
      humidity: 30 + Math.random() * 40,
      temperature: 25 + Math.random() * 10,
      time: new Date().toISOString(),
      isDemo: true
    };
  }
}

/**
 * Yanğın yayılma sürətini hesablamaq
 * Rothermel modeli əsasında sadələşdirilmiş versiya
 * @param {Object} params
 * @returns {number} - Spread rate in meters per hour
 */
function calculateSpreadRate({ windSpeed, humidity, temperature, frp }) {
  // Base spread rate (m/h) - orta şəraitdə
  let baseRate = 50;
  
  // Külək faktoru - hər 10 km/h üçün 1.5x artım
  const windFactor = 1 + (windSpeed / 10) * 0.5;
  
  // Rütubət faktoru - aşağı rütubət = sürətli yayılma
  const humidityFactor = humidity < 30 ? 1.5 : humidity < 50 ? 1.2 : humidity < 70 ? 1.0 : 0.7;
  
  // Temperatur faktoru
  const tempFactor = temperature > 35 ? 1.4 : temperature > 25 ? 1.2 : 1.0;
  
  // FRP faktoru (Fire Radiative Power)
  const frpFactor = frp ? Math.min(1 + frp / 100, 2.5) : 1.0;
  
  return baseRate * windFactor * humidityFactor * tempFactor * frpFactor;
}

/**
 * Dərəcəni radiana çevirmək
 */
function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Külək istiqamətindən yayılma istiqamətini hesablamaq
 * Külək 180° istiqamətindən əsirsə, yanğın 0° (şimala) yayılır
 */
function getSpreadDirection(windDirection) {
  // Külək haradan gəlir, yanğın ora yayılır
  return (windDirection + 180) % 360;
}

/**
 * Bir nöqtədən müəyyən istiqamətdə yeni nöqtə hesablamaq
 * @param {Array} origin - [lng, lat]
 * @param {number} distance - meters
 * @param {number} bearing - degrees
 * @returns {Array} - [lng, lat]
 */
function destinationPoint(origin, distance, bearing) {
  const point = turf.point(origin);
  const destination = turf.destination(point, distance / 1000, bearing, { units: "kilometers" });
  return destination.geometry.coordinates;
}

/**
 * Yanğın yayılma proqnozu hesablamaq
 * @param {Object} params
 * @param {Object} params.hotspots - GeoJSON FeatureCollection
 * @param {Object} params.windData - Wind data from API
 * @param {number} params.hours - Prediction hours (1-24)
 * @returns {Object} - Spread prediction GeoJSON
 */
export function predictFireSpread({ hotspots, windData, hours = 6 }) {
  if (!hotspots?.features?.length) {
    return null;
  }

  const spreadDirection = getSpreadDirection(windData.windDirection);
  const spreadFeatures = [];
  const arrowFeatures = [];
  
  // Hər hotspot üçün yayılma hesabla
  hotspots.features.forEach((hotspot, index) => {
    const coords = hotspot.geometry.coordinates;
    const frp = hotspot.properties?.frp || 0;
    const brightness = hotspot.properties?.bright_ti4 || hotspot.properties?.brightness || 300;
    
    // Yayılma sürəti
    const spreadRate = calculateSpreadRate({
      windSpeed: windData.windSpeed,
      humidity: windData.humidity,
      temperature: windData.temperature,
      frp
    });
    
    // Müxtəlif zaman intervalları üçün yayılma
    const timeIntervals = [1, 3, 6, 12, 24].filter(h => h <= hours);
    
    timeIntervals.forEach(h => {
      const distance = spreadRate * h; // meters
      
      // Əsas istiqamətdə yayılma
      const mainSpread = destinationPoint(coords, distance, spreadDirection);
      
      // Yan istiqamətlərdə yayılma (±30°, ±60°)
      const leftSpread30 = destinationPoint(coords, distance * 0.7, spreadDirection - 30);
      const rightSpread30 = destinationPoint(coords, distance * 0.7, spreadDirection + 30);
      const leftSpread60 = destinationPoint(coords, distance * 0.4, spreadDirection - 60);
      const rightSpread60 = destinationPoint(coords, distance * 0.4, spreadDirection + 60);
      
      // Yayılma zonası (polygon)
      const spreadPolygon = turf.polygon([[
        coords,
        leftSpread60,
        leftSpread30,
        mainSpread,
        rightSpread30,
        rightSpread60,
        coords
      ]]);
      
      spreadPolygon.properties = {
        hotspotId: index,
        hours: h,
        spreadRate: Math.round(spreadRate),
        distance: Math.round(distance),
        windSpeed: windData.windSpeed,
        windDirection: windData.windDirection,
        opacity: 0.3 - (h / hours) * 0.2, // Uzaq zaman = daha şəffaf
        color: h <= 3 ? "#ff4444" : h <= 6 ? "#ff8800" : "#ffcc00"
      };
      
      spreadFeatures.push(spreadPolygon);
    });
    
    // Yayılma ox (arrow) - yalnız ilk 20 hotspot üçün
    if (index < 20) {
      const arrowEnd = destinationPoint(coords, spreadRate * 3, spreadDirection);
      const arrowLine = turf.lineString([coords, arrowEnd]);
      arrowLine.properties = {
        hotspotId: index,
        type: "arrow",
        spreadDirection,
        spreadRate: Math.round(spreadRate)
      };
      arrowFeatures.push(arrowLine);
    }
  });

  // Bütün yayılma zonalarını birləşdir
  const allFeatures = [...spreadFeatures, ...arrowFeatures];
  
  return {
    type: "FeatureCollection",
    features: allFeatures,
    metadata: {
      generatedAt: new Date().toISOString(),
      windData,
      spreadDirection,
      hoursAhead: hours,
      hotspotCount: hotspots.features.length
    }
  };
}

/**
 * Yanğın yayılma statistikası
 */
export function calculateSpreadStats(spreadPrediction) {
  if (!spreadPrediction?.features?.length) {
    return null;
  }

  const polygons = spreadPrediction.features.filter(f => f.geometry.type === "Polygon");
  
  // Ümumi yayılma sahəsi
  let totalArea = 0;
  polygons.forEach(p => {
    try {
      totalArea += turf.area(p);
    } catch (e) {}
  });

  return {
    totalAreaHa: Math.round(totalArea / 10000), // hectares
    polygonCount: polygons.length,
    arrowCount: spreadPrediction.features.filter(f => f.geometry.type === "LineString").length,
    windSpeed: spreadPrediction.metadata?.windData?.windSpeed,
    windDirection: spreadPrediction.metadata?.windData?.windDirection,
    spreadDirection: spreadPrediction.metadata?.spreadDirection,
    hoursAhead: spreadPrediction.metadata?.hoursAhead
  };
}

/**
 * Külək istiqamətini mətnə çevirmək
 */
export function windDirectionToText(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Risk səviyyəsini hesablamaq
 */
export function calculateFireRisk({ windSpeed, humidity, temperature }) {
  let riskScore = 0;
  
  // Külək riski
  if (windSpeed > 40) riskScore += 3;
  else if (windSpeed > 25) riskScore += 2;
  else if (windSpeed > 15) riskScore += 1;
  
  // Rütubət riski
  if (humidity < 20) riskScore += 3;
  else if (humidity < 35) riskScore += 2;
  else if (humidity < 50) riskScore += 1;
  
  // Temperatur riski
  if (temperature > 40) riskScore += 3;
  else if (temperature > 32) riskScore += 2;
  else if (temperature > 25) riskScore += 1;
  
  if (riskScore >= 7) return { level: "EXTREME", color: "#8B0000", score: riskScore };
  if (riskScore >= 5) return { level: "HIGH", color: "#FF0000", score: riskScore };
  if (riskScore >= 3) return { level: "MODERATE", color: "#FFA500", score: riskScore };
  return { level: "LOW", color: "#00AA00", score: riskScore };
}

const FireSpreadService = {
  getWindData,
  predictFireSpread,
  calculateSpreadStats,
  windDirectionToText,
  calculateFireRisk
};

export default FireSpreadService;
