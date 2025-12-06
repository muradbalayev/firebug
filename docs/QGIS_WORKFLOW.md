# 🌍 QGIS ilə Burn Scar Detection - Detallı Təlimat

## Tələblər

- QGIS 3.28+ (LTR tövsiyə olunur)
- Sentinel-2 görüntüləri (B08, B12 band-ları)
- Processing Toolbox aktivləşdirilmiş

---

## Addım 1: Data Hazırlığı

### 1.1 Sentinel-2 Görüntülərini Yükləmək

**EO Browser vasitəsilə:**
1. https://apps.sentinel-hub.com/eo-browser/ açın
2. Axtarış parametrləri:
   - Data source: Sentinel-2 L2A
   - Cloud coverage: < 20%
   - Time range: Pre-fire və Post-fire tarixləri
3. "Analytical" download seçin
4. Band seçimi: **B08 (NIR)** və **B12 (SWIR)**
5. Format: **GeoTIFF**

**Copernicus Open Access Hub vasitəsilə:**
1. https://scihub.copernicus.eu/ açın
2. AOI çəkin
3. Filtering:
   ```
   platformname:Sentinel-2
   producttype:S2MSI2A
   cloudcoverpercentage:[0 TO 20]
   ```
4. Download və unzip edin

### 1.2 QGIS-ə Import

```
Layer → Add Layer → Add Raster Layer

Pre-fire:
- B08_pre.tif (10m resolution, NIR)
- B12_pre.tif (20m resolution, SWIR2)

Post-fire:
- B08_post.tif
- B12_post.tif
```

---

## Addım 2: Band Resampling

B12 (20m) ilə B08 (10m) eyni resolution olmalıdır.

```
Processing → Toolbox → GDAL → Raster projections → Warp (reproject)

Input: B12_pre.tif
Resampling method: Bilinear
Output resolution: 10
Output: B12_pre_10m.tif
```

Eyni əməliyyatı B12_post üçün də edin.

---

## Addım 3: NBR Hesablaması

**Normalized Burn Ratio (NBR)** bitki sağlamlığını ölçür:
- Yüksək NBR = sağlam bitki
- Aşağı/mənfi NBR = yanmış/stress altında

### 3.1 Pre-fire NBR

```
Processing → Toolbox → Raster analysis → Raster calculator

Expression:
("B08_pre@1" - "B12_pre_10m@1") / ("B08_pre@1" + "B12_pre_10m@1")

Output: NBR_pre.tif
```

### 3.2 Post-fire NBR

```
Expression:
("B08_post@1" - "B12_post_10m@1") / ("B08_post@1" + "B12_post_10m@1")

Output: NBR_post.tif
```

---

## Addım 4: dNBR Hesablaması

**Differenced NBR (dNBR)** yanğın şiddətini göstərir:

```
Processing → Toolbox → Raster analysis → Raster calculator

Expression:
"NBR_pre@1" - "NBR_post@1"

Output: dNBR.tif
```

### dNBR Dəyərlərinin Mənası

| dNBR Range | Severity Class |
|------------|----------------|
| < -0.25 | High post-fire regrowth |
| -0.25 to -0.1 | Low post-fire regrowth |
| -0.1 to 0.1 | Unburned |
| 0.1 to 0.27 | Low severity |
| 0.27 to 0.44 | Moderate-low severity |
| 0.44 to 0.66 | Moderate-high severity |
| > 0.66 | High severity |

---

## Addım 5: Burn Mask Yaratmaq

### 5.1 Threshold Tətbiqi

```
Processing → Toolbox → Raster analysis → Raster calculator

Expression:
("dNBR@1" > 0.1) * 1

Output: burn_mask.tif
```

Bu 0.1-dən böyük dNBR dəyərlərini 1, qalanını 0 edir.

### 5.2 Daha Dəqiq Threshold (Optional)

Multiple severity classes:
```
Expression:
(("dNBR@1" >= 0.1) AND ("dNBR@1" < 0.27)) * 1 +
(("dNBR@1" >= 0.27) AND ("dNBR@1" < 0.44)) * 2 +
(("dNBR@1" >= 0.44) AND ("dNBR@1" < 0.66)) * 3 +
("dNBR@1" >= 0.66) * 4

Output: burn_severity.tif
```

---

## Addım 6: Polygonize

Raster mask-ı vector polygon-lara çevirmək:

```
Processing → Toolbox → GDAL → Raster conversion → Polygonize (Raster to Vector)

Input layer: burn_mask.tif
Name of the field: burn_class
Output: burn_polygons_raw.shp
```

