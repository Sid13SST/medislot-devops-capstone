#!/usr/bin/env bash
# Installs the cluster add-ons MediSlot relies on, then the application itself.
#
#   ./scripts/bootstrap-cluster.sh eks        # AWS EKS created by terraform/
#   ./scripts/bootstrap-cluster.sh minikube   # local minikube (uses locally built images)
#
# Requires: kubectl (pointing at the target cluster), helm >= 3.13.
set -euo pipefail

TARGET="${1:-eks}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INGRESS_NGINX_VERSION="4.15.1"
KPS_VERSION="92.3.1"

echo "▶ Target cluster: $(kubectl config current-context) ($TARGET)"

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null
helm repo update >/dev/null

echo "▶ Namespace + bootstrap manifests"
kubectl apply -f "$ROOT/k8s/namespace.yaml"
if [ "$TARGET" = "eks" ]; then
  kubectl apply -f "$ROOT/k8s/storageclass-gp3.yaml"
  # Only one default StorageClass should exist.
  kubectl annotate storageclass gp2 storageclass.kubernetes.io/is-default-class=false --overwrite 2>/dev/null || true
fi

echo "▶ Prometheus + Grafana (kube-prometheus-stack ${KPS_VERSION})"
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --version "$KPS_VERSION" -n monitoring --create-namespace \
  -f "$ROOT/monitoring/kube-prometheus-stack-values.yaml" --wait --timeout 10m

echo "▶ Ingress controller"
if [ "$TARGET" = "minikube" ]; then
  minikube addons enable ingress
  minikube addons enable metrics-server   # EKS gets metrics-server as a Terraform-managed add-on
  kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=5m
else
  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --version "$INGRESS_NGINX_VERSION" -n ingress-nginx --create-namespace \
    -f "$ROOT/monitoring/ingress-nginx-values.yaml" --wait --timeout 10m
fi

echo "▶ MediSlot"
if [ "$TARGET" = "minikube" ]; then
  echo "  building images inside minikube…"
  minikube image build -t medislot-backend:local "$ROOT/backend"
  minikube image build -t medislot-frontend:local "$ROOT/frontend"
  helm upgrade --install medislot "$ROOT/helm/medislot" -n medislot \
    -f "$ROOT/helm/medislot/values-dev.yaml" --wait --timeout 10m
else
  : "${IMAGE_TAG:?Set IMAGE_TAG to a pushed commit SHA (or let the GitHub Actions deploy job do this)}"
  : "${GHCR_OWNER:?Set GHCR_OWNER to your lowercase GitHub username}"
  helm upgrade --install medislot "$ROOT/helm/medislot" -n medislot \
    -f "$ROOT/helm/medislot/values-prod.yaml" \
    --set backend.image.repository="ghcr.io/${GHCR_OWNER}/medislot-backend" \
    --set backend.image.tag="$IMAGE_TAG" \
    --set frontend.image.repository="ghcr.io/${GHCR_OWNER}/medislot-frontend" \
    --set frontend.image.tag="$IMAGE_TAG" \
    --wait --timeout 10m
fi

helm test medislot -n medislot
kubectl get pods,svc,ingress,hpa -n medislot

if [ "$TARGET" = "eks" ]; then
  echo
  echo "▶ Application URL (DNS can take 1-3 minutes to propagate):"
  echo "  http://$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
else
  echo
  echo "▶ Add this line to your hosts file, then open http://medislot.local"
  echo "  $(minikube ip) medislot.local"
fi
