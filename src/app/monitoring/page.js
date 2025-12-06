"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { 
  AlertTriangle, 
  MapPin, 
  Flame, 
  Wind, 
  ThermometerSun,
  Droplets,
  Volume2,
  VolumeX,
  RefreshCw,
  Radio,
  Globe,
  Clock,
  X,
  Navigation,
  Loader2,
  CheckCircle,
  Bell,
  Image as ImageIcon,
  Scan,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Maximize2,
  Upload,
  FileImage,
  Send
} from "lucide-react";
import { getHotspots } from "@/services/firms.service";
import { getWindData } from "@/services/fireSpread.service";
import { detectFireFromBase64 } from "@/services/mlPrediction.service";
import { sendFireAlertTelegram, sendTestMessage, sendIndividualFireAlert } from "@/services/telegram.service";
import { getLocationString } from "@/services/geocoding.service";
import Image from "next/image";
import firedemo from "@/app/assets/firedemo.webp";

// Dynamic import for map (no SSR)
const MonitoringMap = dynamic(() => import("@/components/monitoring/MonitoringMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  )
});

// Azerbaijan bounding box
const COUNTRIES = {
  azerbaijan: {
    name: "Azerbaijan",
    flag: "🇦🇿",
    bbox: [44.7, 38.4, 50.6, 41.9], // [minLon, minLat, maxLon, maxLat]
    center: [47.5, 40.4],
    zoom: 7
  }
};

const POLLING_INTERVAL = 20000; // 20 seconds

