/**
 * Reverse Geocoding Service
 * Koordinatları ən yaxın şəhər/rayon adına çevirir
 */

// Azerbaijan şəhər və rayonları (əsas olanlar)
const AZERBAIJAN_LOCATIONS = [
  { name: "Baku", lat: 40.4093, lon: 49.8671 },
  { name: "Ganja", lat: 40.6828, lon: 46.3606 },
  { name: "Sumgait", lat: 40.5855, lon: 49.6317 },
  { name: "Mingachevir", lat: 40.7656, lon: 47.0489 },
  { name: "Lankaran", lat: 38.7539, lon: 48.8511 },
  { name: "Shirvan", lat: 39.9381, lon: 48.9206 },
  { name: "Nakhchivan", lat: 39.2089, lon: 45.4122 },
  { name: "Shaki", lat: 41.1919, lon: 47.1706 },
  { name: "Yevlakh", lat: 40.6197, lon: 47.1500 },
  { name: "Khachmaz", lat: 41.4631, lon: 48.8022 },
  { name: "Gabala", lat: 40.9814, lon: 47.8458 },
  { name: "Guba", lat: 41.3611, lon: 48.5128 },
  { name: "Zagatala", lat: 41.6314, lon: 46.6383 },
  { name: "Shamakhi", lat: 40.6317, lon: 48.6364 },
  { name: "Goychay", lat: 40.6536, lon: 47.7406 },
  { name: "Agdash", lat: 40.6494, lon: 47.4672 },
  { name: "Barda", lat: 40.3747, lon: 47.1264 },
  { name: "Beylagan", lat: 39.7728, lon: 47.6156 },
  { name: "Imishli", lat: 39.8697, lon: 48.0669 },
  { name: "Sabirabad", lat: 40.0108, lon: 48.4769 },
  { name: "Salyan", lat: 39.5900, lon: 48.9833 },
  { name: "Neftchala", lat: 39.3781, lon: 49.2472 },
  { name: "Astara", lat: 38.4558, lon: 48.8728 },
  { name: "Lerik", lat: 38.7736, lon: 48.4150 },
  { name: "Masalli", lat: 39.0344, lon: 48.6658 },
  { name: "Jalilabad", lat: 39.2050, lon: 48.5100 },
  { name: "Bilasuvar", lat: 39.4597, lon: 48.5511 },
  { name: "Saatli", lat: 39.9306, lon: 48.3594 },
  { name: "Fuzuli", lat: 39.6003, lon: 47.1453 },
  { name: "Jabrayil", lat: 39.3989, lon: 47.0286 },
  { name: "Zangilan", lat: 39.0853, lon: 46.6525 },
  { name: "Gubadli", lat: 39.3456, lon: 46.5797 },
  { name: "Lachin", lat: 39.6381, lon: 46.5464 },
  { name: "Kalbajar", lat: 40.1022, lon: 46.0364 },
  { name: "Tartar", lat: 40.3444, lon: 46.9306 },
  { name: "Aghdam", lat: 39.9911, lon: 46.9269 },
  { name: "Khojaly", lat: 39.9131, lon: 46.7942 },
  { name: "Shusha", lat: 39.7572, lon: 46.7528 },
  { name: "Khojavend", lat: 39.7917, lon: 47.1108 },
  { name: "Aghjabadi", lat: 40.0528, lon: 47.4614 },
  { name: "Goranboy", lat: 40.6100, lon: 46.7900 },
  { name: "Dashkasan", lat: 40.5200, lon: 46.0800 },
  { name: "Gadabay", lat: 40.5656, lon: 45.8158 },
  { name: "Shamkir", lat: 40.8297, lon: 46.0178 },
  { name: "Tovuz", lat: 40.9922, lon: 45.6286 },
  { name: "Gazakh", lat: 41.0972, lon: 45.3656 },
  { name: "Agstafa", lat: 41.1194, lon: 45.4539 },
  { name: "Balakan", lat: 41.7256, lon: 46.4044 },
  { name: "Gakh", lat: 41.4206, lon: 46.9319 },
  { name: "Oghuz", lat: 41.0728, lon: 47.4650 },
  { name: "Ismayilli", lat: 40.7872, lon: 48.1519 },
  { name: "Aghsu", lat: 40.5697, lon: 48.3950 },
  { name: "Kurdamir", lat: 40.3397, lon: 48.1644 },
  { name: "Ujar", lat: 40.5106, lon: 47.6506 },
  { name: "Zardab", lat: 40.2181, lon: 47.7142 },
  { name: "Hajigabul", lat: 40.0394, lon: 48.9403 },
  { name: "Siyazan", lat: 41.0783, lon: 49.1119 },
  { name: "Shabran", lat: 41.2158, lon: 48.8547 },
  { name: "Khizi", lat: 40.9108, lon: 49.0742 },
  { name: "Absheron", lat: 40.4289, lon: 49.6358 },
  { name: "Gobustan", lat: 40.5328, lon: 48.9278 },
];

/**
 * Haversine formula ilə iki nöqtə arasındakı məsafəni hesabla (km)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Koordinatları ən yaxın şəhər/rayon adına çevir
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} - {name, distance}
 */
export function getNearestLocation(lat, lon) {
  let nearest = null;
  let minDistance = Infinity;

  for (const location of AZERBAIJAN_LOCATIONS) {
    const distance = calculateDistance(lat, lon, location.lat, location.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = location;
    }
  }

  if (nearest) {
    return {
      name: nearest.name,
      distance: Math.round(minDistance)
    };
  }

  // Əgər heç bir şəhər tapılmasa, koordinatları qaytar
  return {
    name: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
    distance: 0
  };
}

/**
 * Koordinatları oxunaqlı location string-ə çevir
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} - Location description
 */
export function getLocationString(lat, lon) {
  const location = getNearestLocation(lat, lon);
  
  if (location.distance === 0) {
    return location.name;
  } else if (location.distance < 5) {
    return `Near ${location.name}`;
  } else {
    return `${location.distance}km from ${location.name}`;
  }
}
