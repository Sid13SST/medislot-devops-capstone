# Submission guide: rubric → evidence

Every grading criterion from `GRADING.md`, where it's implemented, and the exact command for each
screenshot. Save screenshots in `docs/screenshots/` using the file names below.

> ✅ = verified while building (locally, in Docker, or on a minikube cluster).
> ☁️ = needs your AWS account / GitHub repository: run it and capture the screenshot.

---

## M1: Application (10)

| Criterion | Where | Status |
|---|---|---|
| FastAPI starts, `/health` responds | `backend/app/routers/system.py` | ✅ `{"status":"UP"}` |
| ≥ 4 REST endpoints (GET/POST/PUT/DELETE) | `backend/app/routers/appointments.py`, `doctors.py`: 13 endpoints | ✅ |
| PostgreSQL table(s) managed by Alembic | `backend/alembic/versions/0001_*.py`, `0002_*.py` | ✅ `doctors`, `appointments` |
| Frontend renders and calls the API | `frontend/src/api.js`, `App.jsx` | ✅ |
| Responsive, usable UI | `frontend/src/styles.css` (breakpoints 1280/1100/860/420 px) | ✅ |

📸 `m1-app-desktop.png`: http://localhost:3000 after `python scripts/seed_demo_data.py`
📸 `m1-app-mobile.png`: same page in DevTools device mode (iPhone)
📸 `m1-booking-conflict.png`: book two overlapping slots for one doctor → red "already has appointment" message

## M2: Testing (10)

| Criterion | Where | Status |
|---|---|---|
| `pytest` runs without errors | `backend/tests/` | ✅ 38 passed |
| ≥ 5 tests covering ≥ 3 endpoints | 38 tests across 13 endpoints | ✅ |
| Test DB, not production DB | `tests/conftest.py`: in-memory SQLite via `dependency_overrides` | ✅ |
| `pytest.ini` / `conftest.py` | both present | ✅ |

📸 `m2-pytest.png`: `cd backend && pytest -v`

## M3: Git and GitHub (5)

| Criterion | Status |
|---|---|
| Public GitHub repository | ☁️ push this repo |
| Meaningful commit messages | ✅ Conventional-commit style, e.g. `feat(backend): …`, `ci: …` |
| `.gitignore` excludes `.env`, `__pycache__`, `node_modules`, `.venv` | ✅ (plus `*.tfstate`, `*.tfvars`) |

📸 `m3-commits.png`: `git log --oneline` or GitHub → Commits (≥ 10 commits)

## M4: Docker (10)

| Criterion | Status |
|---|---|
| `backend/Dockerfile` builds | ✅ |
| Frontend multi-stage (Node → Nginx) | ✅ `node:22-alpine` → `nginx-unprivileged` |
| Non-root users | ✅ backend UID 10001, frontend UID 101 (`docker compose exec backend id`) |
| `docker compose up --build` starts all 3 services | ✅ all healthy |

📸 `m4-compose-up.png`: `docker compose up --build` (or `docker compose ps` showing 3 healthy services)
📸 `m4-nonroot.png`: `docker compose exec backend id; docker compose exec frontend id`
📸 `m4-browser.png`: http://localhost:3000

## M5: CI/CD (15)

| Criterion | Where | Status |
|---|---|---|
| Workflow file | `.github/workflows/ci-cd.yml` | ✅ |
| Triggers on push to `main` | `on.push.branches: [main]` | ✅ |
| pytest job fails the build on failure | `backend-tests`, `postgres-integration` → `needs:` | ✅ |
| Frontend built in pipeline | `frontend-build` | ✅ |
| Images built for both services | `build-scan-push` matrix | ✅ |
| Pushed to GHCR | `docker push ghcr.io/<owner>/medislot-*` | ☁️ |
| SHA tags, not `latest` | `:${{ github.sha }}` only | ✅ |

📸 `m5-pipeline-green.png`: Actions run page (all jobs green)
📸 `m5-ghcr.png`: GitHub profile → Packages → `medislot-backend` showing the SHA tag

## M6: Trivy (5)

| Criterion | Status |
|---|---|
| Trivy scans both images in CI | ✅ matrix job, both services |
| Fails on HIGH/CRITICAL | ✅ `exit-code: "1"` |
| Explain a CVE / clean result | ✅ [docs/TRIVY.md](TRIVY.md) (4 real CVEs found and fixed) |

