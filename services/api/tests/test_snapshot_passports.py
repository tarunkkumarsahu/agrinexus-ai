import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def separate_db(tmp_path, monkeypatch):
    monkeypatch.setenv("AGRINEXUS_DB_PATH", str(tmp_path / "snapshots.sqlite3"))


def create_farm():
    response = client.post(
        "/v1/farms",
        json={"name": "Sample Plot", "crop": "Cotton", "region": "Demo region", "area_ha": 1.0},
    )
    assert response.status_code == 201
    return response.json()["id"]


def valid_comparison():
    return {
        "root_zone_water_mm": 35,
        "field_capacity_mm": 60,
        "minimum_water_mm": 25,
        "estimated_daily_demand_mm": 7,
        "forecast_rain_mm": 2,
        "proposed_irrigation_mm": 10,
    }


def test_snapshot_missing_observations_is_explicit():
    farm = create_farm()
    response = client.get(f"/v1/farms/{farm}/snapshot")
    assert response.status_code == 200
    data = response.json()
    assert data["observation_status"] == "missing"
    assert data["latest_observation"] is None


def test_snapshot_carries_manual_provenance_without_mm_conversion():
    farm = create_farm()
    entry = client.post(
        f"/v1/farms/{farm}/observations", json={"soil_moisture_pct": 31, "note": "demo only"}
    )
    assert entry.status_code == 201
    data = client.get(f"/v1/farms/{farm}/snapshot").json()
    assert data["latest_observation"]["source"] == "manual_unverified"
    assert data["observation_status"] == "recorded_unverified"
    assert "cannot be converted" in data["warning"]


def test_passport_is_persisted_and_traceable():
    farm = create_farm()
    response = client.post(f"/v1/farms/{farm}/passports/irrigation", json=valid_comparison())
    assert response.status_code == 201
    passport = response.json()
    assert passport["decision"]["status"] == "illustrative"
    assert passport["decision"]["passport_id"] == passport["id"]
    assert passport["decision"]["scenarios"][1]["estimated_end_water_mm"] == 40
    saved = client.get(f"/v1/farms/{farm}/passports")
    assert saved.status_code == 200
    assert saved.json()[0]["id"] == passport["id"]
    assert saved.json()[0]["request"]["forecast_rain_mm"] == 2


def test_incomplete_evidence_is_stored_as_incomplete():
    farm = create_farm()
    response = client.post(f"/v1/farms/{farm}/passports/irrigation", json={})
    assert response.status_code == 201
    assert response.json()["decision"]["status"] == "needs_evidence"
    assert response.json()["decision"]["scenarios"] == []


def test_unknown_farm_passport_endpoint_is_404():
    response = client.post("/v1/farms/no-farm/passports/irrigation", json=valid_comparison())
    assert response.status_code == 404
    assert client.get("/v1/farms/no-farm/passports").status_code == 404
