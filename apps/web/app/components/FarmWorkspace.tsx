"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Farm = { id: string; name: string; crop: string; region: string; area_ha: number; created_at: string };
type Observation = { id: string; farm_id: string; soil_moisture_pct: number; recorded_at: string; source: string; note: string };
type Snapshot = {
  latest_observation: Observation | null;
  observation_status: string;
  observation_age_hours: number | null;
  warning: string;
};
type Decision = {
  status: "needs_evidence" | "illustrative";
  missing_inputs: string[];
  scenarios: { label: string; estimated_end_water_mm: number; estimated_deficit_to_minimum_mm: number; estimated_overflow_mm: number; applied_irrigation_mm: number }[];
  assumptions: string[];
  disclaimer: string;
};
type Passport = { id: string; farm_id: string; created_at: string; request: Record<string, number | null>; decision: Decision; warning: string };
type PassportDetail = {
  passport: Passport;
  evidence: {
    captured_at: string;
    model_version: string;
    input_sources: Record<string, string>;
    latest_observation: Observation | null;
    observation_used_in_calculation: boolean;
    warning: string;
  } | null;
  followups: {
    id: string; created_at: string; action_taken: string; note: string;
    observation: Observation | null; verification: string;
  }[];
  warning: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const dateLabel = (date: string) => new Date(date).toLocaleString();
const friendlyField = (key: string) => key.replace(/_/g, " ").replace(" mm", " (mm)");

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API + path, init);
  } catch {
    throw new Error("Local API is unreachable. Start FastAPI on port 8000, then retry.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const message = typeof detail === "string" ? detail
      : Array.isArray(detail) ? detail.map((entry: { msg?: string }) => entry.msg ?? "Invalid field").join("; ")
      : "Request failed (HTTP " + response.status + ")";
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export default function FarmWorkspace({ onFarmSelected, passportsVersion }: {
  onFarmSelected: (farmId: string | null) => void;
  passportsVersion: number;
}) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [selected, setSelected] = useState("");
  const [observations, setObservations] = useState<Observation[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [passports, setPassports] = useState<Passport[]>([]);
  const [detail, setDetail] = useState<PassportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [name, setName] = useState("");
  const [crop, setCrop] = useState("");
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const [moisture, setMoisture] = useState("");
  const [note, setNote] = useState("");
  const [action, setAction] = useState("not_taken");
  const [followupNote, setFollowupNote] = useState("");
  const [followupObservation, setFollowupObservation] = useState("");
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const reloadFarms = useCallback(async () => {
    setLoadingFarms(true);
    try {
      setFarms(await requestJson<Farm[]>("/v1/farms"));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load demo farms.");
    } finally {
      setLoadingFarms(false);
    }
  }, []);

  useEffect(() => { void reloadFarms(); }, [reloadFarms]);

  const reloadContext = useCallback(async (id: string) => {
    const base = "/v1/farms/" + encodeURIComponent(id);
    const [entries, state, saved] = await Promise.all([
      requestJson<Observation[]>(base + "/observations"),
      requestJson<Snapshot>(base + "/snapshot"),
      requestJson<Passport[]>(base + "/passports"),
    ]);
    setObservations(entries);
    setSnapshot(state);
    setPassports(saved);
  }, []);

  async function selectFarm(id: string) {
    setSelected(id);
    onFarmSelected(id || null);
    setSnapshot(null);
    setObservations([]);
    setPassports([]);
    setDetail(null);
    setDetailError("");
    setMessage("");
    setError("");
    if (!id) return;
    setLoadingContext(true);
    try {
      await reloadContext(id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load farm records.");
    } finally {
      setLoadingContext(false);
    }
  }

  async function saveFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(Number(area)) || Number(area) <= 0) {
      setError("Enter a valid farm area in hectares.");
      return;
    }
    setPending(true); setError(""); setMessage("");
    try {
      const created = await requestJson<Farm>("/v1/farms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), crop: crop.trim(), region: region.trim(), area_ha: Number(area) }),
      });
      setFarms((current) => [created, ...current]);
      setName(""); setCrop(""); setRegion(""); setArea("");
      await selectFarm(created.id);
      setMessage("Demo farm saved locally. It is now selected for the next comparison.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create farm.");
    } finally {
      setPending(false);
    }
  }

  async function saveObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setPending(true); setError(""); setMessage("");
    try {
      await requestJson<Observation>("/v1/farms/" + encodeURIComponent(selected) + "/observations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soil_moisture_pct: Number(moisture), note: note.trim() }),
      });
      await reloadContext(selected);
      setMoisture(""); setNote("");
      setMessage("Manual observation recorded. This is not a verified sensor measurement.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record observation.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!selected || passportsVersion === 0) return;
    let active = true;
    requestJson<Passport[]>("/v1/farms/" + encodeURIComponent(selected) + "/passports")
      .then((items) => { if (active) setPassports(items); })
      .catch(() => { if (active) setError("Could not refresh passports. Select the farm again to retry."); });
    return () => { active = false; };
  }, [selected, passportsVersion]);

  async function openPassport(id: string) {
    if (detail?.passport.id === id) { setDetail(null); setDetailError(""); return; }
    if (!selected) return;
    setLoadingDetail(true); setDetail(null); setDetailError(""); setMessage("");
    try {
      setDetail(await requestJson<PassportDetail>("/v1/farms/" + encodeURIComponent(selected) + "/passports/" + encodeURIComponent(id)));
      setFollowupNote(""); setFollowupObservation(""); setAction("not_taken");
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : "Could not load passport.");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function recordFollowup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !detail) return;
    setPending(true); setDetailError(""); setMessage("");
    const base = "/v1/farms/" + encodeURIComponent(selected) + "/passports/" + encodeURIComponent(detail.passport.id);
    try {
      await requestJson(base + "/followups", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_taken: action, note: followupNote.trim(), observation_id: followupObservation || null }),
      });
      setDetail(await requestJson<PassportDetail>(base));
      setFollowupNote(""); setFollowupObservation(""); setAction("not_taken");
      setMessage("Self-reported follow-up saved. No verified outcome is implied.");
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : "Could not save follow-up.");
    } finally {
      setPending(false);
    }
  }

  const activeFarm = farms.find((farm) => farm.id === selected);
  const laterObservations = detail
    ? observations.filter((item) => new Date(item.recorded_at).getTime() >= new Date(detail.passport.created_at).getTime())
    : [];

  return (
    <section className="farm-workspace" aria-labelledby="farm-heading">
      <div className="eyebrow">WORKSPACE 02 / FIELD CONTEXT</div>
      <h2 id="farm-heading">Your farm, in context.</h2>
      <p className="muted">Create or select a demo farm to save scenario passports. Records remain in this local SQLite database. There is no account isolation: use sample information and keep the API private.</p>

      <div className="farm-intro-grid">
        <div className="panel farm-create-card">
          <div className="card-topline"><span>STEP 01 / CREATE CONTEXT</span><span className="evidence-badge ready">LOCAL ONLY</span></div>
          <h2>Register a demo farm</h2>
          <form onSubmit={saveFarm}>
            <div className="form">
              <label className="field">Farm name<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sample plot A" /></label>
              <label className="field">Crop<input required minLength={2} maxLength={80} value={crop} onChange={(event) => setCrop(event.target.value)} placeholder="Cotton" /></label>
              <label className="field">General region<input required minLength={2} maxLength={100} value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Example region, not exact coordinates" /></label>
              <label className="field">Area · hectares<input required type="number" min="0.01" max="100000" step="any" value={area} onChange={(event) => setArea(event.target.value)} placeholder="1.2" /></label>
            </div>
            <button className="action" type="submit" disabled={pending}>{pending ? "Saving…" : "Create & select farm"} <span aria-hidden="true">↗</span></button>
          </form>
        </div>

        <div className="panel farm-select-card">
          <div className="card-topline"><span>STEP 02 / ACTIVE FARM</span><span className="evidence-badge">{farms.length} SAVED</span></div>
          <h2>Select a farm</h2>
          <p className="muted">A new comparison is saved only when a farm is selected. Otherwise it remains temporary.</p>
          {loadingFarms ? <p className="muted" role="status">Loading saved farms…</p> : farms.length === 0
            ? <div className="farm-empty"><span aria-hidden="true">⌁</span><strong>No demo farm yet</strong><p>Create your first farm using the form alongside.</p></div>
            : <div className="farm-list" role="group" aria-label="Saved demo farms">
              {farms.map((farm) => <button key={farm.id} type="button"
                className={"farm-choice" + (farm.id === selected ? " active" : "")}
                aria-pressed={farm.id === selected}
                onClick={() => void selectFarm(farm.id)}>
                <span className="farm-choice-leading" aria-hidden="true">✳</span>
                <span className="farm-choice-copy"><strong>{farm.name}</strong><small>{farm.crop} · {farm.region} · {farm.area_ha} ha</small></span>
                <span className="farm-choice-end">{farm.id === selected ? "SELECTED ✓" : "SELECT →"}</span>
              </button>)}
            </div>}
          {activeFarm && <div className="farm-active-banner" role="status"><span className="lp-live-dot" /> Active farm: <strong>{activeFarm.name}</strong><a href="#decision-lab">Compare scenarios ↗</a></div>}
        </div>
      </div>

      {loadingContext && <div className="panel farm-context-card" role="status">Loading field observations and saved passports…</div>}
      {activeFarm && !loadingContext && <div className="farm-context-section">
        <div className="farm-context-banner"><div><span className="eyebrow">ACTIVE FIELD RECORD</span><h3>{activeFarm.name}</h3><p>{activeFarm.crop} · {activeFarm.region} · {activeFarm.area_ha} hectares</p></div><span className="farm-context-label">MANUALLY ENTERED / LOCAL</span></div>
        <div className="farm-context-grid">
          <div className="panel farm-context-card">
            <div className="card-topline"><span>03 / FIELD OBSERVATIONS</span><span className="evidence-badge">{observations.length} RECORDS</span></div>
            <h2>Capture an observation.</h2>
            <p className="muted">Soil moisture (%) below is a manual estimate; it is <strong>not</strong> silently converted into root-zone water (mm) for comparison.</p>
            {snapshot && <div className="farm-snapshot"><span className="farm-snapshot-title">LATEST FIELD SNAPSHOT</span><strong>{snapshot.latest_observation ? snapshot.latest_observation.soil_moisture_pct + "% moisture" : "No reading recorded"}</strong><p>{snapshot.latest_observation ? "Manual / unverified · " + dateLabel(snapshot.latest_observation.recorded_at) : "Add an observation to create a timestamped record."}</p><small>{snapshot.observation_status.replace(/_/g, " ")}{snapshot.observation_age_hours !== null ? " · " + snapshot.observation_age_hours + "h old" : ""}</small></div>}
            <form className="farm-observation-form" onSubmit={saveObservation}>
              <label className="field">Soil moisture (%)
                <input required type="number" min="0" max="100" step="any" value={moisture} onChange={(event) => setMoisture(event.target.value)} placeholder="31" />
              </label>
              <label className="field">Observation note · optional
                <input maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Example: manual sample reading" />
              </label>
              <button type="submit" className="action" disabled={pending}>{pending ? "Saving…" : "Record"}</button>
            </form>
            <div className="observation-log">
              <h3>Observation history</h3>
              {observations.length === 0 ? <p className="muted">No observations yet. New records will appear here.</p> :
                observations.slice(0, 8).map((observation) => <div className="observation-entry" key={observation.id}><span className="observation-bullet" /><div><strong>{observation.soil_moisture_pct}% soil moisture</strong><p>{dateLabel(observation.recorded_at)} · manual, unverified{observation.note ? " · " + observation.note : ""}</p></div></div>)}
            </div>
          </div>

          <div className="panel farm-context-card">
            <div className="card-topline"><span>04 / SAVED DECISIONS</span><span className="evidence-badge ready">{passports.length} PASSPORTS</span></div>
            <h2>Your evidence trail.</h2>
            <p className="muted">Select this farm before comparing scenarios. Open any saved record to inspect its captured evidence and add a self-reported follow-up.</p>
            {passports.length === 0 ? <div className="farm-empty"><span aria-hidden="true">▤</span><strong>No passports saved</strong><p><a href="#decision-lab">Run a comparison ↗</a> with this farm selected to create a record.</p></div> :
              <div className="passport-list">{passports.map((passport, index) => <button
                key={passport.id} type="button" aria-expanded={detail?.passport.id === passport.id}
                className={"passport-choice" + (detail?.passport.id === passport.id ? " active" : "")}
                onClick={() => void openPassport(passport.id)}>
                <span className="passport-index">{String(passports.length - index).padStart(2, "0")}</span>
                <span><strong>{passport.decision.status === "illustrative" ? "Illustrative scenario record" : "Missing-evidence record"}</strong><small>{dateLabel(passport.created_at)}</small></span>
                <span className="passport-arrow">{detail?.passport.id === passport.id ? "−" : "↗"}</span>
              </button>)}</div>}
            {loadingDetail && <p className="muted" role="status">Loading passport and frozen evidence…</p>}
            {detailError && <p className="error" role="alert">{detailError}</p>}
            {detail && <div className="passport-detail" aria-label="Selected decision passport">
              <div className="passport-detail-heading"><div><span className="eyebrow">PASSPORT / DETAIL</span><h3>{detail.passport.decision.status === "illustrative" ? "Scenario comparison" : "Evidence incomplete"}</h3></div><button type="button" className="quiet-button" onClick={() => setDetail(null)}>Close ×</button></div>
              <p className="passport-id">ID · {detail.passport.id}</p>
              <span className="passport-meta">Saved locally · {dateLabel(detail.passport.created_at)}</span>
              {detail.passport.decision.status === "needs_evidence" ? <div className="missing-evidence"><strong>Missing inputs</strong><p>{detail.passport.decision.missing_inputs.map(friendlyField).join(", ")}</p></div> :
                <div className="passport-scenario-grid">{detail.passport.decision.scenarios.map((scenario) => <div key={scenario.label}><small>{scenario.label}</small><strong>{scenario.estimated_end_water_mm} mm</strong><span>Illustrative end-of-day water</span><p>Deficit: {scenario.estimated_deficit_to_minimum_mm} mm<br />Overflow: {scenario.estimated_overflow_mm} mm</p></div>)}</div>}
              <h4>Frozen evidence snapshot</h4>
              {detail.evidence ? <>
                <p className="muted">Captured: {dateLabel(detail.evidence.captured_at)} · Model: {detail.evidence.model_version}</p>
                <div className="passport-provenance">{Object.entries(detail.evidence.input_sources).map(([key, source]) => <div key={key}><span>{friendlyField(key)}</span><strong>{source.replace(/_/g, " ")}</strong></div>)}</div>
                <p className="muted">Observation at save: {detail.evidence.latest_observation ? detail.evidence.latest_observation.soil_moisture_pct + "% manual, unverified · " + dateLabel(detail.evidence.latest_observation.recorded_at) : "None recorded"}.</p>
                <p className="muted">{detail.evidence.warning}</p>
              </> : <p className="muted">This earlier record has no historical evidence snapshot. Provenance has not been reconstructed.</p>}
              <details className="report-details"><summary>Model assumptions and limitations ↗</summary><ul>{detail.passport.decision.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul><p>{detail.passport.decision.disclaimer}</p></details>
              <div className="followup-section"><h4>Record a self-reported follow-up</h4><p className="muted">Describe an action, if any. A later observation can be linked only when it belongs to this farm and was recorded after the passport. This does not validate a farming outcome.</p>
                <form onSubmit={recordFollowup} className="followup-form">
                  <label className="field">Action reported
                    <select value={action} onChange={(event) => setAction(event.target.value)}>
                      <option value="not_taken">No action reported</option><option value="waited">Waited</option><option value="irrigated">Irrigated</option><option value="other">Other</option>
                    </select>
                  </label>
                  <label className="field">Later observation · optional
                    <select value={followupObservation} onChange={(event) => setFollowupObservation(event.target.value)}>
                      <option value="">No observation linked</option>
                      {laterObservations.map((observation) => <option key={observation.id} value={observation.id}>{observation.soil_moisture_pct}% · {dateLabel(observation.recorded_at)}</option>)}
                    </select>
                  </label>
                  <label className="field followup-note">Optional note
                    <textarea rows={2} maxLength={500} value={followupNote} onChange={(event) => setFollowupNote(event.target.value)} placeholder="What was reported? Do not enter private or identifying data." />
                  </label>
                  <button type="submit" className="action" disabled={pending}>{pending ? "Saving…" : "Save follow-up"}</button>
                </form>
                <div className="followup-history"><h4>Follow-up history</h4>{detail.followups.length === 0 ? <p className="muted">No follow-ups recorded yet.</p> : detail.followups.map((entry) => <div key={entry.id} className="followup-entry"><strong>{entry.action_taken.replace(/_/g, " ")} · self-reported</strong><small>{dateLabel(entry.created_at)}</small>{entry.note && <p>{entry.note}</p>}<p>{entry.observation ? "Linked later manual observation: " + entry.observation.soil_moisture_pct + "% (" + dateLabel(entry.observation.recorded_at) + ")" : "No observation linked"}</p></div>)}</div>
              </div>
            </div>}
          </div>
        </div>
      </div>}
      {message && <p className="workspace-message" role="status">{message}</p>}
      {error && <div className="workspace-error" role="alert"><p>{error}</p><button type="button" className="quiet-button" onClick={() => { if (selected) void selectFarm(selected); else void reloadFarms(); }}>Retry ↗</button></div>}
    </section>
  );
}
