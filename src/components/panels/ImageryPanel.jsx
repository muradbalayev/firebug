"use client";

import { useState, useCallback, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore";
import { getBeforeAfterImages, searchAvailableImages } from "@/services/sentinel.service";
import { detectFireFromBase64 } from "@/services/mlPrediction.service";
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from "@/components/ui";
import { getBoundingBox, formatDate } from "@/lib/utils";
import { 
  Satellite, 
  Calendar, 
  Image as ImageIcon,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Flame,
  Scan,
  TestTube,
  CheckCircle,
  XCircle,
  X,
  ZoomIn,
  Maximize2
} from "lucide-react";
import Image from "next/image";
import firedemo from "@/assets/firedemo.webp";

/**
 * ImageryPanel Component
 * Sentinel-2 satellite imagery with Before/After comparison slider
 * + ML Fire Detection integration
 */
export default function ImageryPanel() {
  const { 
    aoi, 
    preFireDate, 
    postFireDate,
    preFireImage,
    postFireImage,
    sentinelLoading,
    setPreFireDate,
    setPostFireDate,
    setSentinelLoading,
    setSentinelImages
  } = useMapStore();

  const [availableImages, setAvailableImages] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  
  // ML Detection state
  const [mlDetecting, setMlDetecting] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const [testImageLoaded, setTestImageLoaded] = useState(false);
  const [detectedImage, setDetectedImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Close lightbox on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    if (lightboxOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [lightboxOpen]);

  // Default dates
  const today = new Date();
  const defaultPreDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split("T")[0];
  const defaultPostDate = new Date().toISOString().split("T")[0];

  // Search available images
  const searchImages = useCallback(async () => {
    if (!aoi) return;

    setSearchLoading(true);
    try {
      const bbox = getBoundingBox(aoi);
      const images = await searchAvailableImages({
        bbox,
        startDate: preFireDate || defaultPreDate,
        endDate: postFireDate || defaultPostDate
      });
      setAvailableImages(images);
    } catch (error) {
      console.error("Image search error:", error);
    } finally {
      setSearchLoading(false);
    }
  }, [aoi, preFireDate, postFireDate, defaultPreDate, defaultPostDate]);

  // Fetch satellite images
  const fetchImages = useCallback(async () => {
    if (!aoi || !preFireDate || !postFireDate) return;

    setSentinelLoading(true);
    try {
      const bbox = getBoundingBox(aoi);
      const images = await getBeforeAfterImages({
        bbox,
        preDate: preFireDate,
        postDate: postFireDate
      });
      setSentinelImages({
        preImage: images.preImage,
        postImage: images.postImage
      });
    } catch (error) {
      console.error("Image fetch error:", error);
    }
  }, [aoi, preFireDate, postFireDate, setSentinelLoading, setSentinelImages]);

  // Load test image and run ML detection
  const runTestDetection = useCallback(async () => {
    setMlDetecting(true);
    setMlResult(null);
    setTestImageLoaded(true);
    
    try {
      // Convert imported image to base64
      const response = await fetch(firedemo.src);
      const blob = await response.blob();
      
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      
      // Send to ML API
      const result = await detectFireFromBase64(base64);
      setMlResult(result);
      
      if (result.image_with_boxes) {
        setDetectedImage(result.image_with_boxes);
      }
    } catch (error) {
      console.error("ML Detection error:", error);
      setMlResult({ error: error.message, fire_detected: false });
    } finally {
      setMlDetecting(false);
    }
  }, []);

  // Run detection on satellite image
  const detectOnSatelliteImage = useCallback(async (imageUrl) => {
    if (!imageUrl) return;
    
    setMlDetecting(true);
    setMlResult(null);
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      
      const result = await detectFireFromBase64(base64);
      setMlResult(result);
      
      if (result.image_with_boxes) {
        setDetectedImage(result.image_with_boxes);
      }
    } catch (error) {
      console.error("Satellite detection error:", error);
      setMlResult({ error: error.message, fire_detected: false });
    } finally {
      setMlDetecting(false);
    }
  }, []);

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <Satellite className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Satellite Imagery
          </h2>
          <p className="text-sm text-gray-500">Sentinel-2 Before/After Analysis</p>
        </div>
      </div>

      {/* AOI Warning */}
      {!aoi && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Please draw an Area of Interest (AOI) on the map first.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="date"
            label="Pre-fire Date"
            value={preFireDate || ""}
            onChange={(e) => setPreFireDate(e.target.value)}
            max={postFireDate || defaultPostDate}
          />
          <Input
            type="date"
            label="Post-fire Date"
            value={postFireDate || ""}
            onChange={(e) => setPostFireDate(e.target.value)}
            min={preFireDate || ""}
            max={defaultPostDate}
          />
          
          <Button
            variant="secondary"
            size="sm"
            onClick={searchImages}
            loading={searchLoading}
            disabled={!aoi}
            className="w-full"
          >
            Search Available Images
          </Button>
        </CardContent>
      </Card>

      {/* Available Images */}
      {availableImages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Available Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {availableImages.map((img, idx) => (
                <div 
                  key={img.id || idx}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                >
                  <span>{img.date}</span>
                  <span className="text-gray-500">{img.cloudCover}% cloud</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPreFireDate(img.date)}
                      className="px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Pre
                    </button>
                    <button
                      onClick={() => setPostFireDate(img.date)}
                      className="px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Post
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {availableImages[0]?.isDemo && (
              <p className="text-xs text-amber-600 mt-2">⚠️ Demo image list (API credentials required for real data)</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fetch Button */}
      <Button
        onClick={fetchImages}
        disabled={!aoi || !preFireDate || !postFireDate || sentinelLoading}
        loading={sentinelLoading}
        leftIcon={<ImageIcon className="w-4 h-4" />}
        className="w-full"
      >
        {sentinelLoading ? "Loading..." : "Fetch Imagery"}
      </Button>

      {/* Before/After Slider */}
      {(preFireImage || postFireImage) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Before / After Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden select-none">
              {/* Post Image (Background - right side) */}
              {postFireImage && (
                <Image
                width={1000}
                height={1000}
                  src={postFireImage} 
                  alt="Post-fire" 
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
              )}
              
              {/* Pre Image (Left side - with clip) */}
              {preFireImage && (
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ 
                    clipPath: `inset(0 ${100 - sliderValue}% 0 0)` 
                  }}
                >
                  <Image
                  width={1000}
                  height={1000}
                    src={preFireImage} 
                    alt="Pre-fire" 
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
              )}

              {/* Slider Handle */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-10"
                style={{ left: `${sliderValue}%`, transform: "translateX(-50%)" }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-300">
                  <ChevronLeft className="w-3 h-3 text-gray-600" />
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                </div>
              </div>

              {/* Labels */}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-medium">
                Before
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-medium">
                After
              </div>

              {/* Analyze After Image Button */}
              {postFireImage && (
                <button
                  onClick={() => detectOnSatelliteImage(postFireImage)}
                  disabled={mlDetecting}
                  className="absolute top-2 right-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-medium rounded-lg shadow-lg flex items-center gap-1.5 transition-colors"
                >
                  {mlDetecting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Scan className="w-3 h-3" />
                      🤖 Analyze with ML
                    </>
                  )}
                </button>
              )}
              
              {/* Loading indicator */}
              {(!preFireImage || !postFireImage) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                  <p className="text-white text-sm">
                    {!preFireImage && !postFireImage ? "Loading both images..." : 
                     !preFireImage ? "Loading pre-fire image..." : "Loading post-fire image..."}
                  </p>
                </div>
              )}
            </div>

            {/* Slider Input */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className="w-full mt-3"
            />

            {/* Date Info */}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{preFireDate || "Pre-fire"}</span>
              <span>{postFireDate || "Post-fire"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ML Fire Detection Section */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            🤖 ML Fire Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            Roboflow deep learning modeli ilə şəkillərdə yanğın aşkarlama
          </p>
          
          {/* Test Image Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={runTestDetection}
            loading={mlDetecting}
            leftIcon={<TestTube className="w-4 h-4" />}
            className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            {mlDetecting ? "Analyzing..." : "🔥 Test with Demo Fire Image"}
          </Button>

          {/* Analyzed Image Preview with Bounding Boxes */}
          {detectedImage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  🔍 ML Analysis Result:
                </p>
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <div 
                className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-orange-400 cursor-pointer group"
                onClick={() => setLightboxOpen(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detectedImage}
                  alt="ML Detection Result"
                  className="w-full h-full object-contain"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              {/* Detection Stats */}
              {mlResult && (
                <div className="flex items-center justify-between text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  <span className="text-gray-600 dark:text-gray-400">
                    Objects detected: <strong className="text-orange-600">{mlResult.detection_count || 0}</strong>
                  </span>
                  {mlResult.detections?.[0] && (
                    <span className="text-green-600 font-mono">
                      {(mlResult.detections[0].confidence * 100).toFixed(1)}% confidence
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {mlDetecting && (
            <div className="flex items-center justify-center gap-2 py-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="text-sm text-orange-600">Analyzing image with ML model...</span>
            </div>
          )}

          {mlResult?.is_demo && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              ⚠️ Demo mode - Connect ML API for real detection
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-3">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 <strong>Tip:</strong> NBR (Normalized Burn Ratio) is calculated using 
            B08 (NIR) and B12 (SWIR) bands. Higher dNBR values indicate more severe burn damage.
          </p>
        </CardContent>
      </Card>

      {/* Lightbox Modal */}
      {lightboxOpen && detectedImage && (
        <div 
          className="fixed inset-0 z-9999 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Modal Content */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh] bg-gray-900 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-linear-to-b from-black/70 to-transparent p-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-white font-semibold">🤖 ML Fire Detection Result</span>
                </div>
                {mlResult && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-white/80">
                      Objects: <strong className="text-orange-400">{mlResult.detection_count || 0}</strong>
                    </span>
                    {mlResult.detections?.[0] && (
                      <span className="text-green-400 font-mono">
                        {(mlResult.detections[0].confidence * 100).toFixed(1)}% confidence
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detectedImage}
              alt="ML Detection Result - Full Size"
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />

            {/* Footer with detections */}
            {mlResult?.detections && mlResult.detections.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-4">
                <div className="flex flex-wrap gap-2">
                  {mlResult.detections.map((det, idx) => (
                    <div 
                      key={idx}
                      className="px-3 py-1.5 bg-red-500/80 rounded-full text-white text-sm flex items-center gap-2"
                    >
                      <Flame className="w-4 h-4" />
                      <span>{det.class}</span>
                      <span className="font-mono bg-white/20 px-2 py-0.5 rounded">
                        {(det.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            Click anywhere or press ESC to close
          </p>
        </div>
      )}
    </div>
  );
}
