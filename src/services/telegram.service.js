/**
 * Telegram Bot Service
 * Yanğın alerti olduqda Telegram mesaj göndərir
 * 
 * SETUP:
 * 1. @BotFather ilə bot yarat: https://t.me/BotFather
 * 2. /newbot əmri ilə bot yarat, TOKEN al
 * 3. Bot-a mesaj yaz, sonra chat_id-ni tap
 * 4. .env.local faylına əlavə et:
 *    NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your_bot_token
 *    NEXT_PUBLIC_TELEGRAM_CHAT_ID=your_chat_id
 */

const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || "";

/**
 * Telegram mesaj göndər
 * @param {string} message - Göndəriləcək mesaj
 * @param {string} chatId - Chat ID (optional, default from env)
 */
export async function sendTelegramMessage(message, chatId = CHAT_ID) {
  if (!BOT_TOKEN || !chatId) {
    console.warn("Telegram credentials not configured");
    return { success: false, error: "Telegram not configured" };
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.description || "Telegram API error");
    }
    
    console.log("Telegram message sent successfully");
    return { success: true, result };
  } catch (error) {
    console.error("Telegram send error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fire alert göndər
 * @param {Object} alert - Alert məlumatları
 * @param {string} countryName - Ölkə adı
 */
export async function sendFireAlertTelegram(alert, countryName) {
  const message = 
`🚨 <b>FIRE ALERT!</b>

🔥 <b>${alert.count}</b> active fire${alert.count > 1 ? 's' : ''} detected
📍 Location: <b>${countryName}</b>
🌬️ Wind Speed: <b>${Math.round(alert.windSpeed)} km/h</b>
🧭 Spread Direction: <b>${alert.spreadDirection}</b>
⏰ Time: ${new Date().toLocaleString('en-US')}

⚠️ <i>Please take immediate action!</i>

🔗 FireBug Monitoring System`;

  return await sendTelegramMessage(message);
}

/**
 * Individual fire alert göndər (hər yanğın üçün ayrıca)
 * @param {Object} fire - Yanğın məlumatları
 * @param {number} index - Yanğın indeksi
 * @param {number} total - Ümumi yanğın sayı
 */
export async function sendIndividualFireAlert(fire, index, total) {
  const message = 
`🔥 <b>FIRE INCIDENT ${index}/${total}</b>

📍 Location: <b>${fire.location}</b>
🌡️ Brightness: <b>${fire.brightness}K</b>
⚡ Fire Power: <b>${fire.frp} MW</b>
🌬️ Wind: <b>${fire.windSpeed} km/h → ${fire.spreadDirection}</b>
📐 Coordinates: <code>${fire.lat.toFixed(4)}, ${fire.lon.toFixed(4)}</code>
⏰ Time: ${new Date().toLocaleString('en-US')}

⚠️ <i>Fire spreading ${fire.spreadDirection}!</i>`;

  return await sendTelegramMessage(message);
}

/**
 * Test mesaj göndər
 */
export async function sendTestMessage() {
  const message = 
`✅ <b>FireBug Test Message</b>

Telegram notifications configured successfully!

🔥 You will receive fire alerts on this channel when fires are detected.

🔗 FireBug Monitoring System`;

  return await sendTelegramMessage(message);
}
