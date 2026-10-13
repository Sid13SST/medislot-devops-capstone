from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .. import __version__
from ..config import settings
from ..db import get_db
from ..schemas import InfoOut

router = APIRouter(tags=["system"])


@router.get("/")
def root():
    return {"service": settings.app_name, "version": __version__, "docs": "/docs"}


@router.get("/health")
def health():
    """Liveness: the process is up and able to answer HTTP. Deliberately does NOT touch the database."""
    return {"status": "UP"}


@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    """Readiness: only accept traffic when the database is reachable."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable") from exc
    return {"status": "READY"}


@router.get("/api/info", response_model=InfoOut)
def info():
    """Shows which build is running — used in the demo to prove a new commit reached the cluster."""
    return InfoOut(
        service=settings.app_name,
        version=__version__,
        gitSha=settings.git_sha,
        environment=settings.environment,
    )
