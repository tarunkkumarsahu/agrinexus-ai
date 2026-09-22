"use client";

import { FormEvent, useState } from "react";

type Forecast = {
  source: string;
  source_url: string;
  retrieved_at_utc: string;
  forecast_start_utc: string;
  forecast_end_utc: string;
  requested_latitude: number;
  requested_longitude: number;
  grid_latitude: number;
  grid_longitude: number;
  temperature_c: number | null;
  relative_humidity_pct: number | null;
  expected_precipitation_next_24h_mm: number;
  warning: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function WeatherPanel() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadForecast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForecast(null);
    setError("");
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)
      || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError("Enter valid latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(API + "/v1/weather/forecast?" +
        new URLSearchParams({ latitude: String(lat), longitude: String(lon) }));
      const data = await response.json();
      if (!response.ok) throw new Error(
        typeof data?.detail === "string" ? data.detail : "Forecast unavailable."
      );
      setForecast(data as Forecast);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Forecast could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel weather-panel" aria-labelledby="weather-heading">
      <div className="eyebrow">Milestone 3 · External evidence</div>
      <h2 id="weather-heading">Weather intelligence · live API</h2>
      <p className="muted">
        Enter approximate coordinates for a general area (not a private field location).
        Coordinates are sent to Open-Meteo for this request only and are not saved in AgriNexus.
        This is a modeled forecast, not an observation at the farm.
      </p>
      <form className="weather-form" onSubmit={loadForecast}>
        <label className="field">Latitude
          <input type="number" inputMode="decimal" step="any" min="-90" max="90" required
            placeholder="21.20" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
        </label>
        <label className="field">Longitude
          <input type="number" inputMode="decimal" step="any" min="-180" max="180" required
            placeholder="81.30" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
        </label>
        <button className="action" disabled={loading} type="submit">
          {loading ? "Fetching forecast…" : "Get real forecast"}
        </button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {forecast && <div className="result" aria-live="polite">
        <div className="weather-metrics">
          <div><span className="metric">{forecast.temperature_c === null ? "—" : forecast.temperature_c + "°C"}</span>
            <span className="metric-label">Reported near-surface air temperature</span></div>
          <div><span className="metric">{forecast.relative_humidity_pct === null ? "—" : forecast.relative_humidity_pct + "%"}</span>
            <span className="metric-label">Reported near-surface relative humidity</span></div>
          <div><span className="metric">{forecast.expected_precipitation_next_24h_mm} mm</span>
            <span className="metric-label">Sum of provider's next 24 hourly precipitation forecasts</span></div>
        </div>
        <p className="muted">
          Forecast hours: {forecast.forecast_start_utc} to {forecast.forecast_end_utc}.
          Retrieved: {new Date(forecast.retrieved_at_utc).toLocaleString()}.
        </p>
        <p className="muted">
          Requested approximate coordinates: {forecast.requested_latitude}, {forecast.requested_longitude}.
          Provider weather-grid coordinates: {forecast.grid_latitude}, {forecast.grid_longitude}.
        </p>
        <p className="muted">{forecast.warning}</p>
        <a href={forecast.source_url} target="_blank" rel="noopener noreferrer">
          Source: {forecast.source} forecast documentation ↗
        </a>
        <p className="muted">
          The comparison form above still uses manually entered rainfall; this forecast has NOT
          been automatically converted into field-specific irrigation advice.
        </p>
      </div>}
    </section>
  );
}
