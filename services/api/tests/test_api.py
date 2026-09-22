from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "agrinexus-api"}


def test_missing_evidence():
    response = client.post("/v1/decisions/irrigation", json={})
    assert response.status_code == 200
    assert response.json()["status"] == "needs_evidence"


def test_complete_comparison():
    response = client.post("/v1/decisions/irrigation", json={
        "root_zone_water_mm": 35, "field_capacity_mm": 60,
        "minimum_water_mm": 25, "estimated_daily_demand_mm": 7,
        "forecast_rain_mm": 2, "proposed_irrigation_mm": 10,
    })
    assert response.status_code == 200
    assert response.json()["scenarios"][1]["estimated_end_water_mm"] == 40


def test_invalid_water_amount():
    response = client.post("/v1/decisions/irrigation", json={
        "root_zone_water_mm": 100, "field_capacity_mm": 30,
    })
    assert response.status_code == 422
