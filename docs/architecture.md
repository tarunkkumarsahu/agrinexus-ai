# AgriNexus ProofOS — current architecture

Last updated for **web prototype v0.5 / shared API v0.4**. This is a local development demonstration, not a production deployment or validated agricultural decision system.

## End-to-end structure

- `apps/web/app/page.tsx` and `app/landing.css`: accessible, responsive, public-facing concept page. Its clickable preview tabs are clearly labeled **sample UI** and do not write to the database.
- `apps/web/app/workspace/page.tsx`: the actual interactive decision workspace, including API connection status, selected-farm state, the manually configured illustrative comparison and a save-or-ephemeral result distinction.
- `apps/web/app/components/FarmWorkspace.tsx`: local farm registration/selection, manual observation records, historical passports, stored provenance, recorded user follow-ups and later-observation linking.
- `apps/web/app/components/WeatherPanel.tsx`: on-demand, provenance-labeled third-party regional forecast; not an automatically trusted calculation input.
- `apps/web/app/globals.css`: reusable token palette, global accessibility states, common workspace cards/forms and responsive breakpoints. The landing aliases the shared colors and uses a separate page-scoped layout.
- `apps/android`: Kotlin/Jetpack Compose scaffold that shares the API contract, not yet independently built on an Android emulator.
- `services/api`: FastAPI and Pydantic request/response schemas, deterministic illustrative water-balance engine, local SQLite records, passport evidence/follow-ups and Open-Meteo HTTP proxy.

## API/data flow

1. `GET /health`: local API connectivity state. The frontend explicitly displays offline/retry rather than replacing failed calls with sample data.
2. `GET /v1/farms`, `POST /v1/farms`, `GET /v1/farms/{farm_id}`: local **demo farm** records, with no account isolation.
3. `GET/POST /v1/farms/{farm_id}/observations` and `GET /v1/farms/{farm_id}/snapshot`: user-entered soil moisture (%) labeled manual/unverified and timestamped. Never automatically converted into root-zone water (mm).
4. `POST /v1/decisions/irrigation`: ephemeral comparison; requires root-zone water, capacity, minimum threshold, estimated daily demand and forecast rainfall in mm. Missing required inputs return `needs_evidence` with **no scenarios**. Irrigation mm is a user proposal, defaulting to 10 mm.
5. `POST /v1/farms/{farm_id}/passports/irrigation`: captures the same illustrative calculation together with manual input provenance and an immutable-at-creation snapshot of the latest manual observation, if any. Stores the passport locally only when a farm is selected.
6. `GET /v1/farms/{farm_id}/passports` and `GET /v1/farms/{farm_id}/passports/{passport_id}`: list saved records and inspect input sources, assumptions and optional follow-ups. Older passports saved before provenance support explicitly show evidence `null`; historical evidence is **not fabricated**.
7. `POST /v1/farms/{farm_id}/passports/{passport_id}/followups`: optional *self-reported* action and note. A linked observation must belong to the same farm and be recorded after the passport. Neither self-report nor field-value difference is a verified crop outcome.
8. `GET /v1/weather/forecast`: external modeled forecast for general-area coordinates rounded by the server, without AgriNexus geolocation persistence. Exposes source/retrieval time, forecast window, requested and provider-grid locations and limitations. No silent transfer into the manual rainfall field or irrigation model.

The scenario engine performs a single illustrative daily water-balance step, clips stored-water estimates to entered capacity and reports deficits/overflow under two cases: no irrigation and user-entered irrigation. It does **not** model infiltration, runoff, drainage, soil spatial variability, crop physiology, parameter uncertainty or intervention effects. There is no AI model or scientifically validated prediction. Do not use the outputs for actual farm decisions.

## Security and deployment constraints

The API is intentionally **local-only** and CORS allows only local web origins. SQLite records are unencrypted and unpartitioned by user; there is no identity, authorization, rate limiting or production monitoring. Do not deploy on a public interface or enter personal/private farm data. API keys and future AI-provider credentials belong in server-side environment variables, never browser or Android bundles. Commercial/weather-provider licensing must be confirmed before commercial use: https://open-meteo.com/en/docs and https://open-meteo.com/en/terms .

## Validation and quality gates

- Existing Python tests exercise validation, engine arithmetic, farm/observation storage, passport history, evidence snapshots, self-reported follow-ups and the weather proxy.
- `npm run build` type-checks and builds the web client.
- `npm run test:e2e` executes Playwright against the real local API and web server for the landing, mobile menu, farm-to-follow-up journey, and forecast UI with a **mocked** upstream response. The browser mock validates UI presentation, **not external provider availability**.
- Human localhost QA remains necessary for actual visual detail, keyboard usability on real devices and jury presentation. See `docs/demo-guide.md`.

## Further work outside this development prototype

Production user authentication and multi-tenant storage, calibrated input sourcing, sensor validation, scientifically reviewed agronomic model, applied-AI explanations with rigorous evidence checks, independently measured field outcomes, Android build/emulator validation, production security and user research all remain future work.
