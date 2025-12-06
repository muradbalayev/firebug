/**
 * Sentinel Hub API Service
 * Peyk görüntüləri və NBR/dNBR hesablamaları üçün
 * API Docs: https://docs.sentinel-hub.com/api/latest/
 */

import axios from "axios";

const SENTINEL_AUTH_URL = "https://services.sentinel-hub.com/oauth/token";
const SENTINEL_PROCESS_URL = "https://services.sentinel-hub.com/api/v1/process";
const SENTINEL_CATALOG_URL = "https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search";

let accessToken = null;
let tokenExpiry = null;

/**
 * OAuth2 token almaq
 * @returns {Promise<string>} - Access token
 */
async function getAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_SENTINEL_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_SENTINEL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("Sentinel Hub credentials təyin edilməyib");
    return null;
  }

  // Token hələ validdirsə, yenisini almağa ehtiyac yoxdur
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await axios.post(SENTINEL_AUTH_URL, 
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
      }), 
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    
    return accessToken;
  } catch (error) {
    console.error("Sentinel Hub auth xətası:", error.message);
    return null;
  }
}

/**
 * Sentinel-2 görüntüsü əldə etmək
 * @param {Object} params - Parametrlər
 * @param {Array} params.bbox - [west, south, east, north]
 * @param {string} params.date - Tarix (YYYY-MM-DD)
 * @param {string} params.type - "truecolor" | "nbr" | "ndvi"
 * @param {number} params.width - Şəkil eni (px)
 * @param {number} params.height - Şəkil hündürlüyü (px)
 * @returns {Promise<string>} - Base64 encoded image
 */
export async function getSentinelImage({ bbox, date, type = "truecolor", width = 512, height = 512 }) {
  const token = await getAccessToken();
  
  if (!token) {
    // Demo görüntü qaytar
    return getDemoImage(type);
  }

  const evalscript = getEvalscript(type);
  const [west, south, east, north] = bbox;

  const requestBody = {
    input: {
      bounds: {
        bbox: [west, south, east, north],
        properties: {
          crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
        }
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: {
              from: `${date}T00:00:00Z`,
              to: `${date}T23:59:59Z`
            },
            maxCloudCoverage: 30
          }
        }
      ]
    },
    output: {
      width,
      height,
      responses: [
        {
          identifier: "default",
          format: {
            type: "image/png"
          }
        }
      ]
    },
    evalscript
  };

  try {
    const response = await axios.post(SENTINEL_PROCESS_URL, requestBody, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "image/png"
      },
      responseType: "arraybuffer"
    });

    const base64 = Buffer.from(response.data, "binary").toString("base64");
    return `data:image/png;base64,${base64}`;

  } catch (error) {
    console.error("Sentinel görüntü xətası:", error.message);
    return getDemoImage(type);
  }
}

/**
 * NBR (Normalized Burn Ratio) hesablamaq üçün evalscript
 * NBR = (NIR - SWIR2) / (NIR + SWIR2)
 * Sentinel-2: B08 (NIR), B12 (SWIR2)
 */
function getEvalscript(type) {
  const scripts = {
    truecolor: `
      //VERSION=3
      function setup() {
        return {
          input: ["B04", "B03", "B02"],
          output: { bands: 3 }
        };
      }
      function evaluatePixel(sample) {
        return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
      }
    `,
    nbr: `
      //VERSION=3
      function setup() {
        return {
          input: ["B08", "B12"],
          output: { bands: 3 }
        };
      }
      function evaluatePixel(sample) {
        let nbr = (sample.B08 - sample.B12) / (sample.B08 + sample.B12);
        // NBR rəng skalası: -1 (yanmış) - 1 (sağlam bitki)
        if (nbr < -0.25) return [0.5, 0, 0];      // Şiddətli yanğın izi
        if (nbr < 0) return [1, 0.3, 0];           // Orta yanğın izi
        if (nbr < 0.1) return [1, 0.7, 0.3];      // Yüngül yanğın izi
        if (nbr < 0.27) return [1, 1, 0.5];       // Yenidən bərpa
        if (nbr < 0.44) return [0.7, 1, 0.5];     // Aşağı bitki örtüyü
        return [0, 0.7, 0];                        // Sağlam bitki
      }
    `,
    dnbr: `
      //VERSION=3
      // dNBR üçün pre və post görüntülər lazımdır
      // Bu sadə NBR vizualizasiyasıdır
      function setup() {
        return {
          input: ["B08", "B12"],
          output: { bands: 3 }
        };
      }
      function evaluatePixel(sample) {
        let nbr = (sample.B08 - sample.B12) / (sample.B08 + sample.B12);
        // dNBR threshold rəngləri
        if (nbr < -0.1) return [0.4, 0, 0];       // Yüksək severity
        if (nbr < 0.1) return [1, 0.4, 0];        // Orta-yüksək
        if (nbr < 0.27) return [1, 0.8, 0];       // Orta-aşağı
        if (nbr < 0.44) return [1, 1, 0.5];       // Aşağı severity
        return [0, 0.6, 0];                        // Yanmamış
      }
    `,
    ndvi: `
      //VERSION=3
      function setup() {
        return {
          input: ["B04", "B08"],
          output: { bands: 3 }
        };
      }
      function evaluatePixel(sample) {
        let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
        if (ndvi < 0) return [0.5, 0.5, 0.5];
        if (ndvi < 0.2) return [0.9, 0.9, 0.7];
        if (ndvi < 0.4) return [0.7, 0.9, 0.5];
        if (ndvi < 0.6) return [0.4, 0.8, 0.3];
        return [0.1, 0.6, 0.1];
      }
    `
  };

  return scripts[type] || scripts.truecolor;
}

