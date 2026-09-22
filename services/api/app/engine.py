from uuid import uuid4

from .schemas import DecisionResponse, IrrigationRequest, Scenario

REQUIRED = (
    "root_zone_water_mm", "field_capacity_mm", "minimum_water_mm",
    "estimated_daily_demand_mm", "forecast_rain_mm",
)
DISCLAIMER = (
    "Illustrative, unvalidated calculation using user-entered inputs only. "
    "Not an irrigation recommendation. Verify measurements and consult local agronomic guidance."
)


def compare_irrigation(request: IrrigationRequest) -> DecisionResponse:
    missing = [field for field in REQUIRED if getattr(request, field) is None]
    common = {
        "passport_id": str(uuid4()),
        "missing_inputs": missing,
        "assumptions": [
            "Measurements and forecasts are user-entered and have not been verified.",
            "One illustrative daily step; rain and irrigation are assumed fully effective.",
            "No crop physiology, runoff, drainage, soil heterogeneity or forecast uncertainty is modeled.",
            "Standalone comparisons are ephemeral; only the farm passport endpoint persists a record.",
        ],
        "disclaimer": DISCLAIMER,
    }
    if missing:
        return DecisionResponse(status="needs_evidence", scenarios=[], **common)

    assert request.root_zone_water_mm is not None
    assert request.field_capacity_mm is not None
    assert request.minimum_water_mm is not None
    assert request.estimated_daily_demand_mm is not None
    assert request.forecast_rain_mm is not None

    def calculate(label: str, irrigation: float) -> Scenario:
        raw = (request.root_zone_water_mm + request.forecast_rain_mm
               + irrigation - request.estimated_daily_demand_mm)
        end = min(request.field_capacity_mm, max(0.0, raw))
        return Scenario(
            label=label,
            applied_irrigation_mm=irrigation,
            estimated_end_water_mm=round(end, 2),
            estimated_deficit_to_minimum_mm=round(max(0.0, request.minimum_water_mm - end), 2),
            estimated_overflow_mm=round(max(0.0, raw - request.field_capacity_mm), 2),
        )

    return DecisionResponse(
        status="illustrative",
        scenarios=[
            calculate("No irrigation", 0.0),
            calculate("User-proposed irrigation", request.proposed_irrigation_mm),
        ],
        **common,
    )
