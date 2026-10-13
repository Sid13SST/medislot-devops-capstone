#!/usr/bin/env bash
# Clean, cost-safe teardown of the AWS environment.
#
# Why not just `terraform destroy`? Kubernetes itself creates AWS resources that Terraform does
# not know about: the Network Load Balancer behind ingress-nginx and the EBS volume behind the
# PostgreSQL PVC. If they still exist, the VPC/subnets cannot be deleted and destroy fails.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ Removing Kubernetes-created AWS resources (load balancer, EBS volumes)…"
helm uninstall medislot -n medislot --wait 2>/dev/null || true
kubectl delete pvc --all -n medislot --wait=true 2>/dev/null || true
helm uninstall ingress-nginx -n ingress-nginx --wait 2>/dev/null || true
helm uninstall kube-prometheus-stack -n monitoring --wait 2>/dev/null || true
kubectl delete namespace medislot monitoring ingress-nginx --wait=true 2>/dev/null || true

echo "▶ Waiting for the load balancer to be released…"
for _ in $(seq 1 30); do
  if ! kubectl get svc -A -o jsonpath='{range .items[?(@.spec.type=="LoadBalancer")]}{.metadata.name}{"\n"}{end}' 2>/dev/null | grep -q .; then
    break
  fi
  sleep 10
done
sleep 30   # give AWS a moment to finish deleting the NLB and its ENIs

echo "▶ terraform destroy"
cd "$ROOT/terraform"
terraform destroy -auto-approve

echo "✅ All MediSlot AWS resources destroyed. Double-check the EC2 → Load Balancers and EBS → Volumes pages in ap-south-1."
