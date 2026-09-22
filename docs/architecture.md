# AgriNexus ProofOS — technical architecture v0.3

Web (Next.js + TypeScript) and native Android (Kotlin + Jetpack Compose) use the same FastAPI JSON HTTP service. New AI-provider credentials and data API keys, when added, must be kept in server-side environment variables, not mobile or browser bundles.

API routes:
- GET /health: simple service check.
- POST /v1/decisions/irrigation: user-provided inputs, missing-evidence gate, and two deterministic illustrative scenarios.

All water quantities are millimeters. Root-zone water, field capacity, minimum water, daily demand and forecast rain are REQUIRED for scenario calculations; if one is missing, the engine returns needs_evidence and no scenarios. A user-supplied irrigation amount defaults to 10 mm.

The scenario arithmetic clips estimated end-of-day water to the user-entered capacity. It does not represent a crop-water model, measure current soil moisture, or produce a valid irrigation recommendation. A response passport_id is ephemeral for unlinked comparisons; when a demo farm is selected, a new dedicated endpoint persists both the manual inputs and calculated response to a local SQLite passport record. The stored record is illustrative and does not verify an actual action or outcome. Weather estimates, soil values and minimum water are manually supplied and unverified.

Current local-only extensions: per-farm SQLite records and manual observations, a timestamped farm context snapshot, the optional Open-Meteo weather proxy (query latitude/longitude rounded to 2 decimals without storage), and sample comparison passports. The displayed modeled 24-hour precipitation forecast is not automatically passed to the simulation. No authentication exists, and locally stored manual soil moisture (%) is NOT interchangeable with model inputs for root-zone water (mm). Missing upstream weather data fails with HTTP 502; the API does not silently substitute sample values.

Pending core product: per-user farm profile storage, real timestamped field-measurement provenance, evidence freshness, model applicability and uncertainty, scientifically reviewed irrigation modeling, AI explanation with restricted tool outputs, outcome capture, and evidence-backed reliability evaluation.

Open-Meteo usage: attribution is linked in the UI. Public API free access is oriented toward non-commercial use; verify suitable paid/commercial terms before any commercial deployment. See https://open-meteo.com/en/docs and https://open-meteo.com/en/terms .

Deployment: current CORS is for local web origins only. Android cleartext HTTP is enabled for the developer emulator only; use HTTPS, authentication, API access control, rate limiting and production-grade data protection before public release.
