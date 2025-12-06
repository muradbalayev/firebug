/**
 * Sentinel Hub Token API Route
 * Server-side OAuth token alma - CORS problemini həll edir
 */

export async function POST() {
  const clientId = process.env.NEXT_PUBLIC_SENTINEL_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_SENTINEL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.json(
      { error: "Sentinel Hub credentials təyin edilməyib" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://services.sentinel-hub.com/oauth/token", {
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

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { error: errorData.error_description || "Auth failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return Response.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    });
  } catch (error) {
    console.error("Sentinel Hub auth error:", error);
    return Response.json(
      { error: "Token alma xətası" },
      { status: 500 }
    );
  }
}
