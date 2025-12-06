# 🔄 FireMap Navigator - İş Axını (Workflow)

## Step-by-Step İstifadə Təlimatı

Bu sənəd FireMap Navigator sisteminin istifadəsini addım-addım izah edir.

---

## 📍 Addım 1: AOI Seçimi (Area of Interest)

### Web App-də:

1. **Sol paneldə** "Hotspotlar" bölməsinə keçin
2. **Xəritədə** yuxarı sol küncədəki **çəkmə alətlərini** tapın
3. **Polygon** və ya **Rectangle** alətini seçin
4. Analiz etmək istədiyiniz **ərazinin sərhədlərini** çəkin
5. Çəkməyi bitirdikdən sonra **narıncı rəngli AOI** görünəcək

### Nəticə:
- AOI koordinatları store-da saxlanılır
- Bütün növbəti əməliyyatlar bu AOI içində işləyəcək

---

## 🔥 Addım 2: FIRMS Hotspot Yükləmə

### Web App-də:

1. **Hotspotlar panelində** filtrlər bölməsini konfiqurasiya edin:
   - **Data mənbəyi**: VIIRS NOAA-20 (tövsiyə olunur - 375m dəqiqlik)
   - **Zaman aralığı**: Son 24-48 saat
   - **Minimum confidence**: Hamısı (başlanğıc üçün)

2. **"Hotspotları Yüklə"** düyməsini click edin

3. Yükləmə tamamlandıqdan sonra:
   - Xəritədə **qırmızı/narıncı nöqtələr** görünəcək
   - Statistikalar paneldə göstəriləcək
   - Hər nöqtəyə click edərək detalları görə bilərsiniz

### API Response formatı:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [49.8671, 40.4093]
      },
      "properties": {
        "brightness": 345.6,
        "confidence": "high",
        "acq_date": "2024-12-06",
        "satellite": "N20"
      }
    }
  ]
}
```

---

## 🛰️ Addım 3: Sentinel Görüntüləri

### Web App-də:

1. **"Peyk Görüntüləri"** paneline keçin

2. **Tarixləri seçin**:
   - **Pre-fire date**: Yanğından əvvəlki tarix (1-2 həftə əvvəl)
   - **Post-fire date**: Yanğından sonrakı tarix (bugün və ya yaxın)

3. **"Mövcud görüntüləri axtar"** - cloud coverage aşağı olan tarixləri görün

4. **"Görüntüləri Yüklə"** düyməsini click edin

5. **Before/After slider** ilə fərqi müqayisə edin

### QGIS üçün Export:

Sentinel Hub-dan əldə edilən görüntülər QGIS-də daha dərin analiz üçün istifadə edilə bilər:

1. **EO Browser**-ə daxil olun: https://apps.sentinel-hub.com/eo-browser/
2. AOI koordinatlarınızı daxil edin
3. Pre və post tarixləri seçin
4. **Analytical download** seçin (B08, B12 band-ları daxil)
5. GeoTIFF formatında export edin

---

## 📊 Addım 4: QGIS ilə Burn Scar Detection

### QGIS Workflow:

#### 4.1 Rasterləri yükləyin
```
Layer → Add Layer → Add Raster Layer
- Pre-fire B08 (NIR) və B12 (SWIR)
- Post-fire B08 (NIR) və B12 (SWIR)
```

#### 4.2 NBR hesablayın (Raster Calculator)
```
Processing → Toolbox → Raster Calculator

NBR_pre = (B08_pre - B12_pre) / (B08_pre + B12_pre)
NBR_post = (B08_post - B12_post) / (B08_post + B12_post)
```

#### 4.3 dNBR hesablayın
```
dNBR = NBR_pre - NBR_post
```

#### 4.4 Burn mask yaradın
```
Processing → Toolbox → Reclassify by Table

