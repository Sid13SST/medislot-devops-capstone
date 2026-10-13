#!/usr/bin/env bash
# Generates CPU load on the backend so the HorizontalPodAutoscaler scales out.
#
#   ./scripts/load-test.sh            # 3 minutes, 20 parallel workers, from inside the cluster
#   DURATION=300 WORKERS=40 ./scripts/load-test.sh
#
# Watch it in another terminal:
#   kubectl get hpa -n medislot -w
#   kubectl top pods -n medislot
set -euo pipefail

NAMESPACE="${NAMESPACE:-medislot}"
DURATION="${DURATION:-180}"
WORKERS="${WORKERS:-20}"
TARGET="${TARGET:-http://medislot-backend:8000/api/appointments/stats}"

kubectl delete pod load-generator -n "$NAMESPACE" --ignore-not-found --wait=true >/dev/null

echo "▶ ${WORKERS} workers hitting ${TARGET} for ${DURATION}s"
kubectl run load-generator -n "$NAMESPACE" --image=busybox:1.37 --restart=Never \
  --overrides='{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":65534,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"load-generator","image":"busybox:1.37","securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}},"command":["sh","-c","end=$(( $(date +%s) + '"$DURATION"' )); for i in $(seq 1 '"$WORKERS"'); do (while [ $(date +%s) -lt $end ]; do wget -q -O /dev/null '"$TARGET"' || true; done) & done; wait; echo done"]}]}}'

kubectl wait --for=condition=Ready pod/load-generator -n "$NAMESPACE" --timeout=60s >/dev/null || true
for _ in $(seq 1 $(( DURATION / 15 ))); do
  echo "$(date +%T)  $(kubectl get hpa -n "$NAMESPACE" --no-headers 2>/dev/null)"
  sleep 15
done

kubectl delete pod load-generator -n "$NAMESPACE" --ignore-not-found >/dev/null
echo "▶ Load finished — the HPA scales back down after its 2-minute stabilisation window."
