# Render gate boundary

`/api/build-info` is an operational deployment-verification endpoint. It is intentionally outside the Supabase session proxy so the X3 Render gate can verify the exact deployed commit before starting the authenticated browser flow.

The endpoint exposes only Render service metadata (`commit`, `service`) and no user or workspace data.