dNBR > 0.1 → 1 (yanmış)
dNBR <= 0.1 → 0 (yanmamış)
```

#### 4.5 Polygonize edin
```
Processing → Toolbox → Polygonize (Raster to Vector)
Input: Burn mask raster
Output: burn_polygons.shp
```

#### 4.6 Sahə hesablayın
```
Field Calculator ilə yeni field:
area_ha = $area / 10000
```

#### 4.7 GeoJSON export
```
Right-click layer → Export → Save Features As
Format: GeoJSON
Output: burn_polygons.geojson
```

---

## 🔍 Addım 5: Burn Polygon Analizi

### Web App-də:

1. **"Analiz"** paneline keçin

2. QGIS-dən export etdiyiniz **GeoJSON faylını yükləyin**:
   - "Fayl Seç" click edin
   - burn_polygons.geojson seçin

3. Və ya **"Demo Data"** düyməsini click edin (test üçün)

4. Sistem avtomatik olaraq:
   - Polygonları xəritədə göstərəcək
   - Hotspot-larla kəsişməni yoxlayacaq
   - Confidence hesablayacaq

### Confidence Məntiqi:

| Vəziyyət | Confidence | Rəng |
|----------|------------|------|
| Polygon + High confidence hotspot | HIGH | Qırmızı |
| Polygon + Nominal/Low hotspot | MEDIUM | Narıncı |
| Yalnız polygon, hotspot yoxdur | LOW | Yaşıl |

---

## 🧭 Addım 6: Təhlükəsiz Marşrut

### Web App-də:

1. **"Marşrut"** paneline keçin

2. **Nöqtələri seçin**:
   - **Xəritədən**: Shift+Click (başlanğıc), Ctrl+Click (son)
   - **Manual**: Koordinatları daxil edin (lat, lng formatı)

3. **Nəqliyyat növünü** seçin:
   - Avtomobil
   - Velosiped
   - Piyada

4. **"Marşrut Hesabla"** click edin

5. Sistem:
   - Burn polygonları "avoid area" kimi istifadə edir
   - Mümkünsə yan keçən marşrut göstərir
   - Mümkün deyilsə, xəbərdarlıq ilə birbaşa marşrut göstərir

### Marşrut Tipləri:

| Tip | Rəng | Məna |
|-----|------|------|
| Direct | Mavi | Birbaşa, təhlükəsiz |
| Avoided | Yaşıl | Burn polygon-dan yan keçdi |
| Detour | Narıncı | Waypoint ilə alternativ |
| Unsafe | Qırmızı (kesik) | Yanmış ərazidən keçir |

---

## 📄 Addım 7: Hesabat Generasiyası

### Web App-də:

1. **"Hesabat"** paneline keçin

2. **Mövcud data** bölməsini yoxlayın - bütün elementlər "✓" olmalıdır

3. **Hesabat seçimlərini** konfiqurasiya edin:
   - ☑️ Hotspot məlumatları
   - ☑️ Yanmış sahə məlumatları
   - ☑️ Confidence xülasəsi
   - ☑️ Tarix məlumatları

4. **Export formatını** seçin:
   - **PDF Yüklə**: Tam hesabat
   - **CSV**: Spreadsheet üçün
   - **GeoJSON**: Kepler.gl/QGIS üçün

### PDF Hesabat Strukturu:

```
┌────────────────────────────────────┐
│ FireMap Navigator                  │
│ Yanğın Analiz Hesabatı             │
├────────────────────────────────────┤
│ Hesabat tarixi: 06.12.2024         │
│ Analiz dövrü: 01.12 - 06.12.2024   │
├────────────────────────────────────┤
│ XÜLASƏ                             │
│ • Toplam hotspot: 45               │
│ • Yanmış sahə: 234.5 ha            │
│ • Polygon sayı: 8                  │
├────────────────────────────────────┤
│ HOTSPOT TƏFƏRRÜATlARI              │
│ [Cədvəl]                           │
├────────────────────────────────────┤
│ YANMIŞ SAHƏ TƏFƏRRÜATlARI         │
│ [Cədvəl]                           │
├────────────────────────────────────┤
│ CONFIDENCE XÜLASƏSİ                │
│ HIGH: 3 | MEDIUM: 4 | LOW: 1       │
└────────────────────────────────────┘
```

---

## 🔄 Optional: Avtomatlaşdırma

### Make.com/Zapier ilə:

1. **Trigger**: Hər 6-24 saatda bir

2. **Action 1**: FIRMS API call
   - Əvvəlcədən təyin edilmiş AOI üçün
   - Son 24 saat datası

3. **Action 2**: Yeni hotspot yoxlaması
   - Əvvəlki data ilə müqayisə
   - Yeni high-confidence hotspot varsa:

4. **Action 3**: Alert göndər
   - Email notification
   - Slack/Telegram mesaj
   - Dashboard update

### Nümunə Zap:
```
Schedule (Every 6 hours)
    ↓
HTTP Request (FIRMS API)
    ↓
Filter (confidence = "high")
    ↓
IF new hotspots > 0
    ↓
Send Email / Slack Message
```

---

## 📊 Kepler.gl Integration

### GeoJSON-ları Kepler.gl-ə yükləmək:

1. https://kepler.gl açın

2. **"Get Started"** click edin

3. Export etdiyiniz faylları sürükləyin:
   - hotspots.geojson
   - burn_polygons.geojson

4. **Layer konfiqurasiyası**:
   - Hotspots: Point layer, size by brightness, color by confidence
   - Burn polygons: Polygon layer, color by area_ha

5. **Filters əlavə edin**:
   - Tarix range
   - Confidence filter
   - Area threshold

6. **Map config export** edin (JSON) - paylaşmaq üçün

---

## ⚠️ Troubleshooting

| Problem | Həll |
|---------|------|
| Hotspot yüklənmir | API key-i yoxlayın (.env.local) |
| Görüntü gəlmir | Sentinel Hub credentials yoxlayın |
| Marşrut tapılmır | Daha kiçik avoid area istifadə edin |
| PDF boşdur | Əvvəlcə data yükləyin |
| Xəritə görünmür | Səhifəni refresh edin |
