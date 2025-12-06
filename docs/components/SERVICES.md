# 🔌 API Services Documentation

## Ümumi Baxış

Services layer xarici API-lərlə əlaqəni idarə edir. Hər servis modulu spesifik API üçün optimizə edilib.

---

## firms.service.js

### Məqsəd
NASA FIRMS (Fire Information for Resource Management System) API ilə əlaqə.

### Konfiqurasiya
```javascript
const FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area";
const FIRMS_MAP_KEY = process.env.NEXT_PUBLIC_FIRMS_API_KEY;
```

### Data Sources
| Source | Resolution | Update Frequency |
|--------|------------|------------------|
| VIIRS_NOAA20_NRT | 375m | 2x daily |
| VIIRS_SNPP_NRT | 375m | 2x daily |
| MODIS_NRT | 1km | 2x daily |
| LANDSAT_NRT | 30m | 8 days |

### Əsas Funksiyalar

#### getHotspots(params)
```javascript
/**
 * @param {Array} params.bbox - [west, south, east, north]
 * @param {string} params.source - Data source (VIIRS_NOAA20_NRT)
 * @param {number} params.dayRange - 1-10 gün
 * @returns {Promise<GeoJSON>} FeatureCollection
 */
const hotspots = await getHotspots({
  bbox: [49.5, 40.2, 50.1, 40.6],
  source: "VIIRS_NOAA20_NRT",
  dayRange: 2
});
```

#### calculateHotspotStats(geojson)
```javascript
/**
 * @returns {Object} {
 *   total, highConfidence, nominalConfidence, lowConfidence,
 *   avgBrightness, avgFRP, satellites
 * }
 */
```

### Response Format
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [49.8671, 40.4093]
    },
    "properties": {
      "brightness": 345.6,
      "confidence": "high",
      "acq_date": "2024-12-06",
      "acq_time": "1430",
      "satellite": "N20",
      "instrument": "VIIRS",
      "frp": 45.2,
      "daynight": "D"
    }
  }],
  "metadata": {
    "source": "NASA FIRMS",
    "count": 45,
    "fetchedAt": "2024-12-06T14:30:00Z"
  }
}
```

### Error Handling
- API key yoxdursa → Demo data qaytarır
- 401 error → "API key yanlışdır" exception
- Network error → Demo data fallback

---

## sentinel.service.js

### Məqsəd
Sentinel Hub API ilə peyk görüntüsü əldə etmək.

### Konfiqurasiya
```javascript
const SENTINEL_AUTH_URL = "https://services.sentinel-hub.com/oauth/token";
const SENTINEL_PROCESS_URL = "https://services.sentinel-hub.com/api/v1/process";
```

### Authentication
OAuth2 Client Credentials flow:
```javascript
export const getAccessToken = async () => {
  const response = await axios.post(SENTINEL_AUTH_URL, {
    grant_type: "client_credentials",
    client_id: process.env.NEXT_PUBLIC_SENTINEL_CLIENT_ID,
    client_secret: process.env.NEXT_PUBLIC_SENTINEL_CLIENT_SECRET
  });
  return response.data.access_token;
};
```

### Əsas Funksiyalar

#### getSentinelImage(params)
```javascript
/**
 * @param {Array} params.bbox - Bounding box
 * @param {string} params.date - YYYY-MM-DD
 * @param {string} params.type - "truecolor" | "nbr" | "ndvi"
 * @param {number} params.width - Pixel width
 * @param {number} params.height - Pixel height
 * @returns {Promise<string>} Base64 encoded image
 */
```

#### getBeforeAfterImages(params)
```javascript
/**
 * @returns {Promise<Object>} {
 *   preImage, postImage, preNBR, postNBR, preDate, postDate
 * }
 */
```

#### searchAvailableImages(params)
```javascript
/**
 * @returns {Promise<Array>} [{
 *   id, date, cloudCover, satellite
 * }]
 */
```

### Evalscripts

#### True Color
```javascript
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}
```

#### NBR (Normalized Burn Ratio)
```javascript
function evaluatePixel(sample) {
  let nbr = (sample.B08 - sample.B12) / (sample.B08 + sample.B12);
  // Color scale based on NBR value
  if (nbr < -0.25) return [0.5, 0, 0];      // Severe burn
  if (nbr < 0) return [1, 0.3, 0];           // Moderate burn
  if (nbr < 0.1) return [1, 0.7, 0.3];      // Low burn
  if (nbr < 0.27) return [1, 1, 0.5];       // Recovering
  return [0, 0.7, 0];                        // Healthy
}
```

---

## routing.service.js

### Məqsəd
OpenRouteService API ilə marşrut hesablaması.

### Konfiqurasiya
```javascript
const ORS_BASE_URL = "https://api.openrouteservice.org/v2";
const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;
```

### Route Profiles
| Profile | Təsvir |
|---------|--------|
| driving-car | Avtomobil |
| driving-hgv | Yük maşını |
| cycling-regular | Velosiped |
| foot-walking | Piyada |
| foot-hiking | Hiking |

### Əsas Funksiyalar

#### getRoute(params)
```javascript
/**
 * @param {Array} params.start - [lng, lat]
 * @param {Array} params.end - [lng, lat]
 * @param {string} params.profile - Route profile
 * @param {GeoJSON} params.avoidPolygons - Avoid areas
 * @returns {Promise<GeoJSON>} Route FeatureCollection
 */
```

#### findSafeAlternativeRoute(params)
```javascript
/**
 * Smart route finding:
 * 1. Try direct route with avoid_polygons
 * 2. If fails, calculate detour waypoint
 * 3. Return route with safety info
 * 
 * @returns {Promise<Object>} Route + {isSafe, type, warning, waypoint}
 */
```

### Response Format
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[lng, lat], ...]
    },
    "properties": {
      "summary": {
        "distance": 15420,
        "duration": 1230
      }
    }
  }],
  "metadata": {
    "distance": 15420,
    "duration": 1230,
    "profile": "driving-car"
  },
  "isSafe": true,
  "type": "avoided"
}
```

### Avoid Polygons
```javascript
// Burn polygons-u ORS formatına çevirmək
function combinePolygons(geojson) {
  return {
    type: "MultiPolygon",
    coordinates: [...all polygon coordinates]
  };
}
```

### Helper Functions

#### formatDistance(meters)
```javascript
formatDistance(15420); // "15.4 km"
formatDistance(500);   // "500 m"
```

#### formatDuration(seconds)
```javascript
formatDuration(3720);  // "1 saat 2 dəq"
formatDuration(300);   // "5 dəqiqə"
```

---

## Error Handling Strategy

Bütün servislər eyni error handling pattern-ini istifadə edir:

```javascript
try {
  // API call
  const response = await axios.get(url);
  return processResponse(response.data);
} catch (error) {
  console.error("Service error:", error.message);
  
  // Specific error handling
  if (error.response?.status === 401) {
    throw new Error("Invalid API key");
  }
  
  // Fallback to demo data
  return generateDemoData();
}
```

---

## API Rate Limits

| Service | Limit | Period |
|---------|-------|--------|
| FIRMS | 10 req | minute |
| Sentinel Hub | 300 req | minute |
| OpenRouteService | 40 req | minute |

### Rate Limit Handling
```javascript
// Simple retry with exponential backoff
const fetchWithRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
};
```
