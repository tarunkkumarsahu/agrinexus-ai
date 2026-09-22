import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db(tmp_path, monkeypatch):
    monkeypatch.setenv("AGRINEXUS_DB_PATH", str(tmp_path / "evidence.sqlite3"))


def farm(name="Demo Farm"):
    r = client.post("/v1/farms", json={
        "name": name, "crop": "Cotton", "region": "Demo region", "area_ha": 1.0
    })
    assert r.status_code == 201
    return r.json()["id"]


def observation(farm_id, moisture=30):
    r = client.post(f"/v1/farms/{farm_id}/observations", json={
        "soil_moisture_pct": moisture, "note": "Manual sample"
    })
    assert r.status_code == 201
    return r.json()


def passport(farm_id, data=None):
    r = client.post(
        f"/v1/farms/{farm_id}/passports/irrigation",
        json=data if data is not None else {
            "root_zone_water_mm": 30, "field_capacity_mm": 50,
            "minimum_water_mm": 20, "estimated_daily_demand_mm": 5,
            "forecast_rain_mm": 3, "proposed_irrigation_mm": 10,
        },
    )
    assert r.status_code == 201
    return r.json()


def detail(farm_id, passport_id):
    return client.get(f"/v1/farms/{farm_id}/passports/{passport_id}")


def test_snapshot_is_frozen_and_clearly_not_model_input():
    f = farm()
    original = observation(f, 31)
    p = passport(f)
    first = detail(f, p["id"])
    assert first.status_code == 200
    evidence = first.json()["evidence"]
    assert evidence["latest_observation"]["id"] == original["id"]
    assert evidence["input_sources"]["forecast_rain_mm"] == "manual_unverified"
    assert evidence["observation_used_in_calculation"] is False
    assert "not converted" in evidence["warning"]
    assert evidence["model_version"] == "illustrative-water-balance-v0.1"
    observation(f, 90)
    assert detail(f, p["id"]).json()["evidence"]["latest_observation"]["id"] == original["id"]


def test_missing_evidence_and_default_assumptions_are_not_misrepresented():
    f = farm()
    p = passport(f, {})
    record = detail(f, p["id"]).json()
    assert record["passport"]["decision"]["status"] == "needs_evidence"
    assert record["evidence"]["latest_observation"] is None
    assert record["evidence"]["input_sources"] == {
        "proposed_irrigation_mm": "default_assumption"
    }


def test_followup_persists_user_reported_action_and_later_observation():
    f = farm()
    p = passport(f)
    later = observation(f, 32)
    url = f"/v1/farms/{f}/passports/{p['id']}/followups"
    r = client.post(url, json={
        "action_taken": "irrigated", "observation_id": later["id"],
        "note": "User-reported trial, not a validated outcome",
    })
    assert r.status_code == 201
    assert r.json()["observation"]["id"] == later["id"]
    assert r.json()["verification"] == "self_reported_unverified"
    saved = detail(f, p["id"]).json()["followups"]
    assert len(saved) == 1
    assert saved[0]["id"] == r.json()["id"]


def test_rejects_cross_farm_or_predating_observations_and_wrong_passport():
    first, second = farm("First farm"), farm("Second farm")
    early = observation(first)
    foreign = observation(second)
    p = passport(first)
    url = f"/v1/farms/{first}/passports/{p['id']}/followups"
    for identifier in (early["id"], foreign["id"], "not-real"):
        r = client.post(url, json={
            "action_taken": "waited", "observation_id": identifier
        })
        assert r.status_code == 422
    assert detail(second, p["id"]).status_code == 404
    assert client.post(
        f"/v1/farms/{second}/passports/{p['id']}/followups",
        json={"action_taken": "waited"},
    ).status_code == 404
    assert detail(first, "not-real").status_code == 404


def test_followup_without_observation_is_not_claimed_as_verified_result():
    f = farm()
    p = passport(f)
    r = client.post(
        f"/v1/farms/{f}/passports/{p['id']}/followups",
        json={"action_taken": "not_taken", "note": "Waiting for field data"},
    )
    assert r.status_code == 201
    assert r.json()["observation"] is None
    assert r.json()["verification"] == "self_reported_unverified"


def test_legacy_passport_returns_no_invented_evidence():
    # Simulates the pre-v0.4 saved passports which have no evidence snapshot.
    from app.engine import compare_irrigation
    from app.farms import save_passport
    from app.schemas import IrrigationRequest

    f = farm()
    req = IrrigationRequest()
    p = save_passport(f, req, compare_irrigation(req))
    d = detail(f, p.id)
    assert d.status_code == 200
    assert d.json()["evidence"] is None
    assert d.json()["followups"] == []
