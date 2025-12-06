"use client";

import { useMapStore } from "@/store/useMapStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Map,
  Satellite,
  Mountain,
  X
} from "lucide-react";

const BASE_LAYERS = [
  { id: "osm", label: "OpenStreetMap", icon: Map },
  { id: "satellite", label: "Satellite", icon: Satellite },
  { id: "terrain", label: "Terrain", icon: Mountain }
];

const DATA_LAYERS = [
  { id: "hotspots", label: "Hotspotlar", color: "#ef4444" },
  { id: "burnPolygons", label: "Burn Polygonlar", color: "#a855f7" },
  { id: "route", label: "Marşrut", color: "#3b82f6" }
];

/**
 * LayerControl Component
 * Xəritə layer-lərinin idarəsi
 */
export default function LayerControl() {
  const { 
    baseLayer, 
    setBaseLayer, 
    visibleLayers, 
    toggleLayer,
    toggleLayerControl
  } = useMapStore();

  return (
    <div className="absolute top-16 right-4 z-1000">
      <Card className="w-56 shadow-lg">
        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layerlər
          </CardTitle>
          <button
            onClick={toggleLayerControl}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </CardHeader>
        <CardContent className="py-2 px-3 space-y-3">
          {/* Base Layers */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Baza xəritə</p>
            <div className="space-y-1">
              {BASE_LAYERS.map((layer) => {
                const Icon = layer.icon;
                return (
                  <button
                    key={layer.id}
                    onClick={() => setBaseLayer(layer.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
                      baseLayer === layer.id
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {layer.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Layers */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Data layerləri</p>
            <div className="space-y-1">
              {DATA_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {layer.label}
                    </span>
                  </div>
                  {visibleLayers[layer.id] ? (
                    <Eye className="w-4 h-4 text-green-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
