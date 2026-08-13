# GA4 Location Stats Setup

Run these commands locally after installing and logging into the Supabase CLI.

```sh
supabase link --project-ref ujtujoycquhockpmkrnq
supabase secrets set GA4_PROPERTY_ID=539650621
supabase secrets set --env-file ./supabase-ga4-secrets.env
supabase functions deploy ga4-locations
```

Create `supabase-ga4-secrets.env` locally and do not commit it. This command reads the downloaded Google service-account JSON and stores it as base64 so Supabase does not have to handle multi-line JSON or quote escaping:

```sh
node -e 'const fs=require("fs"); const json=fs.readFileSync("/Users/ashbennett/Downloads/club-505413-af66134d4382.json","utf8").trim(); JSON.parse(json); fs.writeFileSync("supabase-ga4-secrets.env", `GA4_SERVICE_ACCOUNT_JSON_B64=${Buffer.from(json).toString("base64")}\n`); console.log("Created supabase-ga4-secrets.env");'
```

The service account must have Viewer access to the GA4 property.
