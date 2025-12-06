# 🔥 FireBug Navigator - Jüri Təqdimatı

## Layihənin Məqsədi

**Problem:** Meşə yanğınları zamanı operativ qərar qəbul etmək çətindir. Yanğın harada baş verir? Hansı sahə yanıb? Təhlükəsiz yol hansıdır?

**Həll:** FireBug Navigator - real-time yanğın monitorinqi, analizi və təhlükəsiz marşrut planlaması üçün vahid platforma.

---

## 🎯 Əsas Xüsusiyyətlər

### 1. Real-Time Yanğın Aşkarlama
- **NASA FIRMS** API-dən canlı yanğın hotspot-ları
- Son 24-48 saat ərzində aşkarlanan yanğınlar
- Peyk məlumatları: VIIRS (375m dəqiqlik), MODIS (1km)

### 2. Peyk Görüntü Analizi
- **Sentinel-2** peyk görüntüləri
- Before/After müqayisə slider
- NBR (Normalized Burn Ratio) vizualizasiyası

### 3. Yanğın Sahəsi Hesablaması
- QGIS ilə dNBR analizi
- Yanmış ərazilərin polygon-ları
- Hektar ilə sahə hesablaması

### 4. Təhlükəsiz Marşrut Planlaması
- **OpenRouteService** ilə marşrut hesablama
- Yanmış ərazilərdən avtomatik yan keçmə
- Alternativ yollar təklifi

### 5. Hesabat Generasiyası
- PDF hesabat export
- CSV/GeoJSON data export
- Kepler.gl ilə inteqrasiya

---

## 🔄 Necə İşləyir?

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. AOI SEÇİMİ  │ ──► │  2. DATA YÜKLƏ  │ ──► │  3. ANALİZ ET   │
│  Xəritədə ərazi │     │  FIRMS + Sentinel│     │  Burn detection │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  6. HESABAT     │ ◄── │  5. MARŞRUT     │ ◄── │  4. VİZUALİZE   │
│  PDF/CSV export │     │  Təhlükəsiz yol │     │  Xəritədə göstər│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 🛠️ Texniki Arxitektura

### Frontend Stack
| Texnologiya | Versiya | Məqsəd |
|-------------|---------|--------|
| Next.js | 16 | React framework, SSR |
| Tailwind CSS | 4 | UI styling |
| Leaflet | 1.9 | İnteraktiv xəritə |
| Zustand | 5 | State management |

### API İnteqrasiyaları
| API | Məqsəd | Data |
|-----|--------|------|
| NASA FIRMS | Yanğın aşkarlama | Hotspot koordinatları |
| Sentinel Hub | Peyk görüntüləri | RGB, NBR imagery |
| OpenRouteService | Marşrut | Yol hesablaması |

---

## 📊 Data Flow

### Hotspot Data Axını
```
İstifadəçi AOI seçir
       ↓
FIRMS API çağırılır (bbox koordinatları ilə)
       ↓
CSV response → GeoJSON-a çevrilir
       ↓
Xəritədə qırmızı nöqtələr kimi göstərilir
       ↓
Statistikalar hesablanır (sayı, confidence, brightness)
```

### Burn Detection Axını
```
Sentinel-2 görüntüləri (Pre/Post)
       ↓
QGIS-də NBR hesablanır: (NIR - SWIR) / (NIR + SWIR)
       ↓
dNBR = NBR_pre - NBR_post
       ↓
Threshold (dNBR > 0.1) → Burn mask
       ↓
Polygonize → GeoJSON export
       ↓
Web app-ə yüklənir → Xəritədə göstərilir
```

### Safe Route Axını
```
Start/End nöqtələri seçilir
       ↓
Burn polygons "avoid area" kimi təyin edilir
       ↓
OpenRouteService API çağırılır
       ↓
Əgər yan keçmə mümkündürsə → Təhlükəsiz marşrut
Əgər mümkün deyilsə → Xəbərdarlıq + alternativ
```