/**
 * Mövcud görüntüləri axtarmaq (Catalog API)
 * @param {Object} params
 * @param {Array} params.bbox - Bounding box
 * @param {string} params.startDate - Başlanğıc tarix
 * @param {string} params.endDate - Son tarix
 * @returns {Promise<Array>} - Mövcud görüntülər
 */
export async function searchAvailableImages({ bbox, startDate, endDate }) {
  const token = await getAccessToken();
  
  if (!token) {
    return generateDemoImageList(startDate, endDate);
  }

  const [west, south, east, north] = bbox;

  try {
    const response = await axios.post(SENTINEL_CATALOG_URL, {
      bbox: [west, south, east, north],
      datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
      collections: ["sentinel-2-l2a"],
      limit: 20,
      filter: {
        op: "<=",
        args: [{ property: "eo:cloud_cover" }, 30]
      }
    }, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    return response.data.features.map(f => ({
      id: f.id,
      date: f.properties.datetime.split("T")[0],
      cloudCover: f.properties["eo:cloud_cover"],
      satellite: f.properties["platform"]
    }));

  } catch (error) {
    console.error("Sentinel catalog xətası:", error.message);
    return generateDemoImageList(startDate, endDate);
  }
}

/**
 * Demo görüntü qaytarmaq
 */
function getDemoImage(type) {
  // Placeholder görüntü (1x1 pixel) - real layihədə daha böyük olacaq
  const colors = {
    truecolor: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    nbr: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
    dnbr: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
    ndvi: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAElAI/dN5mLwAAAABJRU5ErkJggg=="
  };
  return `data:image/png;base64,${colors[type] || colors.truecolor}`;
}

/**
 * Demo görüntü siyahısı
 */
function generateDemoImageList(startDate, endDate) {
  const images = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 5)) {
    images.push({
      id: `S2A_${d.toISOString().split("T")[0].replace(/-/g, "")}`,
      date: d.toISOString().split("T")[0],
      cloudCover: Math.floor(Math.random() * 25),
      satellite: Math.random() > 0.5 ? "Sentinel-2A" : "Sentinel-2B",
      isDemo: true
    });
  }
  
  return images;
}

/**
 * Before/After görüntü cütü əldə etmək
 * @param {Object} params
 * @param {Array} params.bbox - Bounding box
 * @param {string} params.preDate - Yanğından əvvəlki tarix
 * @param {string} params.postDate - Yanğından sonrakı tarix
 * @returns {Promise<Object>} - {preImage, postImage}
 */
export async function getBeforeAfterImages({ bbox, preDate, postDate }) {
  const [preImage, postImage] = await Promise.all([
    getSentinelImage({ bbox, date: preDate, type: "truecolor" }),
    getSentinelImage({ bbox, date: postDate, type: "truecolor" })
  ]);

  const [preNBR, postNBR] = await Promise.all([
    getSentinelImage({ bbox, date: preDate, type: "nbr" }),
    getSentinelImage({ bbox, date: postDate, type: "nbr" })
  ]);

  return {
    preImage,
    postImage,
    preNBR,
    postNBR,
    preDate,
    postDate
  };
}

export default {
  getSentinelImage,
  searchAvailableImages,
  getBeforeAfterImages,
  getAccessToken
};
