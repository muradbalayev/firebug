"use client";

import { useState, useCallback } from "react";
import { useMapStore } from "@/store/useMapStore";
import { 
  getWindData, 
  predictFireSpread, 
  calculateSpreadStats, 
  windDirectionToText,
  calculateFireRisk 
} from "@/services/fireSpread.service";
import { Button, Card, CardHeader, CardTitle, CardContent, Select } from "@/components/ui";
import { 
  Wind, 
  Flame, 
  ArrowUp,
  Thermometer,
  Droplets,
  AlertTriangle,
  TrendingUp,
  Clock,
  MapPin,
  RefreshCw
} from "lucide-react";

/**
 * FireSpreadPanel Component
 * Yanğın yayılma istiqamətini proqnozlaşdırma
 */
export default function FireSpreadPanel() {
  const { 
    hotspots,
    aoi,
    windData,
    fireSpreadPrediction,
    fireSpreadLoading,
    setWindData,
    setFireSpreadPrediction,
    setFireSpreadLoading,
    clearFireSpread
  } = useMapStore();

  const [predictionHours, setPredictionHours] = useState(6);

  // AOI mərkəzini hesabla
  const getAOICenter = useCallback(() => {
    if (!aoi?.geometry?.coordinates) return null;
    
    const coords = aoi.geometry.coordinates[0];
    let sumLat = 0, sumLng = 0;
    coords.forEach(([lng, lat]) => {
      sumLat += lat;
      sumLng += lng;
    });
    
    return {
      lat: sumLat / coords.length,
      lng: sumLng / coords.length
    };
  }, [aoi]);

  // Külək məlumatlarını yenilə
  const fetchWindData = useCallback(async () => {
    const center = getAOICenter();
    if (!center) return;

    setFireSpreadLoading(true);
    try {
      const data = await getWindData(center.lat, center.lng);
      setWindData(data);
    } catch (error) {
      console.error("Wind data error:", error);
    } finally {
      setFireSpreadLoading(false);
    }
  }, [getAOICenter, setWindData, setFireSpreadLoading]);

  // Yanğın yayılmasını proqnozlaşdır
  const predictSpread = useCallback(async () => {
    if (!hotspots?.features?.length) return;

    setFireSpreadLoading(true);
    try {
      // Əvvəlcə külək məlumatlarını al
      let currentWindData = windData;
      if (!currentWindData) {
        const center = getAOICenter();
        if (center) {
          currentWindData = await getWindData(center.lat, center.lng);
          setWindData(currentWindData);
        }
      }

      if (!currentWindData) {
        throw new Error("Wind data not available");
      }

      // Yayılma proqnozu
      const prediction = predictFireSpread({
        hotspots,
        windData: currentWindData,
        hours: predictionHours
      });

      setFireSpreadPrediction(prediction);
    } catch (error) {
      console.error("Spread prediction error:", error);
    } finally {
      setFireSpreadLoading(false);
    }
  }, [hotspots, windData, predictionHours, getAOICenter, setWindData, setFireSpreadPrediction, setFireSpreadLoading]);

  // Risk hesabla
  const risk = windData ? calculateFireRisk(windData) : null;
  
  // Statistika
  const stats = fireSpreadPrediction ? calculateSpreadStats(fireSpreadPrediction) : null;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Fire Spread Prediction
          </h2>
          <p className="text-sm text-gray-500">Wind-based spread analysis</p>
        </div>
      </div>

      {/* No Hotspots Warning */}
      {!hotspots?.features?.length && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  No Hotspots Available
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  First fetch hotspots from the Hotspots panel to predict fire spread.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wind Data Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wind className="w-4 h-4" />
              Current Weather
            </CardTitle>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={fetchWindData}
              disabled={!aoi || fireSpreadLoading}
            >
              <RefreshCw className={`w-4 h-4 ${fireSpreadLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {windData ? (
            <div className="space-y-3">
              {/* Wind Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Wind className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Wind Speed</p>
                    <p className="text-sm font-semibold">{Math.round(windData.windSpeed)} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <ArrowUp 
                    className="w-4 h-4 text-blue-600 transition-transform" 
                    style={{ transform: `rotate(${windData.windDirection}deg)` }}
                  />
                  <div>
                    <p className="text-xs text-gray-500">Direction</p>
                    <p className="text-sm font-semibold">
                      {windDirectionToText(windData.windDirection)} ({Math.round(windData.windDirection)}°)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                  <Droplets className="w-4 h-4 text-cyan-600" />
                  <div>
                    <p className="text-xs text-gray-500">Humidity</p>
                    <p className="text-sm font-semibold">{Math.round(windData.humidity)}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <Thermometer className="w-4 h-4 text-red-600" />
                  <div>
                    <p className="text-xs text-gray-500">Temperature</p>
                    <p className="text-sm font-semibold">{Math.round(windData.temperature)}°C</p>
                  </div>
                </div>
              </div>

              {/* Risk Level */}
              {risk && (
                <div 
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: `${risk.color}20` }}
                >
                  <p className="text-xs text-gray-600 dark:text-gray-400">Fire Risk Level</p>
                  <p 
                    className="text-lg font-bold"
                    style={{ color: risk.color }}
                  >
                    {risk.level}
                  </p>
                </div>
              )}

              {windData.isDemo && (
                <p className="text-xs text-amber-600 text-center">
                  ⚠️ Demo data - API unavailable
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Wind className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Click refresh to fetch weather data
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prediction Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Prediction Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            label="Prediction Timeframe"
            value={predictionHours}
            onChange={(e) => setPredictionHours(Number(e.target.value))}
            options={[
              { value: 1, label: "1 hour ahead" },
              { value: 3, label: "3 hours ahead" },
              { value: 6, label: "6 hours ahead" },
              { value: 12, label: "12 hours ahead" },
              { value: 24, label: "24 hours ahead" }
            ]}
            disabled={fireSpreadLoading}
          />
        </CardContent>
      </Card>

      {/* Predict Button */}
      <Button
        onClick={predictSpread}
        disabled={!hotspots?.features?.length || fireSpreadLoading}
        loading={fireSpreadLoading}
        leftIcon={<Flame className={`w-4 h-4 ${fireSpreadLoading ? "animate-pulse" : ""}`} />}
        className="w-full"
        variant="primary"
      >
        {fireSpreadLoading ? "Calculating..." : "Predict Fire Spread"}
      </Button>

      {/* Clear Button */}
      {fireSpreadPrediction && (
        <Button
          onClick={clearFireSpread}
          variant="ghost"
          className="w-full"
        >
          Clear Prediction
        </Button>
      )}

      {/* Prediction Results */}
      {stats && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <TrendingUp className="w-4 h-4" />
              Spread Prediction Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <p className="text-lg font-bold text-orange-600">{stats.totalAreaHa} ha</p>
                <p className="text-xs text-gray-500">Potential Spread Area</p>
              </div>
              <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <p className="text-lg font-bold text-orange-600">{stats.hoursAhead}h</p>
                <p className="text-xs text-gray-500">Prediction Window</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Wind Speed:</span>
                <span className="font-medium">{Math.round(stats.windSpeed)} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Wind From:</span>
                <span className="font-medium">{windDirectionToText(stats.windDirection)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Spread Direction:</span>
                <span className="font-medium text-red-600">
                  → {windDirectionToText(stats.spreadDirection)}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-orange-200 dark:border-orange-800">
              <p className="text-xs font-medium text-gray-500 mb-2">Spread Timeline</p>
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span>1-3h</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-500" />
                  <span>3-6h</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-500" />
                  <span>6-24h</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardContent className="py-3">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 Prediction based on wind direction, speed, humidity, and temperature. 
            Arrows show spread direction from each hotspot.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
