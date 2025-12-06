/**
 * Sentinel Hub Catalog Search API Route
 * Mövcud görüntüləri axtarmaq üçün
 */

export async function POST(request) {
  const clientId = process.env.NEXT_PUBLIC_SENTINEL_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_SENTINEL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.json(
      { error: "Sentinel Hub credentials təyin edilməyib", images: [] },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { bbox, startDate, endDate } = body;

    // 1. Token al
    const tokenResponse = await fetch("https://services.sentinel-hub.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      return Response.json(
        { error: "Token alma xətası", images: [] },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Catalog search
    const [west, south, east, north] = bbox;
    
    const searchResponse = await fetch("https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        bbox: [west, south, east, north],
        datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
        collections: ["sentinel-2-l2a"],
        limit: 50
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Catalog search error:", errorText);
      return Response.json(
        { error: "Axtarış xətası", images: [] },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();
    
    let images = searchData.features?.map(f => ({
      id: f.id,
      date: f.properties.datetime?.split("T")[0] || "Unknown",
      cloudCover: Math.round(f.properties["eo:cloud_cover"] || 0),
      satellite: f.properties["platform"] || "Sentinel-2"
    })) || [];

    // Cloud cover filter (50% altında)
    images = images.filter(img => img.cloudCover <= 50);

    // Tarixə görə sırala (ən yenidən köhnəyə)
    images.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Dublikat tarixləri sil (eyni gündə bir görüntü)
    const uniqueDates = new Set();
    images = images.filter(img => {
      if (uniqueDates.has(img.date)) return false;
      uniqueDates.add(img.date);
      return true;
    });

    return Response.json({ images });

  } catch (error) {
    console.error("Sentinel search error:", error);
    return Response.json(
      { error: "Server xətası", images: [] },
      { status: 500 }
    );
  }
}
