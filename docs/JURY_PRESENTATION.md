# 🔥 FireBug - Jüri Təqdimatı

## Layihənin Məqsədi

**Problem:** Meşə yanğınları zamanı operativ qərar qəbul etmək çətindir. Yanğın harada baş verir? Necə yayılır? Kimlərə xəbər vermək lazımdır?

**Həll:** FireBug - real-time yanğın monitorinqi, ML ilə aşkarlama, avtomatik alert sistemi və peyk görüntü analizi üçün vahid platforma.

---

## 🎯 Əsas Xüsusiyyətlər

### 1. 📡 Live Monitoring (Real-Time)
- **NASA FIRMS** API-dən canlı yanğın hotspot-ları
- 20 saniyəlik polling ilə avtomatik yenilənmə
- Azərbaycan sərhədləri GeoJSON ilə göstərilir
- Esri satellite görüntüləri

### 2. 🔊 AI Səsli Alert Sistemi
- Hər yanğın üçün **ayrıca səsli xəbərdarlıq**
- Text-to-Speech ilə ingilis dilində alert
- Yanğın lokasiyası, gücü və yayılma istiqaməti oxunur
- Ardıcıl alert-lər (5 saniyə interval)

### 3. 📱 Telegram Bot İnteqrasiyası
- Yanğın olduqda **avtomatik Telegram mesajı**
- Hər yanğın üçün ayrıca mesaj
- Koordinatlar, FRP, brightness məlumatları
- Real-time bildirişlər

### 4. 🤖 ML Yanğın Aşkarlama
- **Roboflow** wildfire detection modeli
- Satellite görüntülərindən yanğın aşkarlama
- Bounding box ilə vizualizasiya
- Custom şəkil yükləyib test etmək imkanı

### 5. 📍 Ağıllı Lokasiya Sistemi
- Koordinatları **ən yaxın şəhər/rayon** adına çevirir
- Azərbaycanın 65+ şəhər və rayonu
- "Near Baku", "15km from Ganja" formatında

### 6. 🛰️ Peyk Görüntü Analizi
- **Sentinel-2** peyk görüntüləri
- Before/After müqayisə
- Fire location imagery modal
- Slider ilə bütün yanğınları görmək

### 7. 📊 Hesabat Sistemi
- PDF hesabat export
- GeoJSON data export
- Yanğın statistikaları

---

## 🔄 Live Monitoring Necə İşləyir?

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. ÖLKƏ SEÇ    │ ──► │  2. MONİTORİNQ  │ ──► │  3. YANĞIN VAR? │
│  Azerbaijan     │     │  Start Monitoring│     │  FIRMS API check│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                              YENİ YANĞIN TAPILDI ◄─────┘
                                      │
        ┌───────────────────────────────────────────────────────┐
        │                                                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ 🔊 SƏSLİ ALERT│     │ 📱 TELEGRAM   │     │ 🗺️ XƏRİTƏDƏ   │
│ AI oxuyur     │     │ Bot mesaj     │     │ Marker göstər │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

## 🛠️ Texniki Arxitektura

### Frontend Stack
| Texnologiya | Məqsəd |
|-------------|--------|
| Next.js 15 | React framework |
| Tailwind CSS | UI styling |
| Leaflet | İnteraktiv xəritə |

### Backend/API
| Texnologiya | Məqsəd |
|-------------|--------|
| FastAPI | ML API server |
| Roboflow | Yanğın detection modeli |
| Telegram Bot API | Bildiriş sistemi |

### Xarici API-lər
| API | Məqsəd |
|-----|--------|
| NASA FIRMS | Real-time yanğın hotspot-ları |
| Sentinel Hub | Peyk görüntüləri |
| OpenWeather | Külək məlumatları |
| Esri | Satellite tile-lar |

---

## � Telegram Alert Formatı

```
🔥 FIRE INCIDENT 1/3

📍 Location: Near Baku
🌡️ Brightness: 320K
⚡ Fire Power: 45.2 MW
🌬️ Wind: 25 km/h → Northeast
📐 Coordinates: 40.4093, 49.8671
⏰ Time: 12/6/2025, 11:00:00 PM

⚠️ Fire spreading Northeast!
```

---

## 🔊 Səsli Alert Nümunəsi

> *"Fire incident 1 of 3. Location: Near Baku. Fire power: 45.2 megawatts. Spreading Northeast at 25 kilometers per hour."*

---

## 🎨 UI Xüsusiyyətləri

### Live Monitoring Paneli
- **Sol panel**: Ölkə seçimi, statistikalar, alert-lər
- **Sağ panel**: Satellite xəritə + yanğın marker-ləri
- **Modal**: Fire locations slider + ML analiz

### Rəng Kodlaması
| Rəng | Məna |
|------|------|
| 🔴 Qırmızı | Yüksək risk (FRP > 50) |
| 🟠 Narıncı | Orta risk (FRP 20-50) |
| � Sarı | Aşağı risk (FRP < 20) |
| 🟢 Yaşıl | Təhlükəsiz |

---

## 🚀 Demo Ssenariləri

### Test Case 1: Live Monitoring
1. Monitoring → Azerbaijan seç
2. "Start Monitoring" click
3. Yanğın varsa avtomatik alert gəlir
4. Telegram-da mesaj gəlir

### Test Case 2: ML Detection
1. "View Fire Locations" click
2. Slider ilə yanğınları gör
3. "Analyze with ML" click
4. Bounding box görünür

### Test Case 3: Custom Image Test
1. Modal-da "Upload Image" click
2. Yanğın şəkli yüklə
3. ML model analiz edir
4. Nəticə göstərilir

---

## 🏆 Layihənin Üstünlükləri

1. **Real-time** - 20 saniyəlik polling
2. **Multi-channel alert** - Səs + Telegram
3. **ML Integration** - Roboflow model
4. **Smart Location** - Koordinat → Şəhər adı
5. **No duplicate alerts** - Eyni yanğın təkrar alert olmur
6. **Individual alerts** - Hər yanğın ayrıca bildirilir

---

## 📞 Demo

**URL:** http://localhost:3000/monitoring

**Telegram Bot:** @firebug_alert_bot

**Test üçün:**
1. Monitoring səhifəsinə keç
2. Azerbaijan seç
3. Telegram Alert toggle aktiv et
4. "Test Alert (Demo)" click et
5. Səsli alert + Telegram mesajı gəlir

---

*FireBug - Hackathon 2024*
