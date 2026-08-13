# GA4 Location Stats Setup

Run these commands locally after installing and logging into the Supabase CLI.

```sh
supabase link --project-ref ujtujoycquhockpmkrnq
supabase secrets set GA4_PROPERTY_ID=539650621
supabase secrets set --env-file ./supabase-ga4-secrets.env
supabase functions deploy ga4-locations
```

Create `supabase-ga4-secrets.env` locally and do not commit it:

```sh
GA4_SERVICE_ACCOUNT_JSON='PASTE_THE_FULL_SERVICE_ACCOUNT_JSON_ON_ONE_LINE'
```

The service account must have Viewer access to the GA4 property.
