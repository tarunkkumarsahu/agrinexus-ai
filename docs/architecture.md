# AgriNexus ProofOS — technical architecture v0.1

Web (Next.js + TypeScript) and native Android (Kotlin + Jetpack Compose) use the same FastAPI JSON HTTP service. New AI-provider credentials and data API keys, when added, must be kept in server-side environment variables, not mobile or browser bundles.

API routes:
- GET /health: simple service check.
- POST /v1/decisions/irrigation: user-provided inputs, missing-evidence gate, and two deterministic illustrative scenarios.

All water quantities are millimeters. Root-zone water, field capacity, minimum water, daily demand and forecast rain are REQUIRED for scenario calculations; if one is missing, the engine returns needs_evidence and no scenarios. A user-supplied irrigation amount defaults to 10 mm.

The scenario arithmetic clips estimated end-of-day water to the user-entered capacity. It does not represent a crop-water model, measure current soil moisture, or produce a valid irrigation recommendation. The passport_id is a response identifier only; no persistent decision passport exists yet. Weather estimates, soil values and minimum water are manually supplied and unverified.

Pending core product: per-user farm profile storage, real timestamped weather provenance, evidence freshness, model applicability and uncertainty, scientifically reviewed irrigation modeling, AI explanation with restricted tool outputs, outcome capture, and evidence-backed reliability evaluation.

Deployment: current CORS is for local web origins only. Android cleartext HTTP is enabled for the developer emulator only; use HTTPS, authentication, API access control, rate limiting and production-grade data protection before public release.