📸 `m6-trivy.png`: the "Trivy scan (fail on HIGH/CRITICAL)" step log in Actions

## M7: Terraform (15)

| Criterion | Status |
|---|---|
| Valid HCL in `terraform/` | ✅ `terraform validate` passes (also in CI) |
| `terraform init` | ✅ |
| `terraform plan` non-empty | ☁️ needs AWS credentials |
| VPC with ≥ 2 public subnets | ✅ in code (2 public + 2 private) |
| EKS with ≥ 1 node group | ✅ in code (`default` managed node group) |
| `terraform destroy` clean | ☁️ use `scripts/teardown-aws.sh` |
| `terraform.tfvars.example`, no credentials | ✅ |

> **Status at submission:** `terraform plan` ran against a real AWS account (`Plan: 64 to add, 0 to change,
> 0 to destroy`). `terraform apply` could not be run: every AWS account available to me sits inside an AWS
> Organization whose Service Control Policy explicitly denies EC2, EKS and SSM, so no VPC/EKS could be
> created (and therefore nothing to destroy). The Kubernetes, Helm, Ingress, HPA and monitoring layers were
> verified end-to-end on a local minikube cluster instead (M8/M9 screenshots).

📸 `m7-plan.png`: `terraform plan` (the summary line `Plan: N to add`) · `m7-validate.png`: fmt + validate
📸 `m7-aws-vpc.png`, `m7-aws-eks.png`: AWS Console, region **Asia Pacific (Mumbai) ap-south-1**
📸 `m7-destroy.png`: `Destroy complete! Resources: N destroyed.`

## M8: Kubernetes + Helm (15)

| Criterion | Status |
|---|---|
| `k8s/namespace.yaml` applies | ✅ |
| Helm chart with Chart.yaml, values.yaml, templates | ✅ `helm/medislot` |
| `helm upgrade --install` succeeds | ✅ verified on minikube (and `helm test` passes) |
| Backend and frontend ≥ 2 replicas | ✅ |
| ClusterIP Services | ✅ |
| Ingress `/` → frontend, `/api` → backend | ✅ verified through ingress-nginx |
| All pods `Running` | ✅ |

📸 `m8-pods.png`: `kubectl get pods -n medislot`
📸 `m8-svc.png`: `kubectl get svc,ingress,hpa -n medislot`
📸 `m8-helm.png`: `helm list -n medislot` and `helm history medislot -n medislot`
📸 `m8-ingress-browser.png`: browser on the NLB hostname (`kubectl get svc -n ingress-nginx`)
📸 `m8-hpa-scaling.png`: `./scripts/load-test.sh` output showing replicas go 2 → 4+

## M9: Observability (10)

| Criterion | Status |
|---|---|
| `/metrics` returns Prometheus format | ✅ |
| Prometheus installed and scraping | ✅ targets `up` (verified on minikube) |
| Grafana installed and reachable | ✅ |
| Panel with live HTTP metrics | ✅ 14-panel dashboard auto-provisioned |

📸 `m9-metrics.png`: `curl http://localhost:8000/metrics | head -40`
📸 `m9-targets.png`: Prometheus → Status → Targets → `serviceMonitor/medislot/medislot-backend/0` = **UP**
📸 `m9-grafana.png`: Grafana → Dashboards → MediSlot → *Application Overview* (run the load test first)

## M10: Presentation + docs (5)

| Criterion | Status |
|---|---|
| Root `README.md` | ✅ |
| Live demo: commit → pipeline → deployment updates | Script in [DEMO.md](DEMO.md); the UI footer shows the commit SHA, so the update is visible |

---

## Secrets checklist (zero-tolerance rule)

- [x] No AWS keys anywhere: GitHub uses OIDC; locally `aws configure`
- [x] `.env`, `*.tfvars`, `*.tfstate`, `kubeconfig*` are git-ignored
- [x] Only placeholder/dev passwords in Compose and `values-dev.yaml`; production password via the `POSTGRES_PASSWORD` secret or auto-generated
- [ ] Before pushing, run `git log -p | grep -iE "aws_secret|AKIA|password="` and check that nothing real shows up