---

## Addım 7: Polygon Təmizlənməsi

### 7.1 Yalnız yanmış əraziləri saxla

```
Processing → Toolbox → Vector selection → Extract by attribute

Input: burn_polygons_raw.shp
Selection attribute: burn_class
Operator: =
Value: 1
Output: burn_polygons_filtered.shp
```

### 7.2 Kiçik polygon-ları sil (noise removal)

```
Processing → Toolbox → Vector geometry → Extract by expression

Expression:
$area > 10000  -- 10000 m² = 1 hektar minimum

Output: burn_polygons_clean.shp
```

---

## Addım 8: Sahə Hesablaması

### 8.1 Field Calculator ilə

1. `burn_polygons_clean` layer-ə right-click → Open Attribute Table
2. Toggle editing mode (pencil icon)
3. Open field calculator

```
New field:
  Name: area_ha
  Type: Decimal number (real)
  Length: 10
  Precision: 2
  
Expression:
  $area / 10000
```

4. OK → Save edits → Toggle editing off

### 8.2 Alternative: Processing ilə

```
Processing → Toolbox → Vector table → Field calculator

Input: burn_polygons_clean.shp
Field name: area_ha
Field type: Float
Formula: $area / 10000
Output: burn_polygons_with_area.shp
```

---

## Addım 9: Əlavə Atributlar

### 9.1 Mean dNBR Dəyəri

Hər polygon üçün orta dNBR:

```
Processing → Toolbox → Raster analysis → Zonal statistics

Input layer: burn_polygons_with_area.shp
Raster layer: dNBR.tif
Statistics to calculate: Mean, Max
Output column prefix: dnbr_
```

### 9.2 Polygon ID

```
Field Calculator:
  Name: polygon_id
  Expression: 'burn_' || @row_number
```

### 9.3 Tarix

```
Field Calculator:
  Name: date
  Expression: '2024-12-06'  -- Post-fire tarixi
```

---

## Addım 10: GeoJSON Export

```
Right-click burn_polygons_final → Export → Save Features As

Format: GeoJSON
File name: burn_polygons.geojson
CRS: EPSG:4326 (WGS 84)

Layer Options:
  COORDINATE_PRECISION: 6
```

---

## Final GeoJSON Strukturu

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng, lat], ...]]
      },
      "properties": {
        "polygon_id": "burn_1",
        "area_ha": 45.67,
        "dnbr_mean": 0.342,
        "dnbr_max": 0.589,
        "date": "2024-12-06",
        "severity": "moderate"
      }
    }
  ]
}
```

---

## QGIS Project Template

Layer adları standartı:

```
📁 FireMap_Analysis
├── 📂 Base
│   ├── OSM_Base
│   └── AOI_Boundary
├── 📂 Pre_Fire
│   ├── B08_pre
│   ├── B12_pre_10m
│   └── NBR_pre
├── 📂 Post_Fire
│   ├── B08_post
│   ├── B12_post_10m
│   └── NBR_post
├── 📂 Analysis
│   ├── dNBR
│   ├── burn_mask
│   └── burn_severity
├── 📂 Results
│   ├── burn_polygons_raw
│   ├── burn_polygons_clean
│   └── burn_polygons_final
└── 📂 External
    └── FIRMS_hotspots
```

---

## Processing Model (Automation)

Bütün workflow-u bir model-ə çevirmək:

```
Processing → Graphical Modeler

Model name: Burn_Scar_Detection

Inputs:
- Pre-fire B08 (Raster)
- Pre-fire B12 (Raster)
- Post-fire B08 (Raster)
- Post-fire B12 (Raster)
- Threshold value (Number, default: 0.1)
- Min area (Number, default: 10000)

Algorithms:
1. Warp (B12 resample)
2. Raster calculator (NBR_pre)
3. Raster calculator (NBR_post)
4. Raster calculator (dNBR)
5. Raster calculator (burn_mask)
6. Polygonize
7. Extract by attribute
8. Extract by expression (min area)
9. Field calculator (area_ha)
10. Zonal statistics

Output:
- burn_polygons.geojson
```

---

## Troubleshooting

| Problem | Həll |
|---------|------|
| NBR dəyərləri səhvdir | Band-ları yoxlayın (B08=NIR, B12=SWIR2) |
| Çox noise var | Threshold-u artırın (0.15-0.2) |
| Polygon-lar birləşir | Morphological opening tətbiq edin |
| CRS uyğunsuzluğu | Bütün layer-ləri EPSG:4326-ya reproject edin |
| Böyük file size | Simplify geometries istifadə edin |
