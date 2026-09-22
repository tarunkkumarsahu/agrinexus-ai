"use client";

import { FormEvent, useEffect, useState } from "react";

type Snapshot = {
  latest_observation: Observation | null;
  observation_status: string;
  observation_age_hours: number | null;
  warning: string;
};
type PassportSummary = {
  id: string;
  created_at: string;
  decision: { status: string; scenarios: unknown[] };
};

type Farm = {
  id: string;
  name: string;
  crop: string;
  region: string;
  area_ha: number;
  created_at: string;
};
type Observation = {
  id: string;
  soil_moisture_pct: number;
  recorded_at: string;
  source: string;
  note: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API + url, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      response.status === 404 ? "Farm not found" :
      body?.detail && typeof body.detail === "string" ? body.detail :
      "Request failed (HTTP " + response.status + ")"
    );
  }
  return response.json() as Promise<T>;
}

export default function FarmWorkspace({ onFarmSelected, passportsVersion }: {
  onFarmSelected: (farmId: string | null) => void;
  passportsVersion: number;
}) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [observations, setObservations] = useState<Observation[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [passports, setPassports] = useState<PassportSummary[]>([]);
  const [name, setName] = useState("");
  const [crop, setCrop] = useState("");
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const [moisture, setMoisture] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    requestJson<Farm[]>("/v1/farms")
      .then(setFarms)
      .catch(() => setError("Cannot load saved farms. Ensure the local API is running."));
  }, []);

  async function selectFarm(id: string) {
    setSelected(id);
    onFarmSelected(id);
    setSnapshot(null);
    setPassports([]);
    setError("");
    try {
      const farmUrl = "/v1/farms/" + encodeURIComponent(id);
      const [items, state, saved] = await Promise.all([
        requestJson<Observation[]>(farmUrl + "/observations"),
        requestJson<Snapshot>(farmUrl + "/snapshot"),
        requestJson<PassportSummary[]>(farmUrl + "/passports"),
      ]);
      setObservations(items);
      setSnapshot(state);
      setPassports(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot load observations");
    }
  }

  async function saveFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage(""); setPending(true);
    try {
      const created = await requestJson<Farm>("/v1/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, crop, region, area_ha: Number(area) }),
      });
      setFarms((prev) => [created, ...prev]);
      setName(""); setCrop(""); setRegion(""); setArea("");
      setSelected(created.id); onFarmSelected(created.id);
      setObservations([]); setPassports([]);
      setSnapshot(await requestJson<Snapshot>("/v1/farms/" + encodeURIComponent(created.id) + "/snapshot"));
      setMessage("Farm saved to the local development database.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Farm could not be saved");
    } finally {
      setPending(false);
    }
  }

  async function saveObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(""); setMessage(""); setPending(true);
    try {
      const saved = await requestJson<Observation>(
        "/v1/farms/" + encodeURIComponent(selected) + "/observations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ soil_moisture_pct: Number(moisture), note }),
        }
      );
      setObservations((prev) => [saved, ...prev]);
      setSnapshot(await requestJson<Snapshot>("/v1/farms/" + encodeURIComponent(selected) + "/snapshot"));
      setMoisture(""); setNote("");
      setMessage("Manual observation saved. It is NOT sensor-verified.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Observation could not be saved");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    requestJson<PassportSummary[]>("/v1/farms/" + encodeURIComponent(selected) + "/passports")
      .then(setPassports)
      .catch(() => setError("Could not refresh saved passports."));
  }, [selected, passportsVersion]);

  const activeFarm = farms.find((farm) => farm.id === selected);

  return (
    <section className="farm-workspace" aria-labelledby="farm-heading">
      <div className="eyebrow">Milestone 2 · Local farm records</div>
      <h2 id="farm-heading">Farm workspace</h2>
      <p className="muted">
        Save a demo farm and log manual observations. Data is stored in a LOCAL SQLite database.
        No accounts or access control exist yet; do not enter private farm information or expose this API publicly.
        Saved observations are NOT automatically used by the illustrative scenario engine.
      </p>
      <div className="columns">
        <div className="panel">
          <h2>Register a demo farm</h2>
          <form onSubmit={saveFarm}>
            <div className="form">
              <label className="field">Farm name
                <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Demo plot A" />
              </label>
              <label className="field">Crop
                <input required minLength={2} maxLength={80} value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="Cotton" />
              </label>
              <label className="field">General region (not exact location)
                <input required minLength={2} maxLength={100} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Demo region" />
              </label>
              <label className="field">Area in hectares
                <input required type="number" min="0.01" max="100000" step="any" value={area} onChange={(e) => setArea(e.target.value)} placeholder="1.2" />
              </label>
            </div>
            <button className="action" type="submit" disabled={pending}>{pending ? "Saving…" : "Save demo farm"}</button>
          </form>
        </div>
        <div className="panel">
          <h2>Saved farms</h2>
          {farms.length === 0 && <p className="muted">No farms saved yet.</p>}
          <div className="farm-list">
            {farms.map((farm) => (
              <button
                type="button"
                className={"farm-choice" + (farm.id === selected ? " active" : "")}
                onClick={() => void selectFarm(farm.id)}
                key={farm.id}
              >
                <strong>{farm.name}</strong>
                <span>{farm.crop} · {farm.region} · {farm.area_ha} ha</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {activeFarm && <div className="panel farm-observations">
        <h2>Farm context snapshot · {activeFarm.name}</h2>
        {snapshot && <div className="farm-snapshot">
          <p className="muted">Observation status: <strong>{snapshot.observation_status}</strong>
            {snapshot.observation_age_hours !== null ? " · " + snapshot.observation_age_hours + " hours old" : ""}</p>
          <p className="muted">Latest manually entered soil-moisture reading: {snapshot.latest_observation
            ? snapshot.latest_observation.soil_moisture_pct + "%"
            : "No observation recorded"}.</p>
          <p className="muted">{snapshot.warning}</p>
        </div>}
        <h2>Manual field observations</h2>
        <p className="muted">These values are entered by a person, not collected or validated by sensors.</p>
        <form onSubmit={saveObservation} className="farm-observation-form">
          <label className="field">Soil moisture (%)
            <input required type="number" min="0" max="100" step="any" value={moisture} onChange={(e) => setMoisture(e.target.value)} placeholder="31" />
          </label>
          <label className="field">Optional note
            <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Manual sample reading" />
          </label>
          <button className="action" type="submit" disabled={pending}>{pending ? "Saving…" : "Record observation"}</button>
        </form>
        <div className="farm-list">
          {observations.length === 0 ? <p className="muted">No observations recorded.</p> : observations.map((observation) => (
            <div className="farm-choice" key={observation.id}>
              <strong>{observation.soil_moisture_pct}% · manual, unverified</strong>
              <span>{new Date(observation.recorded_at).toLocaleString()} {observation.note ? "· " + observation.note : ""}</span>
            </div>
          ))}
        </div>
        <div className="farm-passports">
          <h2>Saved decision passports</h2>
          <p className="muted">Select this farm, then use the scenario comparison form above to save an illustrative decision record here.</p>
          {passports.length === 0 && <p className="muted">No saved passports.</p>}
          {passports.map((passport) => <div key={passport.id} className="farm-choice">
            <strong>{passport.decision.status === "illustrative" ? "Illustrative scenario comparison" : "Incomplete evidence"}</strong>
            <span>{new Date(passport.created_at).toLocaleString()} · {passport.id}</span>
          </div>)}
        </div>
      </div>}
      {message && <p className="status" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
