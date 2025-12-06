# 🔥 FireBug

**Real-time fire detection, monitoring, ML analysis, and alert notification system**

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwindcss)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat-square&logo=leaflet)
![FastAPI](https://img.shields.io/badge/FastAPI-ML-009688?style=flat-square&logo=fastapi)

---

## 🎯 About

FireBug is a comprehensive fire monitoring and analysis platform. It integrates NASA FIRMS real-time data, Sentinel-2 satellite imagery, ML-based fire detection, and multi-channel alert systems (Voice + Telegram).

### Key Features

- � **Live Monitoring** - Real-time fire hotspots with 20-second polling
- 🔊 **AI Voice Alerts** - Text-to-Speech alerts for each fire incident
- � **Telegram Bot** - Automatic fire notifications to Telegram
- 🤖 **ML Detection** - Roboflow wildfire detection model
- � **Smart Location** - Coordinates to nearest city/district name
- 🛰️ **Satellite Imagery** - Esri satellite tiles + fire location modal
- 🗺️ **GeoJSON Borders** - Azerbaijan borders visualization
- � **Reports** - PDF/GeoJSON export

---

## 🚀 Installation

### Requirements
- Node.js 18+
- npm/yarn/pnpm

### Steps

```bash
# Clone repository
git clone https://github.com/your-repo/firebug.git
cd firebug

# Install dependencies
npm install

# Start development server
npm run dev
```

Open browser: http://localhost:3000

---

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
# NASA FIRMS API Key (Free)
NEXT_PUBLIC_FIRMS_API_KEY=your_firms_key

# Sentinel Hub API (Trial available)
NEXT_PUBLIC_SENTINEL_CLIENT_ID=your_client_id
NEXT_PUBLIC_SENTINEL_CLIENT_SECRET=your_client_secret

# OpenRouteService API (Free tier)
NEXT_PUBLIC_ORS_API_KEY=your_ors_key

# Mapbox Token (Optional)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Telegram Bot (Create via @BotFather)
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your_bot_token
NEXT_PUBLIC_TELEGRAM_CHAT_ID=your_chat_id
```

### API Keys Sources

| API | Get Key | Cost |
|-----|---------|------|
| NASA FIRMS | https://firms.modaps.eosdis.nasa.gov/api/area/ | Free |
| Sentinel Hub | https://www.sentinel-hub.com/ | Trial |
| OpenRouteService | https://openrouteservice.org/dev/#/signup | Free |
| Telegram Bot | https://t.me/BotFather | Free |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.js              # Main map page
│   └── monitoring/          # Live monitoring page
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── map/                 # Map components
│   ├── panels/              # Sidebar panels
│   └── monitoring/          # Monitoring components
├── services/
│   ├── firms.service.js     # NASA FIRMS API
│   ├── sentinel.service.js  # Sentinel Hub API
│   ├── telegram.service.js  # Telegram Bot API
│   ├── geocoding.service.js # Coordinate to location
│   ├── mlPrediction.service.js # ML API
│   └── fireSpread.service.js   # Wind data
└── lib/                     # Utilities

ml-api/                      # FastAPI ML server
├── main.py                  # API endpoints
└── requirements.txt         # Python dependencies
```

---

## 🔄 How It Works

### Live Monitoring Flow

```
1. Select Country  →  Choose Azerbaijan
2. Start Monitoring →  Begin 20-second polling
3. Fire Detected?  →  Check FIRMS API
         │
         ▼ NEW FIRE FOUND
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
🔊 Voice   📱 Telegram   🗺️ Map
  Alert      Message      Marker
```

### Alert Message Format

**Voice Alert:**
> "Fire incident 1 of 3. Location: Near Baku. Fire power: 45.2 megawatts. Spreading Northeast at 25 kilometers per hour."

**Telegram Alert:**
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

## 📊 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 15, React 19 |
| Styling | Tailwind CSS 4 |
| Maps | Leaflet, React-Leaflet |
| ML Backend | FastAPI, Roboflow |
| Notifications | Telegram Bot API, Web Speech API |
| Geo Processing | Turf.js |
| PDF | jsPDF |

---

## � Demo

### Test Case 1: Live Monitoring
1. Go to `/monitoring`
2. Select Azerbaijan
3. Enable "Telegram Alert" toggle
4. Click "Start Monitoring"
5. Wait for fire detection

### Test Case 2: Test Alert
1. Go to `/monitoring`
2. Enable "Telegram Alert" toggle
3. Click "🧪 Test Alert (Demo)"
4. Voice alert plays + Telegram message sent

### Test Case 3: ML Detection
1. Click "View Fire Locations"
2. Use slider to browse hotspots
3. Click "Analyze with ML"
4. See bounding boxes on detected fires

---

## 🏆 Features Highlights

| Feature | Description |
|---------|-------------|
| ✅ Real-time | 20-second polling interval |
| ✅ Multi-channel | Voice + Telegram alerts |
| ✅ ML Integration | Roboflow wildfire model |
| ✅ Smart Location | Coordinates → City name |
| ✅ No Duplicates | Same fire won't alert twice |
| ✅ Individual Alerts | Each fire reported separately |

---

## 📝 License

## 👥 Team

**FireBug** - Hackathon 2025
