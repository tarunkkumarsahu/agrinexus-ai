"""Source-attributed public weather forecast proxy; no farm coordinates are saved."""
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


class WeatherForecast(BaseModel):
    source: str = "Open-Meteo"
    source_url: str = "https://open-meteo.com/en/docs"
    retrieved_at_utc: str
    forecast_start_utc: str
    forecast_end_utc: str
    requested_latitude: float
    requested_longitude: float
    grid_latitude: float
    grid_longitude: float
    temperature_c: float | None
    relative_humidity_pct: float | None
    expected_precipitation_next_24h_mm: float
    precipitation_units: str = "mm"
    warning: str = (
        "Weather-model forecast for the selected approximate location, not a field measurement. "
        "This value is not automatically used for irrigation decisions."
    )


def _number(value: Any, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("Missing or invalid weather field: " + name)
    result = float(value)
    if not (-1e100 < result < 1e100):
        raise ValueError("Non-finite weather field: " + name)
    return result


def _parse_forecast(data: dict, lat: float, lon: float) -> WeatherForecast:
    hourly = data["hourly"]
    time = hourly["time"]
    precipitation = hourly["precipitation"]
    if not isinstance(time, list) or not isinstance(precipitation, list):
        raise ValueError("Weather hourly data must be lists")
    if len(time) != 24 or len(precipitation) != 24:
        raise ValueError("Expected 24 forecast hours")
    if any(not isinstance(item, str) for item in time):
        raise ValueError("Forecast timestamps missing")
    rain = sum(max(0.0, _number(item, "hourly.precipitation")) for item in precipitation)
    current = data.get("current", {})
    temperature = current.get("temperature_2m")
    humidity = current.get("relative_humidity_2m")
    return WeatherForecast(
        retrieved_at_utc=datetime.now(timezone.utc).isoformat(),
        forecast_start_utc=time[0] + "Z",
        forecast_end_utc=time[-1] + "Z",
        requested_latitude=lat,
        requested_longitude=lon,
        grid_latitude=_number(data["latitude"], "latitude"),
        grid_longitude=_number(data["longitude"], "longitude"),
        temperature_c=_number(temperature, "current.temperature_2m") if temperature is not None else None,
        relative_humidity_pct=_number(humidity, "current.relative_humidity_2m") if humidity is not None else None,
        expected_precipitation_next_24h_mm=round(rain, 2),
    )


async def get_forecast(latitude: float, longitude: float) -> WeatherForecast:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m",
        "hourly": "precipitation",
        "forecast_hours": 24,
        "timezone": "GMT",
        "precipitation_unit": "mm",
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(OPEN_METEO_URL, params=params)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("Unexpected weather response")
            return _parse_forecast(payload, latitude, longitude)
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Weather provider is unavailable or returned incomplete data; no forecast was invented.",
        ) from exc