---

## 🎨 UI/UX Dizayn Qərarları

### Niyə Bu Layout?
- **Sol panel**: Workflow addımları - istifadəçi ardıcıl keçir
- **Sağ panel**: Xəritə - əsas iş sahəsi
- **Layer control**: Müxtəlif data layer-lərini açıb-bağlamaq

### Rəng Kodlaması
| Rəng | Məna |
|------|------|
| 🔴 Qırmızı | Yüksək təhlükə / High confidence |
| 🟠 Narıncı | Orta təhlükə / Nominal |
| 🟢 Yaşıl | Aşağı təhlükə / Təhlükəsiz |
| 🔵 Mavi | Marşrut / Neyral |

---

## 💡 Confidence Scoring Məntiqi

Burn polygon-ların etibarlılığını qiymətləndirmək üçün:

```
ƏGƏR polygon içində FIRMS hotspot VAR:
    ƏGƏR hotspot.confidence = "high":
        polygon.confidence = "HIGH" (Qırmızı)
    YOX İSƏ:
        polygon.confidence = "MEDIUM" (Narıncı)
YOX İSƏ:
    polygon.confidence = "LOW" (Yaşıl)
```

**Məntiq:** Peyk görüntüsündən aşkarlanan yanmış sahə, real-time hotspot ilə təsdiqlənərsə, daha etibarlıdır.

---

## 🚀 Real-World İstifadə Ssenariləri

### Ssenari 1: Fövqəladə Hallar Nazirliyi
- Yanğın baş verdikdə operativ məlumat
- Təxliyə marşrutlarının planlaması
- Zərər qiymətləndirməsi

### Ssenari 2: Meşə Təsərrüfatı
- Yanğın sonrası sahə inventarizasiyası
- Bərpa planlaması
- Tarixi yanğın analizi

### Ssenari 3: Sığorta Şirkətləri
- Zərərin obyektiv qiymətləndirilməsi
- Peyk məlumatları ilə sübut
- Avtomatik hesabat

---

## 📈 Gələcək İnkişaf Planı

### Qısa müddət (1-3 ay)
- [ ] Real-time alert sistemi
- [ ] Mobile responsive dizayn
- [ ] Çoxlu AOI dəstəyi

### Orta müddət (3-6 ay)
- [ ] ML ilə yanğın proqnozu
- [ ] Tarixi data analizi
- [ ] API endpoint-ləri (third-party üçün)

### Uzun müddət (6-12 ay)
- [ ] Mobile app
- [ ] Drone inteqrasiyası
- [ ] IoT sensor dəstəyi

---

## ⚠️ Məhdudiyyətlər və Həllər

| Məhdudiyyət | Səbəb | Həll |
|-------------|-------|------|
| Hotspot gecikməsi | Peyk orbit dövrü | Çoxlu peyk mənbəyi |
| Bulud örtüyü | Optik peyk limiti | SAR data inteqrasiyası (gələcək) |
| Routing dəqiqliyi | Yol data keyfiyyəti | OpenStreetMap yeniləmələri |

---

## 🏆 Layihənin Üstünlükləri

1. **Real API-lər** - Mock data yox, real NASA/ESA məlumatları
2. **End-to-end həll** - Aşkarlamadan hesabata qədər
3. **Open Source** - Genişləndirilə bilən arxitektura
4. **No-code QGIS** - Texniki olmayan istifadəçilər üçün
5. **Azərbaycan dili** - Lokal istifadə üçün uyğun

---

## 📞 Demo

**URL:** http://localhost:3000

**Test üçün:**
1. Xəritədə Azərbaycanın meşə ərazisini seçin
2. "Hotspotları Yüklə" click edin
3. "Demo Data" ilə burn polygon yükləyin
4. Marşrut hesablayın
5. PDF hesabat export edin

---

*FireBug Navigator - Hakaton 2024*
