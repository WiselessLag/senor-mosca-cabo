"""Local API: stream measured neural activity, resolve exactly once after completion."""
from dataclasses import asdict
import base64
import binascii
import hmac
import json
import logging
import os
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import game, neural

app = FastAPI(title="Señor Mosca")
log = logging.getLogger(__name__)


@app.middleware("http")
async def optional_password(request: Request, call_next):
    """Protect all routes when explicitly configured; local use remains unchanged."""
    password = os.environ.get("MOSCA_PASSWORD")
    if password:
        auth = request.headers.get("authorization", "")
        valid = False
        try:
            scheme, encoded = auth.split(" ", 1)
            raw = base64.b64decode(encoded, validate=True)
            username, supplied = raw.split(b":", 1)
            valid = (scheme.lower() == "basic" and hmac.compare_digest(username, b"mosca")
                     and hmac.compare_digest(supplied, password.encode("utf-8")))
        except (ValueError, binascii.Error):
            pass
        if not valid:
            return Response("Authentication required", status_code=401,
                            headers={"WWW-Authenticate": 'Basic realm="Senor Mosca", charset="UTF-8"',
                                     "Cache-Control": "no-store"})
    return await call_next(request)


class City(BaseModel):
    day: Annotated[int, Field(ge=1, le=game.MAX_DAYS+1)]
    treasury: Annotated[int, Field(ge=0, le=100000)]
    corruption: Annotated[int, Field(ge=0, le=100)]
    satisfaction: Annotated[int, Field(ge=0, le=100)]
    audit: Annotated[int, Field(ge=0, le=100)]


class Turn(BaseModel):
    issue: Literal["water", "contract", "hotel", "audit", "protest"]
    focus: Literal["neutral", "citizens", "business", "audit"]
    mode: Literal["demo", "flywire"]
    state: City


@app.get("/api/bootstrap")
def bootstrap():
    why = neural.unavailable()
    return {"state": asdict(game.State()), "max_days": game.MAX_DAYS,
            "issues": {k: {"title": v.title, "office": v.office, "brief": v.brief} for k, v in game.ISSUES.items()},
            "flywire": {"available": why is None, "reason": why}}


def line(event):
    return json.dumps(event, ensure_ascii=False, separators=(",", ":"))+"\n"


@app.post("/api/turn")
def turn(request: Turn):
    state = game.State(**request.state.model_dump())
    if game.ending(state):
        raise HTTPException(409, "El mandato ya terminó.")
    if request.mode == "flywire" and (why := neural.unavailable()):
        raise HTTPException(503, why)
    issue = game.ISSUES[request.issue]
    rates = game.encode(issue, state, request.focus)

    def stream():
        yield line({"type": "stimulus", "rates": rates, "mode": request.mode})
        counts = None
        try:
            with_stream = neural.simulate(request.mode, rates)
            try:
                for event in with_stream:
                    if event["type"] == "frame" and event["elapsed"] == neural.DURATION:
                        counts = event["counts"]
                    yield line(event)
            finally:
                with_stream.close()
            if counts is None:
                raise RuntimeError("La simulación no produjo mediciones.")
            yield line({"type": "result", **game.resolve(state, issue, counts)})
        except (RuntimeError, ValueError) as e:
            log.exception("Trial rejected")
            yield line({"type": "error", "message": str(e) if str(e).startswith(("El laboratorio", "La simulación", "Modo", "model.py", "Completeness", "Connectivity")) else "El ensayo falló. Revisa la consola del servidor."})
        except Exception:
            log.exception("Brian2 trial failed")
            yield line({"type": "error", "message": "Brian2 no pudo completar el ensayo. Revisa la consola y mantén el modo demo disponible."})

    return StreamingResponse(stream(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})


if (dist := neural.ROOT/"dist").is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="game")

