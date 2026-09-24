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
const dateLabel = (value: string) => new Date(value).toLocaleString();

export default function WeatherPanel() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadForecast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setForecast(null);
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)
      || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError("Enter a valid approximate latitude (−90 to 90) and longitude (−180 to 180).");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(API + "/v1/weather/forecast?" +
        new URLSearchParams({ latitude: String(lat), longitude: String(lon) }));
      const data = await response.json();
      if (!response.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : "Forecast unavailable. Try again later.";
        throw new Error(detail);
      }
      setForecast(data as Forecast);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to reach the local API or weather provider.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="weather-panel" aria-labelledby="weather-heading">
      <div className="weather-heading">
        <div>
          <span className="eyebrow">WORKSPACE 03 / EXTERNAL CONTEXT</span>
          <h2 id="weather-heading">Weather, with its source.</h2>
          <p className="muted">Inspect a provider forecast for an approximate area. It is a modeled regional estimate, not a reading from your field or a verified input to the scenario engine.</p>
        </div>
        <span className="weather-heading-mark" aria-hidden="true">☼</span>
      </div>

      <div className="weather-content">
        <div className="panel weather-query">
          <div className="card-topline"><span>REQUEST A FORECAST</span><span className="evidence-badge ready">ON DEMAND</span></div>
          <h3>Look beyond the field.</h3>
          <p className="muted">Enter approximate coordinates for a general area, not an exact private farm location. Only this request sends rounded coordinates to Open-Meteo; AgriNexus does not save them.</p>
          <form className="weather-form" onSubmit={loadForecast}>
            <label className="field">Approximate latitude
              <input type="number" inputMode="decimal" step="any" min="-90" max="90" required placeholder="e.g. 21.20" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
            </label>
            <label className="field">Approximate longitude
              <input type="number" inputMode="decimal" step="any" min="-180" max="180" required placeholder="e.g. 81.30" value={longitude} onChange={(event) => setLongitude(event.target.value)} />
            </label>
            <button className="action" disabled={loading} type="submit">{loading ? "Fetching forecast…" : "Fetch forecast"} <span aria-hidden="true">↗</span></button>
          </form>
          {error && <div className="error" role="alert">{error}<button type="button" className="quiet-button" onClick={() => setError("")}>Dismiss ×</button></div>}
          <div className="weather-source-note"><span className="weather-source-dot" /> EXTERNAL SOURCE · OPEN-METEO <span>NO AUTOMATED IRRIGATION ADVICE</span></div>
        </div>

        <div className="panel weather-report">
          <div className="card-topline"><span>FORECAST REPORT</span><span className="evidence-badge">{forecast ? "RECEIVED" : "NOT REQUESTED"}</span></div>
          {loading ? <div className="weather-empty" role="status"><span className="weather-loading" aria-hidden="true">☼</span><strong>Contacting weather provider…</strong><p>Requesting a modeled forecast for your entered area.</p></div>
            : !forecast ? <div className="weather-empty"><span aria-hidden="true">☼</span><strong>The forecast begins here.</strong><p>Submit approximate coordinates to view temperature, humidity, precipitation and source metadata.</p></div>
            : <div className="weather-result" aria-live="polite">
              <h3>Regional forecast <span>↗</span></h3>
              <p className="weather-timestamp">RETRIEVED {dateLabel(forecast.retrieved_at_utc)}</p>
              <div className="weather-metrics">
                <div><span className="metric">{forecast.temperature_c === null ? "—" : forecast.temperature_c + "°C"}</span><span className="metric-label">Provider temperature</span></div>
                <div><span className="metric">{forecast.relative_humidity_pct === null ? "—" : forecast.relative_humidity_pct + "%"}</span><span className="metric-label">Provider relative humidity</span></div>
                <div><span className="metric">{forecast.expected_precipitation_next_24h_mm} <small>mm</small></span><span className="metric-label">Next 24 hourly forecast precipitation total</span></div>
              </div>
              <details className="weather-provenance"><summary>Source, coverage &amp; limitations <span aria-hidden="true">↗</span></summary>
                <div className="weather-provenance-grid"><span>Requested approximate coordinates</span><strong>{forecast.requested_latitude}, {forecast.requested_longitude}</strong><span>Provider grid coordinates</span><strong>{forecast.grid_latitude}, {forecast.grid_longitude}</strong><span>Forecast time window</span><strong>{dateLabel(forecast.forecast_start_utc)} — {dateLabel(forecast.forecast_end_utc)}</strong></div>
                <p>{forecast.warning}</p>
                <a href={forecast.source_url} target="_blank" rel="noopener noreferrer">Read {forecast.source} source documentation ↗</a>
              </details>
              <p className="weather-limitation">This forecast is not automatically used in the Decision Lab. Its rainfall input remains manually entered and unverified.</p>
            </div>}
        </div>
      </div>
    </section>
  );
}
