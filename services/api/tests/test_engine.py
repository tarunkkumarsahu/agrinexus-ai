import pytest

from app.engine import compare_irrigation
from app.schemas import IrrigationRequest


def complete(**overrides):
    data = dict(
        root_zone_water_mm=35, field_capacity_mm=60, minimum_water_mm=25,
        estimated_daily_demand_mm=7, forecast_rain_mm=2, proposed_irrigation_mm=10,
    )
    data.update(overrides)
    return IrrigationRequest(**data)


def test_missing_input_does_not_invent_readings():
    outcome = compare_irrigation(IrrigationRequest())
    assert outcome.status == "needs_evidence"
    assert "root_zone_water_mm" in outcome.missing_inputs
    assert outcome.scenarios == []


def test_scenarios_use_same_inputs():
    scenarios = compare_irrigation(complete()).scenarios
    assert scenarios[0].estimated_end_water_mm == 30
    assert scenarios[1].estimated_end_water_mm == 40
    assert scenarios[1].applied_irrigation_mm == 10


def test_overflow_and_capacity():
    scenario = compare_irrigation(complete(root_zone_water_mm=55, forecast_rain_mm=20)).scenarios[0]
    assert scenario.estimated_end_water_mm == 60
    assert scenario.estimated_overflow_mm == 8


def test_missing_rain_returns_missing_evidence():
    result = compare_irrigation(complete(forecast_rain_mm=None))
    assert result.status == "needs_evidence"


def test_invalid_water_capacity_rejected():
    with pytest.raises(ValueError):
        complete(root_zone_water_mm=70)
