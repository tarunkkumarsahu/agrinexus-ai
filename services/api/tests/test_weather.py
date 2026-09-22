from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import weather

client = TestClient(app)


def sample_weather():
    return {
        "latitude": 21.20,
        "longitude": 81.30,
        "current": {"temperature_2m": 30.5, "relative_humidity_2m": 50},
        "hourly": {
            "time": [f"2026-09-22T{hour:02d}:00" for hour in range(24)],
            "precipitation": [0.5] * 24,
        },
    }


class StubResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class StubClient:
    def __init__(self, payload):
        self.payload = payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url, params):
        assert url == weather.OPEN_METEO_URL
        assert params["forecast_hours"] == 24
        assert params["timezone"] == "GMT"
        return StubResponse(self.payload)


def test_forecast_has_provenance_and_real_upstream_values(monkeypatch):
    monkeypatch.setattr(weather.httpx, "AsyncClient", lambda **kwargs: StubClient(sample_weather()))
    response = client.get("/v1/weather/forecast?latitude=21.2&longitude=81.3")
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "Open-Meteo"
    assert body["expected_precipitation_next_24h_mm"] == 12
    assert body["temperature_c"] == 30.5
    assert body["retrieved_at_utc"]
    assert "not automatically used" in body["warning"]


def test_invalid_coordinates_rejected():
    assert client.get("/v1/weather/forecast?latitude=91&longitude=81.3").status_code == 422
    assert client.get("/v1/weather/forecast?latitude=21.2").status_code == 422


def test_missing_forecast_is_not_faked(monkeypatch):
    incomplete = sample_weather()
    incomplete["hourly"]["precipitation"] = []
    monkeypatch.setattr(weather.httpx, "AsyncClient", lambda **kwargs: StubClient(incomplete))
    response = client.get("/v1/weather/forecast?latitude=21.2&longitude=81.3")
    assert response.status_code == 502
    assert "no forecast was invented" in response.json()["detail"]


def test_outage_does_not_return_demo_forecast(monkeypatch):
    class Offline(StubClient):
        async def get(self, url, params):
            raise httpx.ConnectError("offline")
    monkeypatch.setattr(weather.httpx, "AsyncClient", lambda **kwargs: Offline(sample_weather()))
    response = client.get("/v1/weather/forecast?latitude=21.2&longitude=81.3")
    assert response.status_code == 502
