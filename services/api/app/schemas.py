from typing import Literal

from pydantic import BaseModel, Field, model_validator


class IrrigationRequest(BaseModel):
    """User-entered unverified water amounts in mm; no live feeds in v0.1."""

    root_zone_water_mm: float | None = Field(default=None, ge=0, le=2000)
    field_capacity_mm: float | None = Field(default=None, gt=0, le=2000)
    minimum_water_mm: float | None = Field(default=None, ge=0, le=2000)
    estimated_daily_demand_mm: float | None = Field(default=None, ge=0, le=100)
    forecast_rain_mm: float | None = Field(default=None, ge=0, le=1000)
    proposed_irrigation_mm: float = Field(default=10, ge=0, le=300)

    @model_validator(mode="after")
    def check_water_capacity(self):
        if self.field_capacity_mm is not None:
            if self.root_zone_water_mm is not None and self.root_zone_water_mm > self.field_capacity_mm:
                raise ValueError("root_zone_water_mm cannot exceed field_capacity_mm")
            if self.minimum_water_mm is not None and self.minimum_water_mm > self.field_capacity_mm:
                raise ValueError("minimum_water_mm cannot exceed field_capacity_mm")
        return self


class Scenario(BaseModel):
    label: str
    applied_irrigation_mm: float
    estimated_end_water_mm: float
    estimated_deficit_to_minimum_mm: float
    estimated_overflow_mm: float


class DecisionResponse(BaseModel):
    passport_id: str
    status: Literal["needs_evidence", "illustrative"]
    missing_inputs: list[str]
    scenarios: list[Scenario]
    assumptions: list[str]
    disclaimer: str
