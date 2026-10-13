# Troubleshooting runbook

Three deliberately broken manifests for the live "failure simulation" part of the demo.
All of them target the `medislot` namespace and comply with its `restricted` Pod Security
Standard, so they fail for the intended reason only.

```bash
kubectl apply -f troubleshooting/          # break things
kubectl delete -f troubleshooting/         # clean up afterwards
```

General triage order: **get → describe → events → logs → labels/endpoints**.

```bash
kubectl get pods -n medislot -o wide
kubectl describe pod <pod> -n medislot
kubectl get events -n medislot --sort-by=.lastTimestamp
kubectl logs <pod> -n medislot [--previous]
```

---

## Lab 1 — `ImagePullBackOff` (broken-image.yaml)

| Step | Command | What you see |
|---|---|---|
| Symptom | `kubectl get pods -n medislot -l lab=broken-image` | `ErrImagePull`, then `ImagePullBackOff`, READY `0/1` |
| Diagnose | `kubectl describe pod -n medislot -l lab=broken-image` | Events: `Failed to pull image "ghcr.io/sid13sst/medislot-backend:this-tag-does-not-exist" … not found` |
| Root cause | — | The tag was never pushed. (Other causes of the same symptom: typo in the repository, private GHCR package without `imagePullSecrets`, registry rate limits.) |
| Fix | `kubectl set image deploy/lab-broken-image backend=ghcr.io/sid13sst/medislot-backend:<real-commit-sha> -n medislot` | Pod pulls and starts |

**Lesson:** the pipeline tags images with the commit SHA, so the correct tag is always the SHA
of a commit whose pipeline passed — look it up on the GHCR package page or in the Actions run summary.

## Lab 2 — Service without endpoints (broken-service.yaml)

| Step | Command | What you see |
|---|---|---|
| Symptom | `kubectl run curl --rm -it -n medislot --image=curlimages/curl --restart=Never -- curl -m 3 http://lab-broken-service:8000/health` | Connection times out / refused |
| Diagnose | `kubectl get endpointslices -n medislot -l kubernetes.io/service-name=lab-broken-service` | `ENDPOINTS <unset>` — no Pod matched |
| Compare labels | `kubectl get svc lab-broken-service -n medislot -o jsonpath='{.spec.selector}'` and `kubectl get pods -n medislot --show-labels` | Selector wants `component=api`; Pods carry `component=backend` |
| Fix | `kubectl patch svc lab-broken-service -n medislot -p '{"spec":{"selector":{"app.kubernetes.io/component":"backend"}}}'` | Endpoints appear immediately |

**Lesson:** a Service finds Pods only through labels. No matching labels → no endpoints → no traffic,
even though the Service itself looks perfectly healthy.

## Lab 3 — Running but not Ready (broken-readiness.yaml)

| Step | Command | What you see |
|---|---|---|
| Symptom | `kubectl get pods -n medislot -l lab=broken-readiness` | STATUS `Running` but READY `0/1` |
| Diagnose | `kubectl describe pod -n medislot -l lab=broken-readiness` | `Readiness probe failed: … :80/: connect: connection refused` |
| Root cause | — | Unprivileged Nginx listens on **8080**; the probe checks **80** |
| Fix | `kubectl patch deploy lab-broken-readiness -n medislot --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":8080}]'` | New Pod becomes `1/1` |

**Lesson:** liveness answers "is the process alive?", readiness answers "may it receive traffic?".
MediSlot's backend uses `/health` (cheap, no DB) for liveness and `/ready` (checks PostgreSQL) for
readiness, so a database outage removes Pods from the load balancer without restart loops.

---

## Real issues hit while building this project

| Problem | Symptom | Fix |
|---|---|---|
| Trivy failed the backend image | 4 HIGH CVEs in `urllib3` / `msgpack` / `setuptools` | They were **pip's vendored copies**, not app dependencies. The runtime image no longer ships pip at all (`backend/Dockerfile`). |
| PostgreSQL on EBS refuses to start | `initdb: directory … exists but is not empty` (`lost+found`) | `PGDATA=/var/lib/postgresql/data/pgdata` sub-directory (`helm/medislot/templates/postgres.yaml`). |
| PVC stuck `Pending` on EKS | `no persistent volumes available … no storage class is set` | EBS CSI add-on in Terraform + `k8s/storageclass-gp3.yaml`. New EKS clusters have no default StorageClass. |
| Two backend replicas migrating at once | Race on `alembic_version` | Alembic takes a PostgreSQL advisory lock (`backend/alembic/env.py`). |
| `terraform destroy` hangs on the VPC | Subnets/IGW have dependencies | The NLB and EBS volumes were created by Kubernetes, not Terraform — `scripts/teardown-aws.sh` deletes them first. |
| Port 5432 already in use locally | `Bind for 0.0.0.0:5432 failed` | `POSTGRES_HOST_PORT=5433 docker compose up` |
