import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Each test uses an isolated empty SQLite database.
    monkeypatch.setenv("AGRINEXUS_DB_PATH", str(tmp_path / "test.sqlite3"))
    return TestClient(app)


def payload():
    return {
        "name": "Demo plot", "crop": "Cotton", "region": "Demo region",
        "area_ha": 1.2,
    }


def test_create_list_and_retrieve_persisted_farm(client):
    created = client.post("/v1/farms", json=payload())
    assert created.status_code == 201
    identifier = created.json()["id"]
    assert created.json()["crop"] == "Cotton"
    assert client.get("/v1/farms").json()[0]["id"] == identifier
    assert client.get(f"/v1/farms/{identifier}").json()["area_ha"] == 1.2


def test_farm_input_validation(client):
    result = client.post("/v1/farms", json={**payload(), "area_ha": -2})
    assert result.status_code == 422
    assert client.get("/v1/farms").json() == []


def test_unknown_farm_not_found(client):
    assert client.get("/v1/farms/missing").status_code == 404
    assert client.get("/v1/farms/missing/observations").status_code == 404


def test_record_and_list_observations(client):
    identifier = client.post("/v1/farms", json=payload()).json()["id"]
    saved = client.post(
        f"/v1/farms/{identifier}/observations",
        json={"soil_moisture_pct": 31, "note": "Manual test entry"},
    )
    assert saved.status_code == 201
    assert saved.json()["source"] == "manual_unverified"
    measurements = client.get(f"/v1/farms/{identifier}/observations")
    assert measurements.status_code == 200
    assert measurements.json()[0]["soil_moisture_pct"] == 31


def test_reject_invalid_moisture_and_unknown_farm(client):
    identifier = client.post("/v1/farms", json=payload()).json()["id"]
    assert client.post(
        f"/v1/farms/{identifier}/observations", json={"soil_moisture_pct": 105}
    ).status_code == 422
    assert client.post(
        "/v1/farms/missing/observations", json={"soil_moisture_pct": 31}
    ).status_code == 404
