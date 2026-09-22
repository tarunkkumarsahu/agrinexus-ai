from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .engine import compare_irrigation
from .farms import (
    Farm, FarmCreate, Observation, ObservationCreate, create_farm,
    create_observation, get_farm, list_farms, list_observations,
    FarmSnapshot, build_farm_snapshot, Passport, list_passports,
)
from .passport_tracking import (
    PassportDetail, PassportFollowUp, PassportFollowUpCreate,
    get_passport_detail, record_passport_with_evidence, record_passport_followup,
)
from .schemas import DecisionResponse, IrrigationRequest
from .weather import WeatherForecast, get_forecast

app = FastAPI(title="AgriNexus ProofOS API", version="0.4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "agrinexus-api"}


@app.post("/v1/decisions/irrigation", response_model=DecisionResponse)
def irrigation(request: IrrigationRequest) -> DecisionResponse:
    return compare_irrigation(request)


@app.get("/v1/farms", response_model=list[Farm])
def farms() -> list[Farm]:
    return list_farms()


@app.post("/v1/farms", response_model=Farm, status_code=201)
def register_farm(request: FarmCreate) -> Farm:
    return create_farm(request)


@app.get("/v1/farms/{farm_id}", response_model=Farm)
def farm_detail(farm_id: str) -> Farm:
    return get_farm(farm_id)


@app.get("/v1/farms/{farm_id}/observations", response_model=list[Observation])
def observations(farm_id: str) -> list[Observation]:
    return list_observations(farm_id)


@app.post("/v1/farms/{farm_id}/observations", response_model=Observation, status_code=201)
def record_observation(farm_id: str, request: ObservationCreate) -> Observation:
    return create_observation(farm_id, request)

@app.get("/v1/weather/forecast", response_model=WeatherForecast)
async def weather_forecast(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
) -> WeatherForecast:
    # Coordinates are supplied for this request only; we do not save them.
    return await get_forecast(latitude=round(latitude, 2), longitude=round(longitude, 2))


@app.get("/v1/farms/{farm_id}/snapshot", response_model=FarmSnapshot)
def farm_snapshot(farm_id: str) -> FarmSnapshot:
    return build_farm_snapshot(farm_id)


@app.post("/v1/farms/{farm_id}/passports/irrigation", response_model=Passport, status_code=201)
def record_irrigation_passport(farm_id: str, request: IrrigationRequest) -> Passport:
    # Save a trace of the illustrative calculation, not an agronomic recommendation.
    return record_passport_with_evidence(farm_id, request, compare_irrigation(request))


@app.get("/v1/farms/{farm_id}/passports", response_model=list[Passport])
def saved_passports(farm_id: str) -> list[Passport]:
    return list_passports(farm_id)


@app.get("/v1/farms/{farm_id}/passports/{passport_id}", response_model=PassportDetail)
def passport_detail(farm_id: str, passport_id: str) -> PassportDetail:
    return get_passport_detail(farm_id, passport_id)


@app.post(
    "/v1/farms/{farm_id}/passports/{passport_id}/followups",
    response_model=PassportFollowUp, status_code=201,
)
def add_passport_followup(
    farm_id: str, passport_id: str, request: PassportFollowUpCreate
) -> PassportFollowUp:
    return record_passport_followup(farm_id, passport_id, request)