export default function MonitoringPage() {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [hotspots, setHotspots] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [windData, setWindData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeAlert, setActiveAlert] = useState(null);
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0 });
  
  // Imagery Modal state
  const [imageryModalOpen, setImageryModalOpen] = useState(false);
  const [currentHotspotIndex, setCurrentHotspotIndex] = useState(0);
  const [hotspotImages, setHotspotImages] = useState([]); // Array of {hotspot, imageUrl, mlResult, detectedImage}
  
  // ML Detection state
  const [mlDetecting, setMlDetecting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  
  // File upload test state
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedResult, setUploadedResult] = useState(null);
  const fileInputRef = useRef(null);
  
  // Telegram notification state
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramSending, setTelegramSending] = useState(false);
  
  // Track alerted fires to avoid duplicates
  const alertedFiresRef = useRef(new Set());
  
  const pollingRef = useRef(null);
  const speechRef = useRef(null);

  // Text-to-Speech function
  const speak = useCallback((text) => {
    if (!soundEnabled) return;
    
    // Cancel any ongoing speech
    if (speechRef.current) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to get a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Female")) 
      || voices.find(v => v.lang.startsWith("en"));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [soundEnabled]);

  // Calculate fire spread direction based on wind
  const getSpreadDirection = useCallback((windDirection) => {
    const directions = [
      { min: 337.5, max: 360, name: "South" },
      { min: 0, max: 22.5, name: "South" },
      { min: 22.5, max: 67.5, name: "Southwest" },
      { min: 67.5, max: 112.5, name: "West" },
      { min: 112.5, max: 157.5, name: "Northwest" },
      { min: 157.5, max: 202.5, name: "North" },
      { min: 202.5, max: 247.5, name: "Northeast" },
      { min: 247.5, max: 292.5, name: "East" },
      { min: 292.5, max: 337.5, name: "Southeast" }
    ];
    
    for (const dir of directions) {
      if (windDirection >= dir.min && windDirection < dir.max) {
        return dir.name;
      }
    }
    return "unknown direction";
  }, []);

  // Fetch hotspots and check for fires
  const fetchAndAnalyze = useCallback(async () => {
    if (!selectedCountry) return;

    setLoading(true);
    const country = COUNTRIES[selectedCountry];

    try {
      // Fetch hotspots using bbox directly
      const hotspotsData = await getHotspots({
        bbox: country.bbox, // [minLon, minLat, maxLon, maxLat]
        source: "VIIRS_SNPP_NRT",
        dayRange: 1
      });
      const features = hotspotsData?.features || [];
      setHotspots(features);

      // Calculate stats
      const high = features.filter(f => f.properties?.frp > 50).length;
      const medium = features.filter(f => f.properties?.frp > 20 && f.properties?.frp <= 50).length;
      const low = features.filter(f => f.properties?.frp <= 20).length;
      setStats({ total: features.length, high, medium, low });

      // Fetch wind data for center
      const wind = await getWindData(country.center[1], country.center[0]);
      setWindData(wind);

      setLastUpdate(new Date());

      // Check for NEW fires only - avoid duplicate alerts
      if (features.length > 0) {
        const allFires = features.filter(f => f.properties?.frp > 0);
        
        // Create unique ID for each fire based on coordinates (rounded to avoid float issues)
        const getFireId = (fire) => {
          const coords = fire.geometry?.coordinates || [0, 0];
          return `${coords[0].toFixed(3)}_${coords[1].toFixed(3)}`;
        };
        
        // Filter only NEW fires that haven't been alerted yet
        const newFires = allFires.filter(fire => {
          const fireId = getFireId(fire);
          if (alertedFiresRef.current.has(fireId)) {
            return false; // Already alerted
          }
          alertedFiresRef.current.add(fireId); // Mark as alerted
          return true;
        });
        
        if (newFires.length > 0) {
          const spreadDirection = wind?.direction ? getSpreadDirection(wind.direction) : "Northeast";
          const windSpeed = Math.round(wind?.speed || 15); // Default 15 km/h if no data
          
          // Process each NEW fire individually
          const fireIncidents = newFires.map((fire, index) => {
            const coords = fire.geometry?.coordinates || [0, 0];
            const lat = coords[1];
            const lon = coords[0];
            const location = getLocationString(lat, lon);
            
            return {
              id: Date.now() + index,
              lat,
              lon,
              location,
              frp: fire.properties?.frp?.toFixed(1) || "N/A",
              brightness: fire.properties?.bright_ti4?.toFixed(0) || "N/A",
              spreadDirection,
              windSpeed,
              timestamp: new Date()
            };
          });

          // Create summary alert for modal
          const summaryAlert = {
            id: Date.now(),
            timestamp: new Date(),
            count: newFires.length,
            spreadDirection,
            windSpeed,
            hotspots: newFires.slice(0, 5),
            incidents: fireIncidents
          };

          setAlerts(prev => [summaryAlert, ...prev.slice(0, 9)]);
          setActiveAlert(summaryAlert);

          // Speak each fire alert sequentially
          const speakFireAlerts = async () => {
            for (let i = 0; i < Math.min(fireIncidents.length, 5); i++) {
              const fire = fireIncidents[i];
              const alertText = `Fire incident ${i + 1} of ${fireIncidents.length}. ` +
                `Location: ${fire.location}. ` +
                `Fire power: ${fire.frp} megawatts. ` +
                `Spreading ${fire.spreadDirection} at ${fire.windSpeed} kilometers per hour.`;
              
              speak(alertText);
              
              // Wait for speech to finish before next (approximate)
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          };
          speakFireAlerts();

          // Send individual Telegram alerts if enabled
          if (telegramEnabled) {
            const sendTelegramAlerts = async () => {
              for (let i = 0; i < fireIncidents.length; i++) {
                await sendIndividualFireAlert(fireIncidents[i], i + 1, fireIncidents.length);
                // Small delay between messages to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            };
            sendTelegramAlerts();
          }
        }
      }

    } catch (error) {
      console.error("Monitoring error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, speak, getSpreadDirection, telegramEnabled]);

  // Start/Stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      // Stop
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsMonitoring(false);
    } else {
      // Start
      setIsMonitoring(true);
      fetchAndAnalyze(); // Initial fetch
      pollingRef.current = setInterval(fetchAndAnalyze, POLLING_INTERVAL);
    }
  }, [isMonitoring, fetchAndAnalyze]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Select country
  const handleCountrySelect = (countryKey) => {
    setSelectedCountry(countryKey);
    setHotspots([]);
    setAlerts([]);
    setStats({ total: 0, high: 0, medium: 0, low: 0 });
    // Clear alerted fires when changing country
    alertedFiresRef.current.clear();
  };

  // Generate satellite image URL for a hotspot
  const getHotspotImageUrl = useCallback((hotspot, zoom = 15) => {
    const [lon, lat] = hotspot.geometry?.coordinates || [47.5, 40.4];
    const tileX = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    const tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;
  }, []);

  // Open imagery modal with all hotspots
  const openImageryModal = useCallback(() => {
    if (hotspots.length === 0) return;
    
    // Create image data for all hotspots
    const images = hotspots.map(hotspot => ({
      hotspot,
      imageUrl: getHotspotImageUrl(hotspot),
      mlResult: null,
      detectedImage: null,
      mlAnalyzed: false
    }));
    
    setHotspotImages(images);
    setCurrentHotspotIndex(0);
    setImageryModalOpen(true);
  }, [hotspots, getHotspotImageUrl]);

  // Navigate to next/previous hotspot
  const goToNextHotspot = useCallback(() => {
    setCurrentHotspotIndex(prev => 
      prev < hotspotImages.length - 1 ? prev + 1 : 0
    );
  }, [hotspotImages.length]);

  const goToPrevHotspot = useCallback(() => {
    setCurrentHotspotIndex(prev => 
      prev > 0 ? prev - 1 : hotspotImages.length - 1
    );
  }, [hotspotImages.length]);

  // Convert image URL to base64 using canvas (bypasses CORS for same-origin)
  const imageUrlToBase64 = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 256;
        canvas.height = img.height || 256;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          resolve(base64);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  // Run ML detection on current hotspot image
  const runMLDetection = useCallback(async (index) => {
    if (mlDetecting) return;
    
    setMlDetecting(true);
    
    try {
      const imageUrl = hotspotImages[index]?.imageUrl;
      let base64;
      
      try {
        // Try to convert satellite image to base64
        base64 = await imageUrlToBase64(imageUrl);
      } catch (corsError) {
        console.warn("CORS error, using demo image:", corsError);
        // Fallback to demo image if CORS fails
        const response = await fetch(firedemo.src);
        const blob = await response.blob();
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      
      // Send to ML API
      const result = await detectFireFromBase64(base64);
      
      // Update the specific hotspot image with ML result
      setHotspotImages(prev => prev.map((item, i) => 
        i === index 
          ? { 
              ...item, 
              mlResult: result, 
              detectedImage: result.image_with_boxes || null,
              mlAnalyzed: true 
            }
          : item
      ));
    } catch (error) {
      console.error("ML Detection error:", error);
      setHotspotImages(prev => prev.map((item, i) => 
        i === index 
          ? { ...item, mlResult: { error: error.message, is_demo: true }, mlAnalyzed: true }
          : item
      ));
    } finally {
      setMlDetecting(false);
    }
  }, [mlDetecting, hotspotImages, imageUrlToBase64]);

  // Handle file upload for ML testing
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setMlDetecting(true);
    setUploadedResult(null);
    
    try {
      // Convert file to base64
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      
      setUploadedImage(base64);
      
      // Send to ML API
      const result = await detectFireFromBase64(base64);
      setUploadedResult(result);
      
      if (result.image_with_boxes) {
        setUploadedImage(result.image_with_boxes);
      }
    } catch (error) {
      console.error("File upload ML error:", error);
      setUploadedResult({ error: error.message, fire_detected: false });
    } finally {
      setMlDetecting(false);
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Radio className="w-6 h-6 text-orange-500" />
              <h1 className="text-xl font-bold text-white"> FireBug Live Monitoring</h1>
            </div>
            {selectedCountry && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg">
                <span className="text-2xl">{COUNTRIES[selectedCountry].flag}</span>
                <span className="text-white font-medium">{COUNTRIES[selectedCountry].name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"
              }`}
              title={soundEnabled ? "Sound On" : "Sound Off"}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Last Update */}
            {lastUpdate && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>Last: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}

            {/* Back to Dashboard */}
            <Link
              href="/"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
          {/* Country Selection */}
          {!selectedCountry ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Select Country
              </h2>
              <div className="space-y-2">
                {Object.entries(COUNTRIES).map(([key, country]) => (
                  <button
                    key={key}
                    onClick={() => handleCountrySelect(key)}
                    className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center gap-3 transition-colors"
                  >
                    <span className="text-3xl">{country.flag}</span>
                    <span className="text-white font-medium">{country.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Monitoring Controls */}
              <div className="p-4 border-b border-gray-800">
                <button
                  onClick={toggleMonitoring}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                    isMonitoring
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isMonitoring ? (
                    <>
                      <Radio className="w-5 h-5 animate-pulse" />
                      Stop Monitoring
                    </>
                  ) : (
                    <>
                      <Radio className="w-5 h-5" />
                      Start Monitoring
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Auto-refresh every 20 seconds
                </p>

                {/* Test Alert Button */}
                <button
                  onClick={async () => {
                    // Mock fire incidents for testing
                    const mockIncidents = [
                      { id: 1, lat: 40.4093, lon: 49.8671, location: "Near Baku", frp: "45.2", brightness: "320", spreadDirection: "Northeast", windSpeed: 25 },
                      { id: 2, lat: 40.6828, lon: 46.3606, location: "Near Ganja", frp: "38.7", brightness: "315", spreadDirection: "East", windSpeed: 18 },
                      { id: 3, lat: 41.1919, lon: 47.1706, location: "Near Shaki", frp: "52.1", brightness: "340", spreadDirection: "Southeast", windSpeed: 22 }
                    ];

                    const testAlert = {
                      id: Date.now(),
                      timestamp: new Date(),
                      count: 3,
                      spreadDirection: "Northeast",
                      windSpeed: 25,
                      hotspots: [],
                      incidents: mockIncidents
                    };
                    setAlerts(prev => [testAlert, ...prev.slice(0, 9)]);
                    setActiveAlert(testAlert);

                    // Speak each fire alert sequentially
                    const speakAlerts = async () => {
                      for (let i = 0; i < mockIncidents.length; i++) {
                        const fire = mockIncidents[i];
                        speak(`Fire incident ${i + 1} of ${mockIncidents.length}. Location: ${fire.location}. Fire power: ${fire.frp} megawatts. Spreading ${fire.spreadDirection} at ${fire.windSpeed} kilometers per hour.`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                      }
                    };
                    speakAlerts();
                    
                    // Send individual Telegram alerts if enabled
                    if (telegramEnabled) {
                      setTelegramSending(true);
                      for (let i = 0; i < mockIncidents.length; i++) {
                        await sendIndividualFireAlert(mockIncidents[i], i + 1, mockIncidents.length);
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                      setTelegramSending(false);
                    }
                  }}
                  disabled={telegramSending}
                  className="w-full mt-2 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {telegramSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "🧪 Test Alert (Demo)"
                  )}
                </button>

                {/* Telegram Toggle */}
                <div className="mt-3 flex items-center justify-between">
                  <label className="text-xs text-gray-400 flex items-center gap-1">
                    <Send className="w-3 h-3" />
                    Telegram Alert
                  </label>
                  <button
                    onClick={() => setTelegramEnabled(!telegramEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      telegramEnabled ? "bg-blue-600" : "bg-gray-700"
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      telegramEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>
                {telegramEnabled && (
                  <button
                    onClick={async () => {
                      setTelegramSending(true);
                      const result = await sendTestMessage();
                      setTelegramSending(false);
                      if (result.success) {
                        alert("✅ Telegram test mesajı göndərildi!");
                      } else {
                        alert("❌ Xəta: " + result.error);
                      }
                    }}
                    disabled={telegramSending}
                    className="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Test Telegram
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Fire Statistics</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-gray-400">Total Fires</p>
                  </div>
                  <div className="bg-red-900/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{stats.high}</p>
                    <p className="text-xs text-red-400">High Risk</p>
                  </div>
                  <div className="bg-orange-900/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500">{stats.medium}</p>
                    <p className="text-xs text-orange-400">Medium</p>
                  </div>
                  <div className="bg-yellow-900/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-500">{stats.low}</p>
                    <p className="text-xs text-yellow-400">Low</p>
                  </div>
                </div>
              </div>

              {/* View Imagery Button */}
              {hotspots.length > 0 && (
                <div className="p-4 border-b border-gray-800">
                  <button
                    onClick={openImageryModal}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <ImageIcon className="w-5 h-5" />
                    View Fire Locations ({hotspots.length})
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Satellite imagery + ML Analysis
                  </p>
                </div>
              )}

              {/* Wind Info */}
              {windData && (
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Wind Conditions</h3>
                  <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Wind className="w-4 h-4" /> Speed
                      </span>
                      <span className="text-white font-medium">{windData.speed} km/h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Navigation className="w-4 h-4" style={{ transform: `rotate(${windData.direction}deg)` }} /> Direction
                      </span>
                      <span className="text-white font-medium">{windData.direction}°</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Flame className="w-4 h-4" /> Spread
                      </span>
                      <span className="text-orange-400 font-medium">{getSpreadDirection(windData.direction)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Alerts */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Recent Alerts ({alerts.length})
                </h3>
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No alerts yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        onClick={() => setActiveAlert(alert)}
                        className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 cursor-pointer hover:bg-red-900/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-red-400 font-medium text-sm">
                            🔥 {alert.count} fire{alert.count > 1 ? 's' : ''}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {alert.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Spreading {alert.spreadDirection} • {Math.round(alert.windSpeed)} km/h
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Country */}
              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={() => {
                    if (isMonitoring) toggleMonitoring();
                    setSelectedCountry(null);
                  }}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Change Country
                </button>
              </div>
            </>
          )}
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          {selectedCountry ? (
            <MonitoringMap
              country={COUNTRIES[selectedCountry]}
              hotspots={hotspots}
              windData={windData}
            />
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <Globe className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">Select a country to start monitoring</p>
              </div>
            </div>
          )}

          {/* Monitoring Indicator */}
          {isMonitoring && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-green-600 rounded-full text-white text-sm font-medium shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Live Monitoring
            </div>
          )}
        </main>
      </div>

      {/* Alert Modal */}
      {activeAlert && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 9998 }}>
          <div className="bg-gray-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-red-600 animate-pulse-border" style={{ zIndex: 9999 }}>
            {/* Alert Header */}
            <div className="bg-red-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-white animate-bounce" />
                  <div>
                    <h2 className="text-xl font-bold text-white">🚨 FIRE ALERT</h2>
                    <p className="text-red-200 text-sm">{activeAlert.timestamp.toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveAlert(null)}
                  className="p-2 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Alert Content */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-5xl font-bold text-red-500 mb-2">{activeAlert.count}</p>
                <p className="text-gray-400">Active Fire{activeAlert.count > 1 ? 's' : ''} Detected</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <Navigation 
                    className="w-8 h-8 text-orange-500 mx-auto mb-2" 
                    style={{ transform: `rotate(${windData?.direction || 0}deg)` }}
                  />
                  <p className="text-white font-semibold">{activeAlert.spreadDirection}</p>
                  <p className="text-gray-500 text-sm">Spread Direction</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <Wind className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-white font-semibold">{Math.round(activeAlert.windSpeed)} km/h</p>
                  <p className="text-gray-500 text-sm">Wind Speed</p>
                </div>
              </div>

              <div className="bg-orange-900/30 border border-orange-700 rounded-xl p-4">
                <p className="text-orange-300 text-sm">
                  <strong>⚠️ Warning:</strong> Fire is spreading towards <strong>{activeAlert.spreadDirection}</strong>. 
                  Evacuate affected areas immediately and contact emergency services.
                </p>
              </div>

              {/* Replay Audio */}
              <button
                onClick={() => {
                  const text = `Fire Alert! ${activeAlert.count} active fires detected. ` +
                    `Fire is spreading towards ${activeAlert.spreadDirection} with wind speed of ${Math.round(activeAlert.windSpeed)} kilometers per hour.`;
                  speak(text);
                }}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Volume2 className="w-5 h-5" />
                Replay Audio Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fire Locations Imagery Modal */}
      {imageryModalOpen && hotspotImages.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-x-hidden overflow-y-auto shadow-2xl relative" style={{ zIndex: 10000 }}>
            {/* Modal Header */}
            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="w-6 h-6 text-orange-500" />
                <div>
                  <h2 className="text-lg font-bold text-white">🛰️ Fire Location Imagery</h2>
                  <p className="text-sm text-gray-400">
                    {currentHotspotIndex + 1} / {hotspotImages.length} locations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImageryModalOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Main Content */}
            <div className="p-6">
              {/* Current Hotspot Image with Navigation */}
              <div className="relative">
                {/* Left Arrow */}
                <button
                  onClick={goToPrevHotspot}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Right Arrow */}
                <button
                  onClick={goToNextHotspot}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Image Container */}
                <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden">
                  {/* Satellite Image or ML Result */}
                  {hotspotImages[currentHotspotIndex]?.detectedImage ? (
                    <img
                      src={hotspotImages[currentHotspotIndex].detectedImage}
                      alt="ML Detection Result"
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => {
                        setLightboxImage(hotspotImages[currentHotspotIndex].detectedImage);
                        setLightboxOpen(true);
                      }}
                    />
                  ) : (
                    <img
                      src={hotspotImages[currentHotspotIndex]?.imageUrl}
                      alt="Satellite view"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* ML Analyze Button Overlay */}
                  <button
                    onClick={() => runMLDetection(currentHotspotIndex)}
                    disabled={mlDetecting || hotspotImages[currentHotspotIndex]?.mlAnalyzed}
                    className={`absolute top-4 right-4 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg transition-all ${
                      hotspotImages[currentHotspotIndex]?.mlAnalyzed
                        ? "bg-green-600 text-white cursor-default"
                        : "bg-orange-500 hover:bg-orange-600 text-white"
                    }`}
                  >
                    {mlDetecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : hotspotImages[currentHotspotIndex]?.mlAnalyzed ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Analyzed
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4" />
                        🤖 Analyze with ML
                      </>
                    )}
                  </button>

                  {/* Location Badge */}
                  <div className="absolute bottom-4 left-4 px-3 py-2 bg-black/70 rounded-lg text-white text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span>
                        {hotspotImages[currentHotspotIndex]?.hotspot?.geometry?.coordinates?.[1]?.toFixed(4)}, 
                        {hotspotImages[currentHotspotIndex]?.hotspot?.geometry?.coordinates?.[0]?.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* ML Result Badge */}
                  {hotspotImages[currentHotspotIndex]?.mlResult && (
                    <div className={`absolute bottom-4 right-4 px-3 py-2 rounded-lg text-sm font-medium ${
                      hotspotImages[currentHotspotIndex].mlResult.fire_detected
                        ? "bg-red-600 text-white"
                        : "bg-green-600 text-white"
                    }`}>
                      {hotspotImages[currentHotspotIndex].mlResult.fire_detected 
                        ? `🔥 Fire Detected (${hotspotImages[currentHotspotIndex].mlResult.detection_count})`
                        : "✅ No Fire"}
                    </div>
                  )}
                </div>

                {/* Hotspot Details */}
                <div className="mt-4 grid grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">FRP</p>
                    <p className="text-lg font-bold text-orange-500">
                      {hotspotImages[currentHotspotIndex]?.hotspot?.properties?.frp?.toFixed(1) || "N/A"} MW
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">Brightness</p>
                    <p className="text-lg font-bold text-yellow-500">
                      {hotspotImages[currentHotspotIndex]?.hotspot?.properties?.bright_ti4?.toFixed(0) || "N/A"} K
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">Date</p>
                    <p className="text-sm font-medium text-white">
                      {hotspotImages[currentHotspotIndex]?.hotspot?.properties?.acq_date || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">Time</p>
                    <p className="text-sm font-medium text-white">
                      {hotspotImages[currentHotspotIndex]?.hotspot?.properties?.acq_time || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Thumbnail Navigation */}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                  {hotspotImages.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentHotspotIndex(index)}
                      className={`relative shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentHotspotIndex 
                          ? "border-orange-500 ring-2 ring-orange-500/50" 
                          : "border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      <img
                        src={item.detectedImage || item.imageUrl}
                        alt={`Fire ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {item.mlAnalyzed && (
                        <div className={`absolute inset-0 flex items-center justify-center ${
                          item.mlResult?.fire_detected ? "bg-red-500/30" : "bg-green-500/30"
                        }`}>
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-0.5">
                        #{index + 1}
                      </span>
                    </button>
                  ))}
                </div>

                {/* File Upload Test Section */}
                <div className="mt-6 p-4 bg-gray-800 rounded-xl border-2 border-dashed border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <FileImage className="w-4 h-4" />
                      🧪 Test ML Model with Custom Image
                    </h3>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={mlDetecting}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      {mlDetecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Image
                        </>
                      )}
                    </button>
                  </div>

                  {/* Uploaded Image Result */}
                  {uploadedImage && (
                    <div className="space-y-3">
                      <div 
                        className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => {
                          setLightboxImage(uploadedImage);
                          setLightboxOpen(true);
                        }}
                      >
                        <img
                          src={uploadedImage}
                          alt="Uploaded test image"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {uploadedResult && (
                        <div className={`p-3 rounded-lg ${
                          uploadedResult.fire_detected 
                            ? "bg-red-900/30 border border-red-700" 
                            : "bg-green-900/30 border border-green-700"
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={uploadedResult.fire_detected ? "text-red-400 font-medium" : "text-green-400 font-medium"}>
                              {uploadedResult.fire_detected 
                                ? `🔥 Fire Detected! (${uploadedResult.detection_count} objects)`
                                : "✅ No Fire Detected"}
                            </span>
                            {uploadedResult.detections?.[0] && (
                              <span className="text-gray-400 text-sm">
                                {(uploadedResult.detections[0].confidence * 100).toFixed(1)}% confidence
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {uploadedResult?.is_demo && (
                        <p className="text-xs text-amber-500">
                          ⚠️ Demo mode - ML API not connected
                        </p>
                      )}
                    </div>
                  )}

                  {!uploadedImage && (
                    <p className="text-xs text-gray-500 text-center">
                      Upload any image to test if ML model detects fire correctly
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ML Lightbox */}
      {lightboxOpen && lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4"
          style={{ zIndex: 10001 }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <img
            src={lightboxImage}
            alt="ML Detection - Full Size"
            className="max-w-[95vw] max-h-[95vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            Click anywhere to close
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgb(220, 38, 38); }
          50% { border-color: rgb(248, 113, 113); }
        }
        .animate-pulse-border {
          animation: pulse-border 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
