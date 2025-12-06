/**
 * Sentinel Hub API Service
 * Peyk görüntüləri və NBR/dNBR hesablamaları üçün
 * API Docs: https://docs.sentinel-hub.com/api/latest/
 * 
 * Qeyd: Bütün API sorğuları server-side route-lar vasitəsilə edilir (CORS fix)
 */

import axios from "axios";

/**
 * Sentinel-2 görüntüsü əldə etmək - Server-side API route vasitəsilə
 * @param {Object} params - Parametrlər
 * @param {Array} params.bbox - [west, south, east, north]
 * @param {string} params.date - Tarix (YYYY-MM-DD)
 * @param {string} params.type - "truecolor" | "nbr" | "ndvi"
 * @param {number} params.width - Şəkil eni (px)
 * @param {number} params.height - Şəkil hündürlüyü (px)
 * @returns {Promise<string>} - Base64 encoded image
 */
export async function getSentinelImage({ bbox, date, type = "truecolor", width = 512, height = 512 }) {
  try {
    console.log(`Sentinel görüntü sorğusu: ${date}, ${type}`);
    
    // Server-side API route istifadə et (CORS fix)
    const response = await axios.post("/api/sentinel/image", {
      bbox,
      date,
      type,
      width,
      height
    });

    if (response.data.error) {
      console.warn("Sentinel görüntü xətası:", response.data.error);
      return getDemoImage(type);
    }

    console.log(`Sentinel görüntü alındı: ${date}`);
    return response.data.image;

  } catch (error) {
    console.error("Sentinel görüntü xətası:", error.message);
    return getDemoImage(type);
  }
}

/**
 * Mövcud görüntüləri axtarmaq - Server-side API route vasitəsilə
 * @param {Object} params
 * @param {Array} params.bbox - Bounding box
 * @param {string} params.startDate - Başlanğıc tarix
 * @param {string} params.endDate - Son tarix
 * @returns {Promise<Array>} - Mövcud görüntülər
 */
export async function searchAvailableImages({ bbox, startDate, endDate }) {
  try {
    console.log(`Sentinel axtarış: ${startDate} - ${endDate}`);
    
    const response = await axios.post("/api/sentinel/search", {
      bbox,
      startDate,
      endDate
    });

    if (response.data.error) {
      console.warn("Sentinel axtarış xətası:", response.data.error);
      return generateDemoImageList(startDate, endDate);
    }

    const images = response.data.images || [];
    console.log(`${images.length} görüntü tapıldı`);
    
    return images.length > 0 ? images : generateDemoImageList(startDate, endDate);

  } catch (error) {
    console.error("Sentinel catalog xətası:", error.message);
    return generateDemoImageList(startDate, endDate);
  }
}

/**
 * Demo görüntü qaytarmaq - real peyk görüntüsü əvəzinə placeholder
 */
function getDemoImage(type) {
  // Unsplash-dan real peyk görüntüləri (demo üçün)
  const demoImages = {
    truecolor: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=512&h=512&fit=crop",
    nbr: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=512&h=512&fit=crop",
    dnbr: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=512&h=512&fit=crop",
    ndvi: "https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=512&h=512&fit=crop"
  };
  return demoImages[type] || demoImages.truecolor;
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

const SentinelService = {
  getSentinelImage,
  searchAvailableImages,
  getBeforeAfterImages
};

export default SentinelService;
