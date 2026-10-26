# MediSlot: Clinic Appointment Scheduler (DevOps Capstone)

[![MediSlot CI/CD](https://github.com/Sid13SST/medislot-devops-capstone/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Sid13SST/medislot-devops-capstone/actions/workflows/ci-cd.yml)

**MediSlot** is a front-desk scheduling app for a multi-department clinic. Reception staff use it to
book patient appointments with doctors, prevent double-booking, check patients in when they arrive,
and track every visit through to completion, cancellation or no-show.

It is built as a production-style full-stack application and shipped through the complete DevOps
lifecycle: **pytest → Docker → GitHub Actions → Trivy → GHCR → Terraform (AWS VPC + EKS) → Helm →
Ingress → HPA → Prometheus + Grafana**.

> Session 21 Final Capstone, by **Siddhant Prasad**. The DevOps layer follows the course's TaskBoard
> architecture; the application domain, code, and infrastructure are original.

---

## Contents

1. [What the application does](#1-what-the-application-does)
2. [Architecture](#2-architecture)
3. [Repository layout](#3-repository-layout)
4. [Run it locally (Docker Compose)](#4-run-it-locally-docker-compose)
5. [REST API](#5-rest-api)
6. [Testing and code quality](#6-testing-and-code-quality)
7. [Docker images](#7-docker-images)
8. [CI/CD pipeline](#8-cicd-pipeline)
9. [Security scanning (Trivy)](#9-security-scanning-trivy)
10. [Terraform: AWS VPC + EKS](#10-terraform-aws-vpc--eks)
11. [Kubernetes + Helm](#11-kubernetes--helm)
12. [Ingress, HPA and monitoring](#12-ingress-hpa-and-monitoring)
13. [Troubleshooting lab](#13-troubleshooting-lab)
14. [Tear down (avoid AWS charges)](#14-tear-down-avoid-aws-charges)
15. [Design decisions](#15-design-decisions)

---

## 1. What the application does

| Feature | Details |
|---|---|
| **Book appointments** | Patient name, phone, department, doctor, date/time, duration (10–120 min), reason for visit |
| **Double-booking protection** | A doctor can't have two overlapping active appointments; the API answers `409 Conflict` |
| **Visit lifecycle** | `SCHEDULED → CHECKED_IN → COMPLETED`, or `CANCELLED` / `NO_SHOW` (which can be re-booked). Invalid jumps are rejected. |
| **Reschedule / edit / delete** | Rescheduling re-checks the doctor's availability; completed visits are locked |
| **Dashboard** | KPI cards (today's visits, upcoming, in clinic now, completed, cancelled/no-show), searchable and filterable appointment book, today's queue, load per department |
| **Doctor roster** | Six seeded doctors across six departments; add new doctors from the UI |
| **Build traceability** | The footer and sidebar show the Git commit SHA of the running build (`/api/info`) |
| **Responsive UI** | Sidebar layout on desktop; top bar and card-style rows on phones |

**Stack:** React 19 + Vite · FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL 17 · Nginx (unprivileged)

## 2. Architecture

```mermaid
flowchart LR
  dev([Developer]) -->|git push| gh[GitHub]
  gh --> gha{{GitHub Actions}}
  gha -->|pytest · ruff · npm test/build<br/>terraform validate · helm lint| t[Quality gates]
  t --> b[docker build]
  b --> tr[Trivy scan<br/>fail on HIGH/CRITICAL]
  tr -->|tag = commit SHA| ghcr[(GHCR)]
  ghcr -->|helm upgrade --install<br/>OIDC → IAM role| eks

  subgraph aws[AWS ap-south-1 · Terraform]
    subgraph vpc[VPC 10.30.0.0/16 · 2 public + 2 private subnets · NAT]
      nlb[NLB] --> ing
      subgraph eks[EKS · managed node group]
        ing[ingress-nginx] -->|/| fe[frontend ×2<br/>React + Nginx]
        ing -->|/api /docs| be[backend ×2–6<br/>FastAPI · HPA]
        be --> pg[(PostgreSQL<br/>StatefulSet + EBS gp3)]
        prom[Prometheus] -->|ServiceMonitor /metrics| be
        graf[Grafana] --> prom
      end
    end
  end
  user([Browser]) --> nlb
```

The browser only ever calls relative `/api/...` URLs. In Docker Compose, the frontend's Nginx
proxies them to the backend; in Kubernetes, the Ingress routes `/api`, `/docs` and `/openapi.json` to
the backend Service and everything else to the frontend Service.

## 3. Repository layout

```text
.
├── backend/                     FastAPI service
│   ├── app/                     main.py, routers/, models.py, schemas.py, services.py, metrics.py, db.py, config.py
│   ├── alembic/versions/        0001_create_doctors (with seed data), 0002_create_appointments
│   ├── tests/                   38 pytest cases + conftest.py (isolated test DB)
│   ├── Dockerfile               multi-stage, non-root (UID 10001), no pip in the runtime image
│   ├── docker-entrypoint.sh     wait for DB → alembic upgrade head → uvicorn
│   └── requirements*.txt, pytest.ini, ruff.toml
├── frontend/                    React + Vite dashboard
│   ├── src/                     App.jsx, components/, lib/ (+ node:test unit tests), api.js, styles.css
│   ├── nginx.conf.template      SPA + same-origin /api proxy (BACKEND_URL injected at start-up)
│   └── Dockerfile               multi-stage: node:22 build → nginx-unprivileged runtime (UID 101)
├── docker-compose.yml           postgres + backend + frontend, healthcheck-gated start-up
├── .github/workflows/ci-cd.yml  test → build → Trivy → push to GHCR → Helm deploy to EKS
├── terraform/                   AWS VPC + EKS (+ EBS CSI, metrics-server, GitHub OIDC deploy role)
├── helm/medislot/               Helm chart (Deployments, Services, StatefulSet, Ingress, HPA, PDB, ServiceMonitor, dashboard)
├── k8s/                         namespace (restricted Pod Security) + gp3 StorageClass
├── monitoring/                  kube-prometheus-stack and ingress-nginx values
├── troubleshooting/             3 broken-on-purpose manifests + RUNBOOK.md
├── scripts/                     bootstrap-cluster.sh, load-test.sh, teardown-aws.sh, seed_demo_data.py
├── docs/                        SUBMISSION.md (rubric → evidence), TRIVY.md, DEMO.md
└── demo/                        MediSlot-presentation.pptx (slide deck) + MediSlot-walkthrough.mp4 (demo video)
```

## 4. Run it locally (Docker Compose)

Requirements: Docker Desktop (or Docker Engine + Compose v2).

```bash
docker compose up --build
```

| URL | What |
|---|---|
| http://localhost:3000 | MediSlot UI |
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/health · `/ready` · `/metrics` | Liveness, readiness, Prometheus metrics |

```bash
python scripts/seed_demo_data.py            # optional: fill the dashboard with realistic demo data
docker compose exec postgres psql -U medislot -d medislot -c 'SELECT id, patient_name, status FROM appointments;'
docker compose down        # stop
docker compose down -v     # stop and delete the database volume
```

> Port 5432 already taken by another Postgres? Run `POSTGRES_HOST_PORT=5433 docker compose up --build`.

<details>
<summary>Run the backend without Docker</summary>

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
export DATABASE_URL='postgresql+psycopg://medislot:medislot@localhost:5432/medislot'
alembic upgrade head
uvicorn app.main:app --reload --port 8000
# frontend, in a second terminal:
cd frontend && npm ci && npm run dev                    # http://localhost:5173 (proxies /api → :8000)
```
</details>

## 5. REST API

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Service info |
| GET | `/health` | Liveness (no DB access) |
| GET | `/ready` | Readiness: `SELECT 1` against PostgreSQL, `503` if unavailable |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/info` | Version, **Git SHA** and environment of the running build |
| GET | `/api/doctors` · `/api/doctors/{id}` | List / get doctors |
| POST | `/api/doctors` | Add a doctor (`409` on duplicate name) |
| GET | `/api/appointments` | List; filters `status`, `doctor_id`, `department`, `on=YYYY-MM-DD`, `q` (patient search) |
| GET | `/api/appointments/stats` | KPI counts and per-department load |
| GET | `/api/appointments/{id}` | Get one |
| POST | `/api/appointments` | Book (`409` double-booking, `422` past time / invalid input) |
| PUT | `/api/appointments/{id}` | Partial update: reschedule, edit, or change status (lifecycle-checked) |
| DELETE | `/api/appointments/{id}` | Delete (`204`) |

Interactive docs: `/docs` (Swagger) on the backend, or through the Ingress.

**Database:** two tables (`doctors`, `appointments` with a FK, check constraints and indexes), both
created **only by Alembic migrations**. The app never calls `create_all()` in production. On start-up
every replica runs `alembic upgrade head` under a PostgreSQL advisory lock, so concurrent replicas
can't race.

## 6. Testing and code quality

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v                    # 38 tests, ~96 % coverage
ruff check . && ruff format --check .
cd ../frontend && npm ci && npm test     # 6 unit tests for the UI helpers
```

* **Isolated test database:** `tests/conftest.py` overrides FastAPI's `get_db` dependency with an
  in-memory SQLite database (fresh schema per test). It never touches the application database.
* **CI also runs the same tests on real PostgreSQL** (service container), after checking that the
  Alembic migrations upgrade → downgrade → upgrade cleanly.
* Coverage: health/ready/metrics/info, doctor CRUD and validation, booking, double-booking,
  back-to-back slots, past-time rejection, 5 invalid payloads, filters/search, lifecycle transitions,
  rescheduling conflicts, re-booking cancelled slots, delete, stats, and custom Prometheus counters.

## 7. Docker images

| | Backend | Frontend |
|---|---|---|
| Build | 2 stages: venv builder → `python:3.12-slim` | 2 stages: `node:22-alpine` build → `nginxinc/nginx-unprivileged` |
| User | non-root **UID 10001** | non-root **UID 101** |
| Port | 8000 | 8080 (non-root can't bind < 1024) |
| Hardening | OS packages upgraded, **pip removed** from runtime, read-only root FS in K8s, `HEALTHCHECK` | OS packages upgraded, security headers, `HEALTHCHECK` |
| Size | ~310 MB | ~113 MB |

```bash
docker build -t medislot-backend:local ./backend
docker build -t medislot-frontend:local ./frontend
```

## 8. CI/CD pipeline

`.github/workflows/ci-cd.yml` runs on every push and pull request to `main`:

```text
┌─────────────── TEST (parallel) ───────────────┐
│ backend-tests        ruff + pytest (SQLite)    │
│ postgres-integration alembic up/down/up +      │
│                      pytest on PostgreSQL 17   │
│ frontend-build       npm ci · npm test · build │
│ infra-validate       terraform fmt/validate ·  │
│                      helm lint/template        │
└───────────────────────┬───────────────────────┘
                        ▼
  build-scan-push  (matrix: backend, frontend)
    docker build  →  Trivy (HIGH/CRITICAL ⇒ fail)  →  SARIF to Security tab
    →  push ghcr.io/<owner>/medislot-<svc>:<commit SHA>      (push events only)
                        ▼
  deploy  (main only, once AWS_DEPLOY_ROLE_ARN is configured)
    GitHub OIDC → IAM role → aws eks update-kubeconfig
    →  helm upgrade --install --rollback-on-failure
    →  smoke test: /api/info through the Ingress must report the new commit SHA
```

* **A failing test stops the pipeline**: the image jobs `need` every test job, so a broken
  commit never produces an image.
* **Images are tagged only with `${{ github.sha }}`**, never `latest`, so every running pod can be
  traced back to an exact commit (and the UI shows that SHA).
* **No long-lived cloud secrets**: the deploy job authenticates with GitHub's OIDC token.
  Terraform creates an IAM role that only `main` / the `production` environment of this repository
  can assume.

**One-time GitHub setup** (Settings → Secrets and variables → Actions):

| Kind | Name | Value |
|---|---|---|
| Variable | `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw github_actions_role_arn` |
| Secret (optional) | `POSTGRES_PASSWORD` | Database password used by the Helm release |

Until the variable is set, the deploy job is skipped and the pipeline still goes green (test → scan → push).

## 9. Security scanning (Trivy)

Both images are scanned in CI with `aquasecurity/trivy-action` (**pinned to a commit SHA** because of
the 2026 tag-hijacking incident) using `severity: HIGH,CRITICAL`, `ignore-unfixed: true`,
`exit-code: 1`: any fixable high or critical vulnerability fails the job *before* the push step.
A full SARIF report is uploaded to the repository's **Security → Code scanning** tab.

The first local scan found 4 HIGH CVEs in the backend image. Details and the fix are in
[docs/TRIVY.md](docs/TRIVY.md). Trivy is one control among several (SAST, dependency, secret and
runtime scanning); a clean scan doesn't mean the system is secure.

## 10. Terraform: AWS VPC + EKS

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars    # set github_repository = "<you>/<repo>"
terraform init
terraform plan
terraform apply                                  # ~15 min
aws eks update-kubeconfig --region ap-south-1 --name medislot-eks
```

Creates in **ap-south-1**: VPC `10.30.0.0/16` with **2 public + 2 private subnets** across 2 AZs,
Internet Gateway, single NAT Gateway, **EKS 1.35** with a managed node group (2× `t3.large`, AL2023),
add-ons (VPC CNI, CoreDNS, kube-proxy, Pod Identity, **EBS CSI**, **metrics-server**), and the GitHub
OIDC provider + deploy role. Uses `terraform-aws-modules/vpc` 6.x and `terraform-aws-modules/eks`
21.x. Credentials come from the AWS CLI profile and are never committed. See [terraform/README.md](terraform/README.md).

## 11. Kubernetes + Helm

```bash
# Ingress controller, Prometheus/Grafana, namespace, StorageClass, then the app:
GHCR_OWNER=<lowercase-github-user> IMAGE_TAG=<commit-sha> ./scripts/bootstrap-cluster.sh eks
# After that, every push to main redeploys automatically through the pipeline.

kubectl get pods,svc,ingress,hpa -n medislot
helm list -n medislot
helm history medislot -n medislot
helm rollback medislot <revision> -n medislot
helm test medislot -n medislot
```

The `helm/medislot` chart contains:

| Resource | Notes |
|---|---|
| `Deployment` backend / frontend | ≥ 2 replicas, rolling updates with `maxUnavailable: 0`, startup/readiness/liveness probes, resource requests/limits, non-root + seccomp + dropped capabilities |
| `Service` ×3 (ClusterIP) | backend `:8000`, frontend `:80 → 8080`, postgres `:5432` |
| `StatefulSet` postgres | `volumeClaimTemplates` on gp3 EBS, password in a `Secret` (generated if not supplied, preserved across upgrades) |
| `Ingress` | `/api`, `/docs`, `/openapi.json` → backend; `/` → frontend |
| `HorizontalPodAutoscaler` | backend 2–6 pods at 60 % CPU |
| `PodDisruptionBudget` ×2 | keep ≥ 1 pod per tier during node maintenance |
| `ServiceMonitor` + dashboard `ConfigMap` | rendered only if the Prometheus Operator CRDs exist |
| Helm test pod | checks `/ready`, `/api/doctors` and the frontend |

The `medislot` namespace enforces the **restricted Pod Security Standard**, and every MediSlot pod complies.

**Local cluster:** `./scripts/bootstrap-cluster.sh minikube` (uses `values-dev.yaml`, host `medislot.local`).

## 12. Ingress, HPA and monitoring

```bash
# Ingress: application URL (AWS NLB in front of ingress-nginx)
kubectl get svc -n ingress-nginx ingress-nginx-controller

# HPA: generate load from inside the cluster and watch it scale out
./scripts/load-test.sh
kubectl get hpa -n medislot -w

# Prometheus (Status → Targets: serviceMonitor/medislot/medislot-backend should be UP)
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
# Grafana → Dashboards → MediSlot → "MediSlot · Application Overview"
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3001:80
kubectl get secret -n monitoring kube-prometheus-stack-grafana -o jsonpath='{.data.admin-password}' | base64 -d
```

**Metrics exposed by the backend** (`/metrics`): `http_requests_total`,
`http_request_duration_seconds` (histogram), plus business counters
`medislot_appointments_booked_total{department}`, `medislot_appointment_status_changes_total{status}`
and `medislot_booking_conflicts_total`.

**Grafana dashboard** (provisioned automatically from the chart): requests/s, p50/p95/p99 latency,
5xx error rate, responses by status code, backend pods up, bookings by department, double-booking
attempts, status transitions, CPU and memory per pod, HPA current/desired replicas.

## 13. Troubleshooting lab

```bash
kubectl apply -f troubleshooting/    # ImagePullBackOff · Service without endpoints · Running-but-not-Ready
```

Diagnosis and fix steps, plus the real problems hit while building this project, are in
[troubleshooting/RUNBOOK.md](troubleshooting/RUNBOOK.md).

## 14. Tear down (avoid AWS charges)

EKS, the NAT Gateway and the load balancer bill by the hour. When you're done:

```bash
./scripts/teardown-aws.sh     # deletes the K8s-created NLB + EBS volumes, then `terraform destroy`
```

Then unset the `AWS_DEPLOY_ROLE_ARN` repository variable so the pipeline stops trying to deploy.

## 15. Design decisions

| Decision | Why |
|---|---|
| Store `ends_at` alongside `scheduled_at` | Overlap check is a plain indexed range query that works the same on SQLite (tests) and PostgreSQL |
| Clinic wall-clock times (no timezone) | Appointments are local-time events; "today" is computed in `CLINIC_TIMEZONE` (Asia/Kolkata) |
| `/health` doesn't touch the DB; `/ready` does | A DB outage takes pods out of rotation without triggering restart loops |
| Migrations in the entrypoint with an advisory lock | Simple for a single chart, safe with many replicas |
| PostgreSQL inside the cluster | Fine for the classroom; production would use **Amazon RDS** (managed backups, Multi-AZ, patching) |
| Single NAT Gateway, local Terraform state | Cost and simplicity for a lab; production would use one NAT per AZ and an S3 backend with locking |
| ingress-nginx | Matches the course's Ingress lab; the community project is now end-of-life, so for long-lived clusters swap `ingress.className` to Traefik or the AWS Load Balancer Controller |
| OIDC instead of AWS keys in GitHub | Short-lived credentials scoped to this repository's `main` branch |
