"use client";

import { FormEvent, useEffect, useState } from "react";
import FarmWorkspace from "../components/FarmWorkspace";
import WeatherPanel from "../components/WeatherPanel";

type Field =
  | "root_zone_water_mm"
  | "field_capacity_mm"
  | "minimum_water_mm"
  | "estimated_daily_demand_mm"
  | "forecast_rain_mm"
  | "proposed_irrigation_mm";

type Scenario = {
  label: string;
  applied_irrigation_mm: number;
  estimated_end_water_mm: number;
  estimated_deficit_to_minimum_mm: number;
  estimated_overflow_mm: number;
};

type Decision = {
  passport_id: string;
  status: "needs_evidence" | "illustrative";
  missing_inputs: string[];
  scenarios: Scenario[];
  assumptions: string[];
  disclaimer: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const INPUTS: { key: Field; label: string; hint: string }[] = [
  { key: "root_zone_water_mm", label: "Current root-zone water", hint: "mm · manual estimate" },
  { key: "field_capacity_mm", label: "Field water capacity", hint: "mm · user supplied" },
  { key: "minimum_water_mm", label: "Minimum water threshold", hint: "mm · user supplied" },
  { key: "estimated_daily_demand_mm", label: "Estimated daily demand", hint: "mm · manual estimate" },
  { key: "forecast_rain_mm", label: "Forecast rainfall", hint: "mm · manually entered" },
  { key: "proposed_irrigation_mm", label: "Proposed irrigation", hint: "mm · comparison input" },
];

const SAMPLE: Record<Field, string> = {
  root_zone_water_mm: "35",
  field_capacity_mm: "60",
  minimum_water_mm: "25",
  estimated_daily_demand_mm: "7",
  forecast_rain_mm: "2",
  proposed_irrigation_mm: "10",
};

export default function Home() {
  const [inputs, setInputs] = useState<Record<Field, string>>({ ...SAMPLE });
  const [result, setResult] = useState<Decision | null>(null);
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [passportsVersion, setPassportsVersion] = useState(0);
  const [savedToFarm, setSavedToFarm] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(API + "/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        setHealth("online");
      })
      .catch(() => {
        if (!controller.signal.aborted) setHealth("offline");
      });
    return () => controller.abort();
  }, []);

  async function retryConnection() {
    setHealth("checking");
    try {
      const response = await fetch(API + "/health");
      setHealth(response.ok ? "online" : "offline");
    } catch {
      setHealth("offline");
    }
  }

  async function runComparison(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSavedToFarm(false);
    setPending(true);

    const payload: Record<string, number | null> = {};
    for (const { key } of INPUTS) {
      const raw = inputs[key].trim();
      payload[key] = raw === "" ? null : Number(raw);
      if (raw !== "" && !Number.isFinite(payload[key])) {
        setError("Please enter valid numeric values.");
        setPending(false);
        return;
      }
    }
    if (payload.proposed_irrigation_mm === null) payload.proposed_irrigation_mm = 10;

    try {
      const url = activeFarmId
        ? API + "/v1/farms/" + encodeURIComponent(activeFarmId) + "/passports/irrigation"
        : API + "/v1/decisions/irrigation";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : "Check the entered water levels and capacity.";
        throw new Error(detail);
      }
      setResult((activeFarmId ? data.decision : data) as Decision);
      if (activeFarmId) {
        setSavedToFarm(true);
        setPassportsVersion((version) => version + 1);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not connect to the local API.");
    } finally {
      setPending(false);
    }
  }

  const availableInputs = INPUTS.slice(0, 5).filter(({ key }) => inputs[key].trim() !== "").length;
  const scenarioReady = availableInputs === 5;

  return (
    <main className="app-shell">
      <a className="workspace-skip" href="#farms">Skip to farm workspace</a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <a href="#overview" className="side-brand" aria-label="AgriNexus ProofOS overview">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-copy">agrinexus<small>PROOF OS / LAB</small></span>
        </a>

        <div className="side-group-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="On this page">
          <a href="#overview" className="side-link"><span className="nav-glyph">◈</span> Overview</a>
          <a href="#farms" className="side-link"><span className="nav-glyph">◇</span> Farm workspace</a>
          <a href="#decision-lab" className="side-link"><span className="nav-glyph">▦</span> Decision lab</a>
          <a href="#weather" className="side-link"><span className="nav-glyph">☼</span> Weather evidence</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="side-note">
            <span className="side-note-icon">↗</span>
            <strong>Designed for decisions.</strong>
            <p>Evidence first. Assumptions visible. Every result stays explainable.</p>
          </div>
          <span className="side-version">PROOFOS · EARLY PROTOTYPE</span>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-path"><a href="/">← Website</a><span className="path-slash">/</span><span>AGRICULTURE INTELLIGENCE</span><span className="path-slash">/</span> Overview</div>
          <div className="topbar-actions">
            <span className="local-pill">LOCAL DEVELOPMENT</span>
            <button className={"connection-pill " + health} type="button" onClick={() => void retryConnection()} title="Click to retry API connection">
              <span className="connection-dot" aria-hidden="true" />
              {health === "online" ? "API connected" : health === "offline" ? "API offline · retry" : "Checking API"}
            </button>
          </div>
        </header>

        <div className="page-content" id="overview">
          {health === "offline" && <div className="workspace-api-banner" role="alert"><span>Local backend is offline. Farm records, weather and comparisons require the API on port 8000.</span><button type="button" onClick={() => void retryConnection()}>Retry connection ↗</button></div>}
          {health === "checking" && <div className="workspace-api-banner checking" role="status">Checking the local backend connection…</div>}
          <section className="hero-layout" aria-labelledby="hero-heading">
            <div className="hero-copy">
              <div className="section-kicker"><span className="kicker-line" /> THE FIELD COMMAND CENTER</div>
              <h1 id="hero-heading">A clearer view<br />of <em>every decision.</em></h1>
              <p>Bring observations, assumptions and scenario comparisons into one calm workspace. Understand what the evidence says—and what it cannot say yet.</p>
              <div className="hero-actions">
                <a className="primary-link" href="#farms">Start with a farm <span aria-hidden="true">↗</span></a>
                <a className="text-link" href="#decision-lab">Try a scenario <span aria-hidden="true">→</span></a>
              </div>
              <div className="hero-footnote"><span className="footnote-dot" /> LOCAL WORKING PROTOTYPE <span className="hero-footnote-separator">—</span> NO AUTOMATED FARMING ADVICE</div>
            </div>

            <div className="field-art" role="img" aria-label="Conceptual illustration of a cultivated field, not live satellite imagery or measured data">
              <div className="art-top"><span>FIELD STUDY / 001</span><span className="art-more">● ● ●</span></div>
              <div className="landscape">
                <div className="terrain terrain-one" />
                <div className="terrain terrain-two" />
                <div className="terrain terrain-three" />
                <div className="terrain terrain-four" />
                <div className="terrain terrain-five" />
                <div className="terrain terrain-six" />
                <div className="landscape-grid" />
                <div className="map-point point-one"><span /></div>
                <div className="map-point point-two"><span /></div>
                <div className="map-point point-three"><span /></div>
                <div className="field-label"><span className="field-label-icon">◎</span><span>PROOF BEFORE PREDICTION<small>ILLUSTRATIVE FIELD VIEW</small></span></div>
              </div>
              <div className="art-bottom"><span>AGRI / PROOF OS</span><span>CONCEPT VISUAL · NOT LIVE DATA</span></div>
            </div>
          </section>

          <section className="overview-strip" aria-label="Prototype overview">
            <div className="overview-item"><span className="overview-index">01 / EVIDENCE</span><strong>{availableInputs}<span className="overview-unit">/5</span></strong><span>Required scenario inputs present</span></div>
            <div className="overview-item"><span className="overview-index">02 / ENGINE</span><strong className="overview-word">Transparent</strong><span>Illustrative water-balance model</span></div>
            <div className="overview-item"><span className="overview-index">03 / RECORD</span><strong className="overview-word">{activeFarmId ? "Farm selected" : "No active farm"}</strong><span>{activeFarmId ? "New passports are saved locally" : "Create or select a demo farm to save a passport"}</span></div>
          </section>

          <div id="farms" className="anchor-section"><FarmWorkspace onFarmSelected={setActiveFarmId} passportsVersion={passportsVersion} /></div>

          <div className="workspace-journey" aria-label="Your prototype workflow"><span>01 <strong>Record a farm</strong></span><span aria-hidden="true">→</span><span>02 <strong>Compare scenarios</strong></span><span aria-hidden="true">→</span><span>03 <strong>Inspect the passport</strong></span><span aria-hidden="true">→</span><span>04 <strong>Record a follow-up</strong></span></div>

          <section id="decision-lab" className="workspace-section" aria-labelledby="decision-heading">
            <div className="section-heading">
              <div><div className="section-kicker"><span className="kicker-line" /> WORKSPACE 02 / SCENARIO STUDY</div><h2 id="decision-heading">Decision lab<span className="heading-period">.</span></h2><p>Compare two water-balance scenarios with the inputs you provide. Missing evidence is flagged instead of silently assumed.</p></div>
              <span className="section-index">01 — 03</span>
            </div>
            <div className="decision-grid">
              <div className="workspace-card input-card">
                <div className="card-topline"><span>SCENARIO PARAMETERS</span><span className={"evidence-badge " + (scenarioReady ? "ready" : "")}>{availableInputs} / 5 REQUIRED</span></div>
                <h3>Start with what you know.</h3>
                <p className="card-intro">Sample inputs are prefilled for demonstration, not measured at your farm. Change or clear any value to test the evidence gate.</p>
                <form onSubmit={runComparison}>
                  <div className="form">
                    {INPUTS.map(({ key, label, hint }, index) => (
                      <label className="field" key={key} htmlFor={key}>
                        <span className="field-heading"><span>{String(index + 1).padStart(2, "0")}.</span> {label}</span>
                        <span className="input-wrap"><input id={key} type="number" inputMode="decimal" step="any" min="0" value={inputs[key]} placeholder="Enter value"
                          onChange={(event) => setInputs((old) => ({ ...old, [key]: event.target.value }))} /><span className="input-unit">mm</span></span>
                        <span className="field-hint">{hint}</span>
                      </label>
                    ))}
                  </div>
                  <div className="form-footer">
                    <button className="action" disabled={pending} type="submit">{pending ? "Comparing…" : activeFarmId ? "Compare & save passport" : "Compare (unsaved)"} <span aria-hidden="true">↗</span></button>
                    <button className="quiet-button" type="button" onClick={() => { setInputs({ ...SAMPLE }); setResult(null); setError(""); setSavedToFarm(false); }}>Restore sample</button>
                  </div>
                  <p className="input-disclaimer">Sample values are placeholders, not observations. Only farm-linked results are persisted. Calculations are illustrative—not agronomic recommendations.</p>
                </form>
              </div>

              <div className="workspace-card result-card">
                <div className="card-topline"><span>DECISION PASSPORT</span><span className="result-counter">TRACEABLE OUTPUT</span></div>
                <h3>Evidence, not guesswork.</h3>
                <p className="card-intro">{activeFarmId ? "A comparison will be saved to your selected demo farm, with its frozen input provenance." : "No farm selected: this comparison will be temporary. Select a demo farm above to save a passport."}</p>
                {error && <p className="error" role="alert">{error}</p>}
                {!result && !error && <div className="result-placeholder">
                  <div className="radar" aria-hidden="true"><span className="radar-core">◎</span><span className="radar-node radar-n1" /><span className="radar-node radar-n2" /><span className="radar-node radar-n3" /></div>
                  <span className="placeholder-label">{activeFarmId ? "FARM SELECTED · READY TO COMPARE" : "TEMPORARY COMPARISON MODE"}</span>
                  <strong>Your evidence report begins here.</strong>
                  <p>Submit your parameters to see both scenarios, missing evidence and the assumptions behind the calculation.</p>
                </div>}
                {result && <div className="result" aria-live="polite">
                  <div className={"report-state " + (result.status === "illustrative" ? "report-ready" : "")}>
                    <span className="state-icon">{result.status === "illustrative" ? "✓" : "!"}</span>
                    <span><strong>{result.status === "illustrative" ? "Illustrative comparison complete" : "More evidence required"}</strong>
                      <small>{savedToFarm ? "Saved to selected demo farm" : "Unsaved, temporary comparison"}</small></span>
                  </div>
                  {result.status === "needs_evidence"
                    ? <div className="missing-evidence"><strong>Missing inputs</strong><p>{result.missing_inputs.join(", ")}</p></div>
                    : <div className="scenarios">{result.scenarios.map((scenario) => <div className="scenario" key={scenario.label}>
                      <span className="scenario-caption">{scenario.label}</span><strong className="metric">{scenario.estimated_end_water_mm}<small> mm</small></strong>
                      <span className="metric-label">Estimated water after one day</span>
                      <div className="scenario-rule" />
                      <div className="scenario-detail"><span>Water deficit</span><strong>{scenario.estimated_deficit_to_minimum_mm} mm</strong></div>
                      <div className="scenario-detail"><span>Estimated overflow</span><strong>{scenario.estimated_overflow_mm} mm</strong></div>
                    </div>)}</div>}
                  <div className="report-disclaimer">{result.disclaimer}</div>
                  <details className="report-details"><summary>View assumptions &amp; passport ID <span aria-hidden="true">↗</span></summary>
                    <ul>{result.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
                    <small>{savedToFarm ? "Locally saved" : "Temporary"} ID: {result.passport_id}</small>
                  </details>
                </div>}
                <div className="result-footer"><span className="result-footer-dot" /> {scenarioReady ? "Required inputs entered" : "Incomplete evidence"} <span>PROOF OS / 01</span></div>
              </div>
            </div>
          </section>

          <div id="weather" className="anchor-section"><WeatherPanel /></div>

          <footer className="site-footer"><span>AGRINEXUS / PROOFOS</span><p>Local prototype. Manual data is unverified. Never rely on illustrative outputs for real irrigation decisions.</p><a href="#overview">Back to top ↑</a></footer>
        </div>
      </div>
    </main>
  );
}
