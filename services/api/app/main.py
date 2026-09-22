from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .engine import compare_irrigation
from .schemas import DecisionResponse, IrrigationRequest

app = FastAPI(title="AgriNexus ProofOS API", version="0.1.0")
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
