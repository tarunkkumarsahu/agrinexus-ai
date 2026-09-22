from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .engine import compare_irrigation
from .farms import (
    Farm, FarmCreate, Observation, ObservationCreate, create_farm,
    create_observation, get_farm, list_farms, list_observations,
)
from .schemas import DecisionResponse, IrrigationRequest

app = FastAPI(title="AgriNexus ProofOS API", version="0.2.0")
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
