# AgriNexus ProofOS — local demo & review guide

## What the prototype actually does

The Next.js landing page at `/` introduces the concept. The connected workspace at `/workspace` runs against one local FastAPI + SQLite instance. Both pages share the Organic/Natural visual tokens (rice paper, moss, clay, Fraunces and Nunito). Interactive marketing-page preview cards contain **clearly labeled sample values**; they do not request field data. In the actual workspace you can:

1. Create and select a demo farm, using a general region rather than private coordinates.
2. Save a timestamped **manual, unverified** soil-moisture observation.
3. Compare a simple illustrative one-day water balance with manually entered mm inputs. Clearing required evidence produces a missing-evidence response rather than scenarios.
4. Save a farm-linked passport with the captured inputs, provenance and optional most recent observation in the **context snapshot**. The observation is **not** converted from % to mm or used in the calculation.
5. Open a saved passport to review its model assumptions, timestamped evidence snapshot, scenario outputs and limitations. Historical pre-snapshot passports explicitly show evidence unavailable.
6. Record optional user-reported actions and associate a separate, later manual observation from the *same farm* as a follow-up. This is **not a verified outcome**.
7. Request a provider forecast for approximate geographic coordinates, inspect its source, retrieval time and provider-grid coordinates. The external forecast is **not automatically fed into** the decision comparison.

All user data is local to the development machine. There is no login, tenancy isolation, actual AI prediction, calibrated irrigation recommendation, validated crop response, production security, or completed Android release. Never expose the API publicly or submit real private farm information.

## Launch on Windows — fresh clone (personal development repo)

Run these commands in **PowerShell**, with Python, Node.js and Git available:

```powershell
cd C:\Users\Tarun\Projects
git clone https://github.com/tarunkkumarsahu/agrinexus-ai.git agrinexus-ui-review
cd agrinexus-ui-review\services\api
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a **second PowerShell terminal**:

```powershell
cd C:\Users\Tarun\Projects\agrinexus-ui-review\apps\web
npm install
npm run dev
```

Open http://localhost:3000 (public landing) and http://localhost:3000/workspace (API-connected workspace). The API health URL is http://127.0.0.1:8000/health; the docs URL is http://127.0.0.1:8000/docs.

If the directory already exists, do not re-clone or delete it. Instead run `git status --short` and `git pull --ff-only origin main` only when the working tree is clean. If port 3000 or 8000 is already occupied, stop the old dev process or use a deliberate port and CORS configuration.

## 90-second jury journey (illustrative, not clinical/agronomic advice)

1. Start from the landing page: explain the difference between its preview and the real workspace. Click **Explore the prototype**.
2. Create “Sample plot A”, crop “Cotton”, region “Example region”, area 1.2 hectares. Select it if not already selected.
3. Record soil moisture **31%** as a manual observation. Point out source and timestamp: it is *context*, not an input to the mm water-balance model.
4. Use prefilled **sample** model inputs (root-zone 35 mm; capacity 60 mm; user threshold 25 mm; daily demand 7 mm; rain 2 mm; proposed irrigation 10 mm). Show the two illustrative outputs: **30 mm** without irrigation and **40 mm** with entered irrigation. Neither output is a recommendation.
5. Open the saved passport under the selected farm. Show its captured timestamp, explicit manual provenance, assumptions and limitations. Change/clear a required field in a subsequent comparison to demonstrate the missing-evidence gate.
6. Add a self-reported follow-up such as “waited” or “not taken”. Optionally record a newer manual observation and link it. Do not call either a proven outcome.
7. Fetch a weather forecast using a *general-area* coordinate. Show the data source, time window and the explicit note that forecast rainfall is not silently converted into irrigation advice.

The demo shows a traceable prototype, not actual deployed farm intelligence. Do not claim AI prediction, field efficacy or real-time sensors.

## Review, tests and known limits

```powershell
# From services/api (with virtual environment installed)
.\.venv\Scripts\python.exe -m pytest -q

# From apps/web
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser checks automatically start the API and web dev server if those ports are free and Python is on PATH. If the backend is already running, Playwright reuses it for local review; use *sample-only* data. Browser tests cover desktop landing, mobile navigation, farm → observation → passport → follow-up, and a **mocked** weather response for deterministic UI checking. Live weather-provider behavior is tested separately at the backend; a mocked browser fixture is **not evidence** of a live forecast.

GitHub Actions runs backend tests, web build and browser E2E on the personal development repository. The team-owned HackIndia repo is a separate, user-managed destination requiring appropriate write access. Do not mirror the entire nested personal Git clone into the official repo.

## Design QA checklist for human localhost review

- Desktop around 1440 px: landing navigation, hero/field concept graphic, all sections, prototype link, and workspace forms.
- Mobile around 390 px: open/close navigation, accessible buttons, readable form fields, no horizontal overflow.
- Keyboard: Tab through navigation, forms and open/close passport details. Tab-focused controls remain visible.
- Failure state: stop the backend and retry the connection using the banner; do not show sample data as a live response.
- Data integrity: no selected farm means unsaved comparison; after selecting a farm, new passports persist locally.
- Source integrity: sample values, observations, regional forecasts and calculated comparisons are labeled by their distinct origins.
- UI feedback: confirm loading, empty, missing evidence, validation error, saved record and follow-up history states.

## Not finished by this prototype

Real user authentication/access control, production-grade security, scientific model validation, real sensor ingestion, automated provenance verification, AI explanation, external outcome validation, verified Android build and usability research with farmers still require separate engineering and field review.
