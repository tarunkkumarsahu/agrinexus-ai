# AgriNexus ProofOS

Evidence-driven agricultural decision intelligence for **web and Android**, with a shared backend.

## Status: v0.5 local UI prototype (API v0.4)

This repository contains a two-route Next.js/TypeScript experience (organic landing page at / and the connected working workspace at /workspace), a Kotlin/Jetpack Compose Android scaffold, and a shared FastAPI backend. The backend has a deterministic **illustrative** irrigation-scenario comparison and missing-evidence response, local SQLite farm/observation records, a provenance-labeled weather proxy, a timestamped farm-context snapshot, and locally persisted example decision passports with a frozen evidence snapshot and optional manually recorded follow-ups. A real provider weather forecast can be fetched, but this is NOT yet an AI model, scientifically validated digital twin, actionable agronomic decision tool, verified outcome record or finished mobile release. Forecasts are displayed separately and are not automatically used in irrigation calculations. Do not use demo numbers for agricultural decisions.

## Monorepo structure

- apps/web: Next.js public-facing product explanation, responsive working workspace, illustrative scenario comparison, farm/observation management, saved passport detail/follow-up UI, and weather source panel. Automated browser E2E tests cover the main demonstration workflow.
- apps/android: Kotlin/Compose Android project and matching comparison form (Android build/emulator verification pending; Gradle wrapper needs to be generated).
- services/api: shared FastAPI service, validation, illustrative scenario engine and automated Python tests.
- docs: architecture, roadmap and an AI-assisted development record.

## Start the API in PowerShell, at repository root

    cd services/api
    py -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Open http://127.0.0.1:8000/docs or http://127.0.0.1:8000/health .

## Start the web UI (second terminal, at repository root)

    cd apps/web
    npm install
    npm run dev

Open http://localhost:3000 for the landing page and http://localhost:3000/workspace for the working prototype. The web API URL defaults to http://127.0.0.1:8000 in development; set NEXT_PUBLIC_API_BASE_URL to override.

## Backend tests (another terminal, at repository root)

    cd services/api
    .\.venv\Scripts\python.exe -m pytest -q

## Browser checks & product walkthrough

Run `npm run build` from `apps/web` for the production build. For desktop/mobile and real API-connected browser smoke tests, run `npx playwright install chromium` then `npm run test:e2e` from `apps/web` after installing the backend Python requirements. Browser tests reuse local servers if present and otherwise start the dev services; test only with non-private sample data. See [docs/demo-guide.md](docs/demo-guide.md) for the exact Windows setup, full walkthrough, evidence-origin caveats and manual review checklist.

## Android

See apps/android/README.md. The Android emulator uses http://10.0.2.2:8000 to reach the local backend. Android Studio + JDK 17 + Android SDK are required. Android and web share the same endpoints, not separate business logic.

## GitHub workflow

This personal repository is the development source. The separate HackIndia Team Travex repository is a user-managed submission destination; do not automatically mirror or force-push to it. User reviews and tests here first, then transfers an approved snapshot into the official repo while preserving its README and LICENSE. Check organizer rules before submitting the same product to multiple events.

## Limitations and roadmap

Current results use manually entered, unverified quantities. Scenarios are not crop-specific and do not model soil drainage, runoff, forecast uncertainty, or plant physiology. Standalone comparison passport IDs are ephemeral; farm-saved passports are persisted locally. Next build account-protected farm profiles, timestamped field-measurement provenance, scientifically validated agronomic calculations, a tool-using AI explanation layer, stronger evidence gating and independently recorded field outcomes.

Weather preview: below the scenario comparison and farm workspace, enter approximate latitude and longitude (2 decimals sent to the provider) and fetch an Open-Meteo forecast. Only use this integration for non-commercial demonstration unless appropriate commercial terms are in place. Source: https://open-meteo.com/en/docs and terms https://open-meteo.com/en/terms .

Select a saved demo farm in the Farm Workspace before running a scenario comparison to store a **local, explicitly illustrative** decision passport. Without a selected farm, results remain ephemeral. These records are NOT verified real-world farming outcomes. The farm passport endpoint now stores an immutable-at-creation evidence snapshot (input provenance and the latest separate manual observation) and supports optional action/follow-up notes, linked only to observations recorded after the passport. The observation is NOT silently converted into water-mm or used by the model. See /docs for GET /v1/farms/{farm_id}/passports/{passport_id} and POST /v1/farms/{farm_id}/passports/{passport_id}/followups. Existing pre-v0.4 passports have evidence=null (unavailable historical provenance) rather than reconstructed/fabricated provenance. This prototype has no account isolation or authentication; keep it strictly local.

See docs/architecture.md and docs/ai-usage-log.md. Do not claim tests, Android builds, deployment, or AI functionality not independently verified.
