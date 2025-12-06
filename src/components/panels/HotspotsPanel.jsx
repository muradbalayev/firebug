"use client";

import { useState, useCallback } from "react";
import { useMapStore } from "@/store/useMapStore";
import { getHotspots, calculateHotspotStats, FIRMS_SOURCES } from "@/services/firms.service";
import { Button, Card, CardHeader, CardTitle, CardContent, Select } from "@/components/ui";
import { getBoundingBox } from "@/lib/utils";
import { 
  Flame, 
  RefreshCw, 
  AlertCircle, 
  MapPin,
  Thermometer,
  Calendar,
  Filter
} from "lucide-react";

/**
 * HotspotsPanel Component
 * NASA FIRMS hotspot data loading and visualization panel
 * Production-ready for government fire monitoring systems
 */
export default function HotspotsPanel() {
  const { 
    aoi, 
    hotspots,
    hotspotsLoading, 
    hotspotsError,
    hotspotFilters,
    setHotspots,
    setHotspotsLoading,
    setHotspotsError,
    setHotspotFilters
  } = useMapStore();

  const [localDayRange, setLocalDayRange] = useState(hotspotFilters.dayRange);

  // Fetch hotspots from FIRMS API
  const fetchHotspots = useCallback(async () => {
    if (!aoi) {
      setHotspotsError("Please draw an Area of Interest (AOI) on the map first");
      return;
    }

    setHotspotsLoading(true);
    setHotspotsError(null);

    try {
      const bbox = getBoundingBox(aoi);
      const data = await getHotspots({
        bbox,
        source: hotspotFilters.source,
        dayRange: localDayRange
      });

      setHotspots(data);
      setHotspotFilters({ dayRange: localDayRange });

    } catch (error) {
      setHotspotsError(error.message);
    }
  }, [aoi, hotspotFilters.source, localDayRange, setHotspots, setHotspotsLoading, setHotspotsError, setHotspotFilters]);

  // Statistics
  const stats = hotspots ? calculateHotspotStats(hotspots) : null;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
          <Flame className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Fire Hotspots
          </h2>
          <p className="text-sm text-gray-500">NASA FIRMS real-time data</p>
        </div>
      </div>

      {/* AOI Warning */}
      {!aoi && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  No AOI Selected
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  Draw a polygon or rectangle on the map to define your area of interest.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            label="Data Source"
            value={hotspotFilters.source}
            onChange={(e) => setHotspotFilters({ source: e.target.value })}
            options={[
              { value: "VIIRS_NOAA20_NRT", label: "VIIRS NOAA-20 (375m)" },
              { value: "VIIRS_SNPP_NRT", label: "VIIRS SNPP (375m)" },
              { value: "MODIS_NRT", label: "MODIS (1km)" },
              { value: "LANDSAT_NRT", label: "Landsat (30m)" }
            ]}
          />

          <Select
            label="Time Range"
            value={localDayRange}
            onChange={(e) => setLocalDayRange(Number(e.target.value))}
            options={[
              { value: 1, label: "Last 24 hours" },
              { value: 2, label: "Last 48 hours" },
              { value: 3, label: "Last 3 days" },
              { value: 7, label: "Last 7 days" }
            ]}
          />

          <Select
            label="Minimum confidence"
            value={hotspotFilters.minConfidence}
            onChange={(e) => setHotspotFilters({ minConfidence: e.target.value })}
            options={[
              { value: "low", label: "All" },
              { value: "nominal", label: "Nominal + High" },
              { value: "high", label: "High Only" }
            ]}
          />
        </CardContent>
      </Card>

      {/* Fetch Button */}
      <Button
        onClick={fetchHotspots}
        disabled={!aoi || hotspotsLoading}
        loading={hotspotsLoading}
        leftIcon={<RefreshCw className={`w-4 h-4 ${hotspotsLoading ? "animate-spin" : ""}`} />}
        className="w-full"
      >
        {hotspotsLoading ? "Fetching Hotspots..." : "Fetch Hotspots"}
      </Button>

      {/* Error */}
      {hotspotsError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{hotspotsError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                icon={<MapPin className="w-4 h-4" />}
                label="Total Hotspots"
                value={stats.total}
                color="text-red-600"
              />
              <StatItem
                icon={<Thermometer className="w-4 h-4" />}
                label="Avg Brightness"
                value={`${stats.avgBrightness}K`}
                color="text-orange-600"
              />
              <StatItem
                icon={<Flame className="w-4 h-4" />}
                label="High Confidence"
                value={stats.highConfidence}
                color="text-red-500"
              />
              <StatItem
                icon={<Calendar className="w-4 h-4" />}
                label="Avg FRP"
                value={`${stats.avgFRP} MW`}
                color="text-amber-600"
              />
            </div>

            {/* Confidence Breakdown */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 mb-2">Confidence Distribution</p>
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                {stats.total > 0 && (
                  <>
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(stats.highConfidence / stats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-amber-500" 
                      style={{ width: `${(stats.nominalConfidence / stats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${(stats.lowConfidence / stats.total) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>High: {stats.highConfidence}</span>
                <span>Nominal: {stats.nominalConfidence}</span>
                <span>Low: {stats.lowConfidence}</span>
              </div>
            </div>

            {/* Demo Warning */}
            {hotspots?.metadata?.isDemo && (
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Demo data displayed. Add FIRMS API key for real data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Stat Item Component
 */
function StatItem({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className={color}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
