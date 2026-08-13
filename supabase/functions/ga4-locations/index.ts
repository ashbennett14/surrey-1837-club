const propertyId = Deno.env.get("GA4_PROPERTY_ID") || "539650621";
const serviceAccountJson = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON");
const serviceAccountJsonB64 = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON_B64");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function base64Url(input: string | ArrayBuffer) {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function getServiceAccount() {
  if (serviceAccountJsonB64) {
    try {
      return JSON.parse(decodeBase64(serviceAccountJsonB64));
    } catch (_error) {
      throw new Error("GA4_SERVICE_ACCOUNT_JSON_B64 is not valid base64 encoded JSON.");
    }
  }

  if (serviceAccountJson) {
    try {
      return JSON.parse(serviceAccountJson);
    } catch (_error) {
      throw new Error("GA4_SERVICE_ACCOUNT_JSON is not valid JSON. Prefer setting GA4_SERVICE_ACCOUNT_JSON_B64.");
    }
  }

  throw new Error("GA4 service account secret is not configured.");
}

async function getAccessToken() {
  const serviceAccount = getServiceAccount();
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: issuedAt + 3600,
    iat: issuedAt,
  };

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const unsignedJwt = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt),
  );
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Google token request failed: ${tokenResponse.status}`);
  }

  const token = await tokenResponse.json();
  return token.access_token;
}

async function fetchGa4Locations() {
  const accessToken = await getAccessToken();
  const reportResponse = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [
          {
            startDate: "30daysAgo",
            endDate: "today",
          },
        ],
        dimensions: [
          { name: "city" },
          { name: "region" },
          { name: "country" },
        ],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
            desc: true,
          },
        ],
        limit: 25,
      }),
    },
  );

  if (!reportResponse.ok) {
    const errorText = await reportResponse.text();
    throw new Error(`GA4 report request failed: ${reportResponse.status} ${errorText}`);
  }

  const report = await reportResponse.json();
  return (report.rows || []).map((row: {
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }) => ({
    city: row.dimensionValues?.[0]?.value || "(not set)",
    region: row.dimensionValues?.[1]?.value || "(not set)",
    country: row.dimensionValues?.[2]?.value || "(not set)",
    activeUsers: Number(row.metricValues?.[0]?.value || 0),
    sessions: Number(row.metricValues?.[1]?.value || 0),
    views: Number(row.metricValues?.[2]?.value || 0),
  }));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const locations = await fetchGa4Locations();
    return Response.json(
      {
        propertyId,
        dateRange: "Last 30 days",
        locations,
      },
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to load GA4 locations.",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});
