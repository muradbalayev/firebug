/**
 * ML Prediction Service
 * FastAPI backend ilə əlaqə - yanğın detection və risk prediction
 */

const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:8000";

/**
 * API health check
 */
export async function checkMLApiHealth() {
  try {
    const response = await fetch(`${ML_API_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!response.ok) throw new Error("API not available");
    return await response.json();
  } catch (error) {
    console.warn("ML API not available:", error.message);
    return { status: "offline", model_loaded: false, roboflow_ready: false };
  }
}

/**
 * Sensor datasından yanğın riski proqnozu
 * @param {Object} sensorData - Sensor oxunuşları
 * @returns {Promise<Object>} - Risk nəticəsi
 */
export async function predictFromSensor(sensorData) {
  try {
    const response = await fetch(`${ML_API_URL}/predict/sensor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sensorData)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Sensor prediction error:", error);
    // Demo fallback
    return {
      risk_percent: Math.random() * 100,
      is_alert: Math.random() > 0.7,
      threshold: 0.7,
      sensor_data: sensorData,
      is_demo: true
    };
  }
}

/**
 * Simulyasiya edilmiş sensor oxunuşu (dataset-dən)
 * Polling üçün - hər 20 saniyədə çağırılmalıdır
 * @returns {Promise<Object>} - Sensor data + risk
 */
export async function getSimulatedSensorReading() {
  try {
    const response = await fetch(`${ML_API_URL}/simulate/sensor`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Sensor simulation error:", error);
    // Demo fallback
    return {
      sensor_data: {
        temp_c: 35 + Math.random() * 15,
        humidity_pct: 20 + Math.random() * 40,
        wind_speed_ms: Math.random() * 15,
        wind_dir_deg: Math.random() * 360,
        co2_ppm: 400 + Math.random() * 600,
        lat: 40.0 + Math.random() * 0.5,
        lon: 47.0 + Math.random() * 0.5,
        region: "Demo Region",
        datetime: new Date().toISOString()
      },
      risk_percent: 30 + Math.random() * 60,
      is_alert: Math.random() > 0.6,
      row_index: -1,
      is_demo: true
    };
  }
}

/**
 * Şəkildən yanğın detection (File upload)
 * @param {File} imageFile - Şəkil faylı
 * @returns {Promise<Object>} - Detection nəticəsi
 */
export async function detectFireFromImage(imageFile) {
  try {
    const formData = new FormData();
    formData.append("file", imageFile);
    
    const response = await fetch(`${ML_API_URL}/predict/image`, {
      method: "POST",
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Image detection error:", error);
    // Demo fallback
    return {
      fire_detected: true,
      detection_count: 1,
      detections: [{
        class: "fire",
        confidence: 0.87,
        x: 200,
        y: 150,
        width: 100,
        height: 80
      }],
      is_demo: true
    };
  }
}

/**
 * Base64 şəkildən yanğın detection
 * @param {string} base64Image - Base64 encoded şəkil
 * @returns {Promise<Object>} - Detection nəticəsi
 */
export async function detectFireFromBase64(base64Image) {
  try {
    console.log("Sending image to ML API...", ML_API_URL);
    
    const response = await fetch(`${ML_API_URL}/predict/image/base64`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image })
    });
    
    console.log("ML API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("ML API error response:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log("ML API result:", result);
    
    // Ensure is_demo is not set if API responded successfully
    return { ...result, is_demo: false };
  } catch (error) {
    console.error("Base64 detection error:", error);
    // Demo fallback
    return {
      fire_detected: true,
      detection_count: 1,
      detections: [{
        class: "fire",
        confidence: 0.92,
        x: 250,
        y: 180,
        width: 120,
        height: 90
      }],
      image_with_boxes: base64Image,
      is_demo: true,
      error_message: error.message
    };
  }
}

/**
 * URL-dən şəkil yükləyib detection
 * @param {string} imageUrl - Şəkil URL-i
 * @returns {Promise<Object>} - Detection nəticəsi
 */
export async function detectFireFromUrl(imageUrl) {
  try {
    // Fetch image and convert to base64
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const result = await detectFireFromBase64(reader.result);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("URL detection error:", error);
    return {
      fire_detected: false,
      detection_count: 0,
      detections: [],
      error: error.message,
      is_demo: true
    };
  }
}

// Export all functions
const MLPredictionService = {
  checkMLApiHealth,
  predictFromSensor,
  getSimulatedSensorReading,
  detectFireFromImage,
  detectFireFromBase64,
  detectFireFromUrl
};

export default MLPredictionService;
