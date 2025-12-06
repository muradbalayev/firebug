"use client";

import { useState, useCallback, useRef } from "react";
import { useMapStore } from "@/store/useMapStore";
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from "@/components/ui";
import { 
  BarChart3, 
  Upload, 
  FileJson,
  AlertCircle,
  CheckCircle,
  Layers,
  PieChart
} from "lucide-react";

/**
 * AnalysisPanel Component
 * Burn polygon upload and analysis panel
 * Supports GeoJSON import from QGIS burn severity analysis
 */
export default function AnalysisPanel() {
  const { 
    burnPolygons,
    hotspots,
    setBurnPolygons,
    setBurnPolygonsLoading,
    calculateBurnConfidence
  } = useMapStore();

  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // GeoJSON file upload handler
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);
    setBurnPolygonsLoading(true);

    try {
      const text = await file.text();
      const geojson = JSON.parse(text);

      // Validation
      if (!geojson.type || !["FeatureCollection", "Feature"].includes(geojson.type)) {
        throw new Error("Invalid GeoJSON format");
      }

      // Convert to FeatureCollection
      const featureCollection = geojson.type === "Feature" 
        ? { type: "FeatureCollection", features: [geojson] }
        : geojson;

      // Add area calculations
      const processedFeatures = featureCollection.features.map((feature, idx) => ({
        ...feature,
        properties: {
          ...feature.properties,
          id: feature.properties?.id || `burn_${idx + 1}`,
          area_ha: feature.properties?.area_ha || calculateAreaHectares(feature.geometry),
          date: feature.properties?.date || new Date().toISOString().split("T")[0]
        }
      }));

      const processedCollection = {
        type: "FeatureCollection",
        features: processedFeatures,
        metadata: {
          uploadedAt: new Date().toISOString(),
          fileName: file.name,
          featureCount: processedFeatures.length
        }
      };

      setBurnPolygons(processedCollection);
      setUploadSuccess(true);

      // Calculate confidence with hotspots
      setTimeout(() => {
        calculateBurnConfidence();
      }, 100);

    } catch (error) {
      setUploadError(error.message || "Error loading file");
      setBurnPolygonsLoading(false);
    }
  }, [setBurnPolygons, setBurnPolygonsLoading, calculateBurnConfidence]);

  // Generate demo burn polygons
  const generateDemoPolygons = useCallback(() => {
    const { aoi } = useMapStore.getState();
    
    if (!aoi) {
      setUploadError("Please select an AOI first for demo polygons");
      return;
    }

    const bounds = getAOIBounds(aoi);
    const demoPolygons = generateRandomBurnPolygons(bounds, 5);
    
    setBurnPolygons(demoPolygons);
    setUploadSuccess(true);

    setTimeout(() => {
      calculateBurnConfidence();
    }, 100);
  }, [setBurnPolygons, calculateBurnConfidence]);

  // Statistics
  const stats = burnPolygons ? calculateBurnStats(burnPolygons) : null;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Burn Analysis
          </h2>
          <p className="text-sm text-gray-500">Burn polygon analysis & statistics</p>
        </div>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload GeoJSON
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            Upload burn polygon GeoJSON exported from QGIS or other GIS software.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.geojson"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<FileJson className="w-4 h-4" />}
              className="flex-1"
            >
              Select File
            </Button>
            <Button
              variant="secondary"
              onClick={generateDemoPolygons}
              className="flex-1"
            >
              Demo Data
            </Button>
          </div>

          {/* Upload Status */}
          {uploadError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Polygons loaded successfully!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{stats.totalArea.toFixed(1)}</p>
                <p className="text-xs text-gray-500">Total Area (ha)</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{stats.polygonCount}</p>
                <p className="text-xs text-gray-500">Polygon Count</p>
              </div>
            </div>

            {/* Confidence Distribution */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Confidence Distribution</p>
              <div className="space-y-2">
                <ConfidenceBar label="HIGH" count={stats.highConfidence} total={stats.polygonCount} color="bg-red-500" />
                <ConfidenceBar label="MEDIUM" count={stats.mediumConfidence} total={stats.polygonCount} color="bg-amber-500" />
                <ConfidenceBar label="LOW" count={stats.lowConfidence} total={stats.polygonCount} color="bg-green-500" />
              </div>
            </div>

            {/* Largest Polygons */}
            {stats.largestPolygons.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Largest Burn Areas</p>
                <div className="space-y-1">
                  {stats.largestPolygons.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-gray-700 dark:text-gray-300">{p.id}</span>
                      <span className="font-medium">{p.area.toFixed(2)} ha</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* QGIS Instructions */}
      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="py-3">
          <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
            📝 QGIS Workflow:
          </p>
          <ol className="text-xs text-purple-600 dark:text-purple-400 space-y-1 list-decimal list-inside">
            <li>Open pre/post Sentinel rasters in QGIS</li>
            <li>Calculate NBR: (B08-B12)/(B08+B12)</li>
            <li>Compute dNBR = NBR_pre - NBR_post</li>
            <li>Apply threshold dNBR &gt; 0.1</li>
            <li>Polygonize the result</li>
            <li>Export as GeoJSON</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Confidence Bar Component
 */
function ConfidenceBar({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-16 text-gray-500">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{count}</span>
    </div>
  );
}

// Helper functions
function calculateAreaHectares(geometry) {
  // Simple area calculation (approximate)
  if (geometry.type !== "Polygon") return 0;
  
  const coords = geometry.coordinates[0];
  let area = 0;
  
  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1];
    area -= coords[i + 1][0] * coords[i][1];
  }
  
  area = Math.abs(area) / 2;
  // Convert from degrees to approximate hectares (rough estimation)
  return area * 111319.9 * 111319.9 * Math.cos(coords[0][1] * Math.PI / 180) / 10000;
}

function calculateBurnStats(burnPolygons) {
  const features = burnPolygons?.features || [];
  
  const stats = {
    totalArea: 0,
    polygonCount: features.length,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    largestPolygons: []
  };

  const areas = [];

  features.forEach(f => {
    const area = f.properties?.area_ha || 0;
    stats.totalArea += area;
    
    const conf = (f.properties?.confidence || "LOW").toUpperCase();
    if (conf === "HIGH") stats.highConfidence++;
    else if (conf === "MEDIUM") stats.mediumConfidence++;
    else stats.lowConfidence++;

    areas.push({
      id: f.properties?.id || "Unknown",
      area
    });
  });

  stats.largestPolygons = areas
    .sort((a, b) => b.area - a.area)
    .slice(0, 3);

  return stats;
}

function getAOIBounds(aoi) {
  const coords = aoi.geometry?.coordinates?.[0] || aoi.coordinates?.[0] || [];
  if (coords.length === 0) return null;

  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  coords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return { minLng, maxLng, minLat, maxLat };
}

function generateRandomBurnPolygons(bounds, count) {
  if (!bounds) return { type: "FeatureCollection", features: [] };

  const features = [];
  const { minLng, maxLng, minLat, maxLat } = bounds;

  for (let i = 0; i < count; i++) {
    const centerLng = minLng + Math.random() * (maxLng - minLng);
    const centerLat = minLat + Math.random() * (maxLat - minLat);
    const size = 0.005 + Math.random() * 0.015;

    const polygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [centerLng - size, centerLat - size],
          [centerLng + size, centerLat - size],
          [centerLng + size, centerLat + size],
          [centerLng - size, centerLat + size],
          [centerLng - size, centerLat - size]
        ]]
      },
      properties: {
        id: `burn_${i + 1}`,
        area_ha: Math.random() * 50 + 5,
        date: new Date().toISOString().split("T")[0],
        dnbr_mean: 0.1 + Math.random() * 0.4
      }
    };

    features.push(polygon);
  }

  return {
    type: "FeatureCollection",
    features,
    metadata: {
      isDemo: true,
      generatedAt: new Date().toISOString()
    }
  };
}
