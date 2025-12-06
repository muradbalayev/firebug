"use client";

import { useState, useCallback } from "react";
import { useMapStore } from "@/store/useMapStore";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { 
  FileText, 
  Download, 
  FileSpreadsheet,
  Image,
  CheckSquare,
  Square,
  Loader2
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * ReportPanel Component
 * PDF və CSV hesabat generasiyası
 */
export default function ReportPanel() {
  const { 
    aoi,
    hotspots,
    burnPolygons,
    preFireDate,
    postFireDate,
    generateReportData
  } = useMapStore();

  const [generating, setGenerating] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    includeMap: true,
    includeHotspots: true,
    includeBurnArea: true,
    includeConfidence: true,
    includeDates: true
  });

  const toggleOption = (key) => {
    setReportOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // PDF Generate
  const generatePDF = useCallback(async () => {
    setGenerating(true);
    
    try {
      const reportData = generateReportData();
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(249, 115, 22); // Orange
      doc.rect(0, 0, 210, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("FireMap Navigator", 20, 25);
      
      doc.setFontSize(12);
      doc.text("Yanğın Analiz Hesabatı", 20, 35);
      
      // Reset color
      doc.setTextColor(0, 0, 0);
      
      let yPos = 55;
      
      // Date info
      if (reportOptions.includeDates) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Hesabat tarixi: ${new Date().toLocaleDateString("az-AZ")}`, 20, yPos);
        yPos += 7;
        if (preFireDate && postFireDate) {
          doc.text(`Analiz dövrü: ${preFireDate} - ${postFireDate}`, 20, yPos);
        }
        yPos += 15;
      }
      
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Xülasə", 20, yPos);
      yPos += 10;
      
      // Summary table
      const summaryData = [
        ["Göstərici", "Dəyər"],
        ["Toplam hotspot sayı", String(reportData.hotspots?.total || 0)],
        ["Yanmış sahə (ha)", reportData.burnArea?.totalHectares?.toFixed(2) || "0"],
        ["Burn polygon sayı", String(reportData.burnArea?.polygonCount || 0)]
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: "striped",
        headStyles: { fillColor: [249, 115, 22] },
        margin: { left: 20 }
      });
      
      yPos = doc.lastAutoTable?.finalY + 15 || yPos + 40;
      
      // Hotspot Details
      if (reportOptions.includeHotspots && reportData.hotspots?.data?.features?.length > 0) {
        doc.setFontSize(14);
        doc.text("Hotspot Təfərrüatları", 20, yPos);
        yPos += 10;
        
        const hotspotTableData = reportData.hotspots.data.features.slice(0, 20).map((f, idx) => [
          String(idx + 1),
          f.properties.latitude?.toFixed(4) || "",
          f.properties.longitude?.toFixed(4) || "",
          f.properties.brightness?.toFixed(1) || "",
          f.properties.confidence || "",
          f.properties.acq_date || ""
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [["#", "Lat", "Lng", "Parlaqlıq", "Confidence", "Tarix"]],
          body: hotspotTableData,
          theme: "striped",
          headStyles: { fillColor: [239, 68, 68] },
          margin: { left: 20 },
          styles: { fontSize: 8 }
        });
        
        yPos = doc.lastAutoTable?.finalY + 15 || yPos + 60;
      }
      
      // Burn Area Details
      if (reportOptions.includeBurnArea && reportData.burnArea?.data?.features?.length > 0) {
        // New page if needed
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Yanmış Sahə Təfərrüatları", 20, yPos);
        yPos += 10;
        
        const burnTableData = reportData.burnArea.data.features.map((f, idx) => [
          f.properties.id || String(idx + 1),
          f.properties.area_ha?.toFixed(2) || "0",
          f.properties.confidence || "N/A",
          String(f.properties.hotspotCount || 0)
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [["ID", "Sahə (ha)", "Confidence", "Hotspot sayı"]],
          body: burnTableData,
          theme: "striped",
          headStyles: { fillColor: [147, 51, 234] },
          margin: { left: 20 }
        });
        
        yPos = doc.lastAutoTable?.finalY + 15 || yPos + 60;
      }
      
      // Confidence Summary
      if (reportOptions.includeConfidence && reportData.confidenceSummary) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text("Confidence Xülasəsi", 20, yPos);
        yPos += 10;
        
        const confData = [
          ["HIGH", String(reportData.confidenceSummary.high || 0)],
          ["MEDIUM", String(reportData.confidenceSummary.medium || 0)],
          ["LOW", String(reportData.confidenceSummary.low || 0)]
        ];
        
        autoTable(doc, {
          startY: yPos,
          head: [["Confidence", "Sayı"]],
          body: confData,
          theme: "striped",
          headStyles: { fillColor: [34, 197, 94] },
          margin: { left: 20 }
        });
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `FireMap Navigator | Səhifə ${i}/${pageCount}`,
          105,
          290,
          { align: "center" }
        );
      }
      
      // Save
      doc.save(`firemap-report-${new Date().toISOString().split("T")[0]}.pdf`);
      
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setGenerating(false);
    }
  }, [generateReportData, reportOptions, preFireDate, postFireDate]);

  // CSV Export
  const exportCSV = useCallback(() => {
    const reportData = generateReportData();
    
    // Hotspots CSV
    if (reportData.hotspots?.data?.features?.length > 0) {
      const headers = ["latitude", "longitude", "brightness", "confidence", "acq_date", "satellite"];
      const rows = reportData.hotspots.data.features.map(f => 
        headers.map(h => f.properties[h] || "").join(",")
      );
      
      const csv = [headers.join(","), ...rows].join("\n");
      downloadFile(csv, "hotspots.csv", "text/csv");
    }
    
    // Burn polygons CSV
    if (reportData.burnArea?.data?.features?.length > 0) {
      const headers = ["id", "area_ha", "confidence", "hotspotCount", "date"];
      const rows = reportData.burnArea.data.features.map(f =>
        headers.map(h => f.properties[h] || "").join(",")
      );
      
      const csv = [headers.join(","), ...rows].join("\n");
      downloadFile(csv, "burn_polygons.csv", "text/csv");
    }
  }, [generateReportData]);

  // GeoJSON Export
  const exportGeoJSON = useCallback(() => {
    const reportData = generateReportData();
    
    if (reportData.hotspots?.data) {
      downloadFile(
        JSON.stringify(reportData.hotspots.data, null, 2),
        "hotspots.geojson",
        "application/json"
      );
    }
    
    if (reportData.burnArea?.data) {
      downloadFile(
        JSON.stringify(reportData.burnArea.data, null, 2),
        "burn_polygons.geojson",
        "application/json"
      );
    }
  }, [generateReportData]);

  const hasData = hotspots?.features?.length > 0 || burnPolygons?.features?.length > 0;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Hesabat
          </h2>
          <p className="text-sm text-gray-500">Export və paylaşma</p>
        </div>
      </div>

      {/* Data Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mövcud Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <DataItem 
              label="AOI" 
              value={aoi ? "Seçilib ✓" : "Seçilməyib"} 
              active={!!aoi}
            />
            <DataItem 
              label="Hotspotlar" 
              value={hotspots?.features?.length || 0} 
              active={hotspots?.features?.length > 0}
            />
            <DataItem 
              label="Burn polygonlar" 
              value={burnPolygons?.features?.length || 0} 
              active={burnPolygons?.features?.length > 0}
            />
            <DataItem 
              label="Tarix aralığı" 
              value={preFireDate && postFireDate ? `${preFireDate} → ${postFireDate}` : "Təyin edilməyib"} 
              active={!!preFireDate && !!postFireDate}
            />
          </div>
        </CardContent>
      </Card>

      {/* Report Options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Hesabat seçimləri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries({
            includeHotspots: "Hotspot məlumatları",
            includeBurnArea: "Yanmış sahə məlumatları",
            includeConfidence: "Confidence xülasəsi",
            includeDates: "Tarix məlumatları"
          }).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleOption(key)}
              className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition"
            >
              {reportOptions[key] ? (
                <CheckSquare className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="space-y-2">
        <Button
          onClick={generatePDF}
          disabled={!hasData || generating}
          loading={generating}
          leftIcon={<Download className="w-4 h-4" />}
          className="w-full"
        >
          {generating ? "PDF yaradılır..." : "PDF Yüklə"}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            disabled={!hasData}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
            className="flex-1"
          >
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportGeoJSON}
            disabled={!hasData}
            leftIcon={<FileText className="w-4 h-4" />}
            className="flex-1"
          >
            GeoJSON
          </Button>
        </div>
      </div>

      {/* No Data Warning */}
      {!hasData && (
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
          <CardContent className="py-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              ⚠️ Hesabat yaratmaq üçün əvvəlcə hotspot və ya burn polygon data yükləyin.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Kepler.gl Export Info */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardContent className="py-3">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
            📊 Kepler.gl üçün export:
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            GeoJSON fayllarını <a href="https://kepler.gl" target="_blank" rel="noopener" className="underline">kepler.gl</a>-ə 
            yükləyərək interaktiv vizualizasiya yarada bilərsiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Data Item Component
 */
function DataItem({ label, value, active }) {
  return (
    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${active ? "text-green-600" : "text-gray-400"}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * Helper: Download file
 */
function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
