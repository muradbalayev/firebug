/**
 * Sentinel Hub Image API Route
 * Server-side görüntü alma - CORS problemini həll edir
 */

export async function POST(request) {
  const clientId = process.env.NEXT_PUBLIC_SENTINEL_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_SENTINEL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.json(
      { error: "Sentinel Hub credentials təyin edilməyib" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { bbox, date, type = "truecolor", width = 512, height = 512 } = body;

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
      const errorData = await tokenResponse.json();
      return Response.json(
        { error: errorData.error_description || "Token alma xətası" },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Evalscript hazırla
    const evalscript = getEvalscript(type);

    // 3. Tarix aralığını hesabla (±5 gün - görüntü tapmaq şansını artırır)
    const targetDate = new Date(date);
    const fromDate = new Date(targetDate);
    fromDate.setDate(fromDate.getDate() - 5);
    const toDate = new Date(targetDate);
    toDate.setDate(toDate.getDate() + 5);
    
    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = toDate.toISOString().split("T")[0];

    // 4. Görüntü al
    const [west, south, east, north] = bbox;
    
    const requestBody = {
      input: {
        bounds: {
          bbox: [west, south, east, north],
          properties: {
            crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
          }
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: {
                from: `${fromStr}T00:00:00Z`,
                to: `${toStr}T23:59:59Z`
              },
              maxCloudCoverage: 80,
              mosaickingOrder: "leastCC"
            }
          }
        ]
      },
      output: {
        width,
        height,
        responses: [
          {
            identifier: "default",
            format: {
              type: "image/png"
            }
          }
        ]
      },
      evalscript
    };

    const imageResponse = await fetch("https://services.sentinel-hub.com/api/v1/process", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "image/png"
      },
      body: JSON.stringify(requestBody)
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("Sentinel image error:", errorText);
      return Response.json(
        { error: "Görüntü alma xətası", details: errorText },
        { status: imageResponse.status }
      );
    }

    // 4. Görüntünü base64-ə çevir
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");
    
    return Response.json({
      image: `data:image/png;base64,${base64}`,
      date,
      type
    });

  } catch (error) {
    console.error("Sentinel API error:", error);
    return Response.json(
      { error: "Server xətası", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Evalscript-lər
 */
function getEvalscript(type) {
  const scripts = {
    truecolor: `
      //VERSION=3
      function setup() {
        return {
          input: ["B04", "B03", "B02"],
          output: { bands: 3 }
        };
      }
      function evaluatePixel(sample) {
        return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
      }
    `,
    nbr: `
      //VERSION=3
      function setup() {
        return {
          input: ["B08", "B12"],
          output: { bands: 3 }
        };
      }
      function evaluatePixel(sample) {
        let nbr = (sample.B08 - sample.B12) / (sample.B08 + sample.B12);
        if (nbr < -0.2) return [0.5, 0, 0.5];
        if (nbr < 0) return [1, 0, 0];
        if (nbr < 0.1) return [1, 0.5, 0];
        if (nbr < 0.2) return [1, 1, 0];
        if (nbr < 0.4) return [0.5, 1, 0.5];
        return [0, 0.8, 0];
      }
    `,
    ndvi: `
      //VERSION=3
      function setup() {
        return {
          input: ["B04", "B08"],
          output: { bands: 3 }
        };
      }
      function evaluatePixel(sample) {
        let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
        if (ndvi < 0) return [0.5, 0.5, 0.5];
        if (ndvi < 0.2) return [0.9, 0.9, 0.7];
        if (ndvi < 0.4) return [0.7, 0.9, 0.5];
        if (ndvi < 0.6) return [0.4, 0.8, 0.3];
        return [0.1, 0.6, 0.1];
      }
    `
  };

  return scripts[type] || scripts.truecolor;
}
