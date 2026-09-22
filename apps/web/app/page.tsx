"use client";

import { FormEvent, useEffect, useState } from "react";

type Field = "root_zone_water_mm" | "field_capacity_mm" | "minimum_water_mm" |
  "estimated_daily_demand_mm" | "forecast_rain_mm" | "proposed_irrigation_mm";
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
const INPUTS: { key: Field; label: string }[] = [
  { key: "root_zone_water_mm", label: "Current root-zone water (mm)" },
  { key: "field_capacity_mm", label: "Field water capacity (mm)" },
  { key: "minimum_water_mm", label: "User-supplied minimum water (mm)" },
  { key: "estimated_daily_demand_mm", label: "Estimated daily demand (mm)" },
  { key: "forecast_rain_mm", label: "Forecast rainfall (mm)" },
  { key: "proposed_irrigation_mm", label: "Proposed irrigation (mm)" },
];
const SAMPLE: Record<Field, string> = {
  root_zone_water_mm: "35", field_capacity_mm: "60", minimum_water_mm: "25",
  estimated_daily_demand_mm: "7", forecast_rain_mm: "2", proposed_irrigation_mm: "10",
};

export default function Home() {
  const [inputs, setInputs] = useState<Record<Field, string>>({ ...SAMPLE });
  const [result, setResult] = useState<Decision | null>(null);
  const [health, setHealth] = useState("Checking backend…");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(API + "/health", { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error("API unavailable"); return res.json(); })
      .then(() => setHealth("Connected to shared API"))
      .catch(() => { if (!controller.signal.aborted) setHealth("Backend offline"); });
    return () => controller.abort();
  }, []);

  async function runComparison(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setResult(null); setPending(true);
    const payload: Record<string, number | null> = {};
    for (const { key } of INPUTS) {
      const raw = inputs[key].trim();
      payload[key] = raw === "" ? null : Number(raw);
      if (raw !== "" && !Number.isFinite(payload[key])) {
        setError("Enter valid numeric values."); setPending(false); return;
      }
    }
    if (payload.proposed_irrigation_mm === null) payload.proposed_irrigation_mm = 10;
    try {
      const response = await fetch(API + "/v1/decisions/irrigation", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error("Invalid data: check that water levels do not exceed capacity.");
      setResult(data as Decision);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to backend.");
    } finally { setPending(false); }
  }

  return (
    <main className="shell">
      <nav className="nav"><span className="brand">AgriNexus <span style={{ color: "#9de6b0" }}>ProofOS</span></span><span className="tag">v0.1 · web + Android</span></nav>
      <section className="hero"><div className="eyebrow">Evidence-driven agriculture · Foundation demo</div>
        <h1>Better farming begins with <em>better evidence.</em></h1>
        <p className="subtitle">Our first working slice: enter field measurements, compare two illustrative water-balance scenarios, and see exactly which evidence is missing.</p>
      </section>
      <div className="notice" role="note">Prototype only: all inputs are manually supplied and unverified. The calculations are illustrative, not crop-specific agronomic advice. Do not make irrigation decisions from this demo.</div>
      <div className="status" aria-live="polite">● {health}</div>
      <section className="columns">
        <div className="panel"><h2>Decision inputs</h2><p className="muted">Sample values are placeholders. Clear any required field to see the evidence gate.</p>
          <form onSubmit={runComparison}>
            <div className="form">{INPUTS.map(({ key, label }) => <label className="field" key={key}>{label}
              <input type="number" inputMode="decimal" step="any" min="0" value={inputs[key]}
                onChange={(event) => setInputs((old) => ({ ...old, [key]: event.target.value }))} />
            </label>)}</div>
            <button className="action" disabled={pending} type="submit">{pending ? "Comparing…" : "Compare scenarios →"}</button>
          </form>
        </div>
        <div className="panel"><h2>Evidence & scenario report</h2>
          {!result && !error && <p className="muted">Run a comparison to view estimated water levels, deficits, and limitations. No automated advice is issued.</p>}
          {error && <p className="error" role="alert">{error}</p>}
          {result && <div className="result" aria-live="polite">
            {result.status === "needs_evidence"
              ? <><strong>Additional evidence needed</strong><p className="muted">Missing: {result.missing_inputs.join(", ")}</p></>
              : <><div className="scenarios">{result.scenarios.map((s) => <div className="scenario" key={s.label}>
                <strong>{s.label}</strong><div className="metric">{s.estimated_end_water_mm} mm</div><div className="metric-label">Estimated water after one day</div>
                <p className="muted">Deficit to entered minimum: {s.estimated_deficit_to_minimum_mm} mm</p>
                <p className="muted">Estimated overflow: {s.estimated_overflow_mm} mm</p>
              </div>)}</div></>}
            <p className="muted"><strong>Limitations:</strong> {result.disclaimer}</p>
            <details><summary>Input assumptions & provisional ID</summary><ul>{result.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
              <small>Ephemeral record: {result.passport_id}. Not saved to a database.</small></details>
          </div>}
        </div>
      </section>
    </main>
  );
}
