"use client";

import { useMapStore } from "@/store/useMapStore";
import { Button } from "@/components/ui";
import { 
  Layers, 
  Maximize2, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crosshair
} from "lucide-react";

/**
 * MapToolbar Component
 * Xəritə üzərindəki tool bar
 */
export default function MapToolbar() {
  const { 
    aoi,
    aoiBounds,
    showLayerControl,
    toggleLayerControl,
    setMapCenter,
    setMapZoom,
    resetAnalysis
  } = useMapStore();

  // Bakı-ya qayıt
  const goToDefault = () => {
    setMapCenter([40.4093, 49.8671]);
    setMapZoom(10);
  };

  // AOI-yə zoom
  const zoomToAOI = () => {
    if (aoiBounds) {
      // MapView-da BoundsUpdater bunu həll edir
      // Burada sadəcə trigger edirik
      useMapStore.setState({ aoiBounds: [...aoiBounds] });
    }
  };

  return (
    <div className="absolute top-4 left-20 z-1000 flex items-center gap-2">
      {/* Layer Control Toggle */}
      <Button
        variant={showLayerControl ? "primary" : "secondary"}
        size="sm"
        onClick={toggleLayerControl}
        className="shadow-lg"
      >
        <Layers className="w-4 h-4" />
      </Button>

      {/* Zoom to AOI */}
      {aoi && (
        <Button
          variant="secondary"
          size="sm"
          onClick={zoomToAOI}
          className="shadow-lg"
          title="AOI-yə zoom"
        >
          <Crosshair className="w-4 h-4" />
        </Button>
      )}

      {/* Reset to Default */}
      <Button
        variant="secondary"
        size="sm"
        onClick={goToDefault}
        className="shadow-lg"
        title="Default görünüşə qayıt"
      >
        <Maximize2 className="w-4 h-4" />
      </Button>

      {/* Reset Analysis */}
      <Button
        variant="ghost"
        size="sm"
        onClick={resetAnalysis}
        className="shadow-lg bg-white dark:bg-gray-800"
        title="Analizi sıfırla"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>

      {/* AOI Status */}
      {aoi && (
        <div className="px-3 py-1.5 bg-orange-400 dark:bg-orange-900/30 rounded-lg shadow-lg">
          <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
            AOI selected 
          </span>
        </div>
      )}
    </div>
  );
}
