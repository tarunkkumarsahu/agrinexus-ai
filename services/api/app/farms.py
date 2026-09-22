"""Local-only farm profile and observation storage for development.

No authentication or multi-user access control exists yet: do not deploy publicly.
Exact geolocation and personally identifying information are not collected.
"""
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel, Field


class FarmCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    crop: str = Field(min_length=2, max_length=80)
    region: str = Field(min_length=2, max_length=100)
    area_ha: float = Field(gt=0, le=100_000)


class Farm(BaseModel):
    id: str
    name: str
    crop: str
    region: str
    area_ha: float
    created_at: str


class ObservationCreate(BaseModel):
    # Manually entered illustrative measurement, not an IoT feed.
    soil_moisture_pct: float = Field(ge=0, le=100)
    note: str = Field(default="", max_length=500)


class Observation(BaseModel):
    id: str
    farm_id: str
    soil_moisture_pct: float
    note: str
    recorded_at: str
    source: str = "manual_unverified"


def _db_path() -> Path:
    return Path(os.getenv("AGRINEXUS_DB_PATH", str(Path(__file__).resolve().parents[1] / "local_farms.sqlite3")))


@contextmanager
def _database():
    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys=ON")
    try:
        connection.execute("""CREATE TABLE IF NOT EXISTS farms (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, crop TEXT NOT NULL,
            region TEXT NOT NULL, area_ha REAL NOT NULL, created_at TEXT NOT NULL
        )""")
        connection.execute("""CREATE TABLE IF NOT EXISTS observations (
            id TEXT PRIMARY KEY, farm_id TEXT NOT NULL REFERENCES farms(id),
            soil_moisture_pct REAL NOT NULL, note TEXT NOT NULL,
            recorded_at TEXT NOT NULL, source TEXT NOT NULL
        )""")
        yield connection
        connection.commit()
    finally:
        connection.close()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_farm(payload: FarmCreate) -> Farm:
    farm = Farm(id=str(uuid4()), **payload.model_dump(), created_at=_utc_now())
    with _database() as db:
        db.execute(
            "INSERT INTO farms (id, name, crop, region, area_ha, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (farm.id, farm.name, farm.crop, farm.region, farm.area_ha, farm.created_at),
        )
    return farm


def list_farms() -> list[Farm]:
    with _database() as db:
        rows = db.execute("SELECT * FROM farms ORDER BY created_at DESC, id DESC").fetchall()
    return [Farm(**dict(row)) for row in rows]


def _ensure_farm(db: sqlite3.Connection, farm_id: str) -> None:
    if db.execute("SELECT 1 FROM farms WHERE id=?", (farm_id,)).fetchone() is None:
        raise HTTPException(status_code=404, detail="Farm not found")


def get_farm(farm_id: str) -> Farm:
    with _database() as db:
        row = db.execute("SELECT * FROM farms WHERE id=?", (farm_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Farm not found")
    return Farm(**dict(row))


def create_observation(farm_id: str, payload: ObservationCreate) -> Observation:
    observation = Observation(
        id=str(uuid4()), farm_id=farm_id, **payload.model_dump(), recorded_at=_utc_now()
    )
    with _database() as db:
        _ensure_farm(db, farm_id)
        db.execute(
            "INSERT INTO observations (id, farm_id, soil_moisture_pct, note, recorded_at, source) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (observation.id, farm_id, observation.soil_moisture_pct, observation.note,
             observation.recorded_at, observation.source),
        )
    return observation


def list_observations(farm_id: str) -> list[Observation]:
    with _database() as db:
        _ensure_farm(db, farm_id)
        rows = db.execute(
            "SELECT * FROM observations WHERE farm_id=? ORDER BY recorded_at DESC, id DESC",
            (farm_id,),
        ).fetchall()
    return [Observation(**dict(row)) for row in rows]
