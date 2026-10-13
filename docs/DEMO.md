# Final demo script (≈ 15 minutes)

Follows the required order: Application → Git → CI → Docker → Security → Registry → Terraform →
Kubernetes → Helm → Ingress → Autoscaling → Monitoring → Troubleshooting.

## Before the session (≈ 30 min ahead)

```bash
cd terraform && terraform apply                 # if the cluster isn't up yet (~15 min)
aws eks update-kubeconfig --region ap-south-1 --name medislot-eks
kubectl get pods -A                             # everything Running
# Terminal tabs ready:
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3001:80
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
APP=http://$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
python scripts/seed_demo_data.py "$APP"         # realistic data on the dashboard
```

Browser tabs: app (`$APP`), `$APP/docs`, GitHub Actions, GHCR packages, Grafana, Prometheus targets, AWS console (VPC, EKS).

## Live flow

| # | Show | Say |
|---|---|---|
| 1 | **App**: book an appointment, try a clashing slot (409 message), check in → complete | "A clinic front-desk tool. The backend enforces no double-booking and a strict visit lifecycle." |
| 2 | **API**: `$APP/docs`, run `GET /api/appointments/stats`, `POST`, `PUT`, `DELETE` | "13 REST endpoints, validated by Pydantic, documented automatically." |
| 3 | **Database**: `kubectl exec -it medislot-postgres-0 -n medislot -- psql -U medislot -c 'select id, patient_name, status from appointments;'` | "Schema owned by Alembic migrations, never `create_all`." |
| 4 | **Git**: change the subtitle in `frontend/src/App.jsx`, then `git commit -am "feat(ui): update dashboard subtitle for demo" && git push` | "Note the SHA: that's the image tag we'll see in production." |
| 5 | **CI**: Actions tab → watch the test jobs | "If a test fails, no image is built: that's the first quality gate." |
| 6 | **Docker**: the build step in the matrix job; `docker images` locally | "Multi-stage builds, both run as non-root." |
| 7 | **Security**: Trivy step log, then the Security → Code scanning tab | Explain the 4 CVEs we found and removed (`docs/TRIVY.md`). |
| 8 | **Registry**: GHCR package page with the new SHA tag | "Immutable SHA tags, never `latest`." |
| 9 | **Terraform**: `terraform/main.tf`, `terraform state list \| head`, AWS console VPC + EKS | "VPC, 4 subnets, NAT, EKS, node group, add-ons, OIDC role, all in code." |
| 10 | **Kubernetes**: `kubectl get pods,svc -n medislot` | Probes: `/health` vs `/ready`. |
| 11 | **Helm**: `helm list -n medislot`, `helm history medislot -n medislot` | "The pipeline did `helm upgrade` with `--rollback-on-failure`." |
| 12 | **Deployment updated**: refresh the app; the footer shows the **new commit SHA** | "Commit to production with no manual steps." |
| 13 | **HPA**: `./scripts/load-test.sh` + `kubectl get hpa -n medislot -w` | Watch 2 → 4+ pods; requests are required for HPA. |
| 14 | **Monitoring**: Prometheus target UP; Grafana dashboard during the load test | Requests/s, p95 latency, CPU per pod, HPA replicas, bookings by department. |
| 15 | **Failure**: `kubectl apply -f troubleshooting/broken-service.yaml`, then diagnose with `get endpointslices` / `--show-labels` and patch | Follow `troubleshooting/RUNBOOK.md`. |

Rollback bonus: `helm rollback medislot <previous-revision> -n medislot`, and the footer SHA changes back.

## After the session

```bash
./scripts/teardown-aws.sh       # NLB + EBS first, then terraform destroy
```
Unset the `AWS_DEPLOY_ROLE_ARN` repository variable.
