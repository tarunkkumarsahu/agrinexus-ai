"""Traceable illustrative passport evidence and user-reported follow-ups.

Local development only. An observation is NOT a verified model input or outcome.
"""
import json
import sqlite3
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel, Field

from .farms import (
    Farm, Observation, Passport, _database, _ensure_farm, _utc_now,
)
from .schemas import DecisionResponse, IrrigationRequest

MODEL_VERSION = "illustrative-water-balance-v0.1"


class PassportEvidence(BaseModel):
    captured_at: str
    model_version: str
    input_sources: dict[str, Literal["manual_unverified", "default_assumption"]]
    latest_observation: Observation | None
    observation_used_in_calculation: bool = False
    warning: str = (
        "All numeric inputs are manual/unverified or explicitly defaulted. "
        "The optional latest observation is context only: soil-moisture percent "
        "is not converted into root-zone water mm or used in this calculation. "
        "A stored snapshot is not validation of any measurement."
    )


class PassportFollowUpCreate(BaseModel):
    action_taken: Literal["waited", "irrigated", "other", "not_taken"]
    note: str = Field(default="", max_length=500)
    observation_id: str | None = None


class PassportFollowUp(BaseModel):
    id: str
    farm_id: str
    passport_id: str
    created_at: str
    action_taken: Literal["waited", "irrigated", "other", "not_taken"]
    note: str
    observation: Observation | None
    verification: Literal["self_reported_unverified"] = "self_reported_unverified"


class PassportDetail(BaseModel):
    passport: Passport
    evidence: PassportEvidence | None
    followups: list[PassportFollowUp]
    warning: str = (
        "This record traces an illustrative calculation and user-entered evidence. "
        "Follow-ups are self-reported, not scientifically validated outcomes."
    )


def _ensure_tables(db: sqlite3.Connection) -> None:
    # Independent tables preserve the legacy passports schema without fabricating
    # retrospective evidence for rows saved before this feature existed.
    db.execute("""CREATE TABLE IF NOT EXISTS passport_evidence (
        passport_id TEXT PRIMARY KEY REFERENCES passports(id) ON DELETE CASCADE,
        snapshot_json TEXT NOT NULL
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS passport_followups (
        id TEXT PRIMARY KEY,
        farm_id TEXT NOT NULL REFERENCES farms(id),
        passport_id TEXT NOT NULL REFERENCES passports(id),
        observation_id TEXT REFERENCES observations(id),
        created_at TEXT NOT NULL,
        action_taken TEXT NOT NULL,
        note TEXT NOT NULL
    )""")


def _passport_row(db: sqlite3.Connection, farm_id: str, passport_id: str) -> sqlite3.Row:
    _ensure_farm(db, farm_id)
    row = db.execute(
        "SELECT * FROM passports WHERE farm_id=? AND id=?",
        (farm_id, passport_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Passport not found for this farm")
    return row


def _observation_from_row(row: sqlite3.Row | None) -> Observation | None:
    return Observation(**dict(row)) if row is not None else None


def record_passport_with_evidence(
    farm_id: str, request: IrrigationRequest, decision: DecisionResponse
) -> Passport:
    passport = Passport(
        id=decision.passport_id, farm_id=farm_id,
        created_at=_utc_now(), request=request, decision=decision,
    )
    with _database() as db:
        _ensure_tables(db)
        _ensure_farm(db, farm_id)
        row = db.execute(
            "SELECT * FROM observations WHERE farm_id=? "
            "ORDER BY recorded_at DESC, id DESC LIMIT 1",
            (farm_id,),
        ).fetchone()
        sources = {
            key: ("manual_unverified" if key in request.model_fields_set
                  else "default_assumption")
            for key, value in request.model_dump().items()
            if value is not None
        }
        snapshot = PassportEvidence(
            captured_at=passport.created_at,
            model_version=MODEL_VERSION,
            input_sources=sources,
            latest_observation=_observation_from_row(row),
        )
        db.execute(
            "INSERT INTO passports (id, farm_id, created_at, request_json, decision_json) "
            "VALUES (?, ?, ?, ?, ?)",
            (passport.id, farm_id, passport.created_at,
             request.model_dump_json(), decision.model_dump_json()),
        )
        db.execute(
            "INSERT INTO passport_evidence (passport_id, snapshot_json) VALUES (?, ?)",
            (passport.id, snapshot.model_dump_json()),
        )
    return passport


def _followup_from_row(db: sqlite3.Connection, row: sqlite3.Row) -> PassportFollowUp:
    observation = None
    if row["observation_id"] is not None:
        observation = _observation_from_row(
            db.execute(
                "SELECT * FROM observations WHERE id=? AND farm_id=?",
                (row["observation_id"], row["farm_id"]),
            ).fetchone()
        )
    return PassportFollowUp(
        id=row["id"], farm_id=row["farm_id"],
        passport_id=row["passport_id"], created_at=row["created_at"],
        action_taken=row["action_taken"], note=row["note"], observation=observation,
    )


def get_passport_detail(farm_id: str, passport_id: str) -> PassportDetail:
    with _database() as db:
        _ensure_tables(db)
        row = _passport_row(db, farm_id, passport_id)
        evidence_row = db.execute(
            "SELECT snapshot_json FROM passport_evidence WHERE passport_id=?",
            (passport_id,),
        ).fetchone()
        followups = db.execute(
            "SELECT * FROM passport_followups WHERE farm_id=? AND passport_id=? "
            "ORDER BY created_at DESC, id DESC",
            (farm_id, passport_id),
        ).fetchall()
        passport = Passport(
            id=row["id"], farm_id=row["farm_id"], created_at=row["created_at"],
            request=IrrigationRequest.model_validate_json(row["request_json"]),
            decision=DecisionResponse.model_validate_json(row["decision_json"]),
        )
        evidence = (
            PassportEvidence.model_validate_json(evidence_row["snapshot_json"])
            if evidence_row is not None else None
        )
        result = [_followup_from_row(db, entry) for entry in followups]
    return PassportDetail(passport=passport, evidence=evidence, followups=result)


def record_passport_followup(
    farm_id: str, passport_id: str, payload: PassportFollowUpCreate
) -> PassportFollowUp:
    with _database() as db:
        _ensure_tables(db)
        passport = _passport_row(db, farm_id, passport_id)
        observation = None
        if payload.observation_id is not None:
            observation_row = db.execute(
                "SELECT * FROM observations WHERE id=? AND farm_id=?",
                (payload.observation_id, farm_id),
            ).fetchone()
            if observation_row is None:
                raise HTTPException(
                    status_code=422, detail="Observation does not belong to this farm"
                )
            observation = _observation_from_row(observation_row)
            assert observation is not None
            if datetime.fromisoformat(observation.recorded_at) < datetime.fromisoformat(
                passport["created_at"]
            ):
                raise HTTPException(
                    status_code=422, detail="Follow-up observation predates the passport"
                )
        followup = PassportFollowUp(
            id=str(uuid4()), farm_id=farm_id, passport_id=passport_id,
            created_at=_utc_now(), action_taken=payload.action_taken,
            note=payload.note, observation=observation,
        )
        db.execute(
            "INSERT INTO passport_followups "
            "(id, farm_id, passport_id, observation_id, created_at, action_taken, note) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (followup.id, farm_id, passport_id, payload.observation_id,
             followup.created_at, followup.action_taken, followup.note),
        )
    return followup
