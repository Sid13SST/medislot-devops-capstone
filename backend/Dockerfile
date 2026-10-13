# syntax=docker/dockerfile:1

# ---------- Stage 1: build the virtualenv (compilers/pip caches never reach the runtime image) ----------
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install -r requirements.txt

# ---------- Stage 2: minimal runtime ----------
FROM python:3.12-slim AS runtime

LABEL org.opencontainers.image.title="medislot-backend" \
      org.opencontainers.image.description="MediSlot clinic appointment API (FastAPI)" \
      org.opencontainers.image.licenses="MIT"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PATH="/opt/venv/bin:$PATH"

# Patch OS packages (keeps the Trivy gate green) and create an unprivileged user.
RUN apt-get update \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/* \
 && pip install --upgrade pip \
 && groupadd --gid 10001 app \
 && useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
 && chmod 0755 /usr/local/bin/docker-entrypoint.sh

# Run as non-root (numeric UID so Kubernetes runAsNonRoot can verify it).
USER 10001:10001

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"]

# Entrypoint: wait for DB -> alembic upgrade head -> exec uvicorn
ENTRYPOINT ["docker-entrypoint.sh"]
