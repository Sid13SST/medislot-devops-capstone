import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from . import __version__
from .config import settings
from .routers import appointments, doctors, system

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

# Database schema is owned by Alembic (run by the container entrypoint), never by create_all().
app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="Clinic appointment scheduling API — DevOps capstone project.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(doctors.router)
app.include_router(appointments.router)

# Exposes http_requests_total, http_request_duration_seconds, ... for Prometheus.
Instrumentator(
    should_group_status_codes=False,
    excluded_handlers=["/metrics"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
