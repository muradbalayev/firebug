"use client";

import { useState, useCallback } from "react";
import { useMapStore } from "@/store/useMapStore";
import { getBeforeAfterImages, searchAvailableImages } from "@/services/sentinel.service";
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
  Loader2
} from "lucide-react";
/**
 * ImageryPanel Component
 * Sentinel-2 satellite imagery with Before/After comparison slider
 * Production-ready for government fire monitoring systems
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
                <img
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
                  <img
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

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-3">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 <strong>Tip:</strong> NBR (Normalized Burn Ratio) is calculated using 
            B08 (NIR) and B12 (SWIR) bands. Higher dNBR values indicate more severe burn damage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
