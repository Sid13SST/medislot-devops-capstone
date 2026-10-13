# Terraform: AWS VPC + EKS for MediSlot

Infrastructure as Code for the production-style environment in **ap-south-1 (Mumbai)**.

> 💸 **Cost warning:** EKS control plane (~$0.10/h), 2× t3.large nodes, a NAT Gateway and the
> ingress load balancer all bill hourly. Always finish with `../scripts/teardown-aws.sh`.

## What gets created

| Layer | Resources |
|---|---|
| Network (`module.vpc`) | VPC `10.30.0.0/16`; **2 public subnets** (`10.30.100.0/24`, `10.30.101.0/24`) tagged for internet-facing load balancers; **2 private subnets** (`10.30.1.0/24`, `10.30.2.0/24`) for worker nodes; Internet Gateway; 1 NAT Gateway; route tables |
| Cluster (`module.eks`) | EKS **1.35**, public + private API endpoint, access entries (you = cluster admin) |
| Compute | Managed node group `default`: AL2023, `t3.large`, min 2 / desired 2 / max 4, in private subnets |
| Add-ons | vpc-cni, kube-proxy, coredns, eks-pod-identity-agent, **aws-ebs-csi-driver** (PostgreSQL volume), **metrics-server** (HPA) |
| CI access (`github-oidc.tf`) | GitHub OIDC provider + IAM role that only this repo's `main` branch / `production` environment can assume, mapped to the cluster with an EKS access entry |

## Prerequisites

- Terraform ≥ 1.9, AWS CLI v2, kubectl, helm
- AWS credentials via `aws configure` or `aws sso login`. **Never** put keys in `.tf`/`.tfvars` files.

## Usage

```bash
cp terraform.tfvars.example terraform.tfvars   # set github_repository = "<user>/<repo>"
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out tfplan
terraform apply tfplan                         # ~15 minutes
aws eks update-kubeconfig --region ap-south-1 --name medislot-eks
kubectl get nodes
terraform output github_actions_role_arn       # → GitHub repo variable AWS_DEPLOY_ROLE_ARN
```

If your AWS account already has a GitHub OIDC provider, set `create_github_oidc_provider = false`.

## Destroy

```bash
../scripts/teardown-aws.sh
```

Plain `terraform destroy` can hang: Kubernetes itself created an NLB (for ingress-nginx) and EBS
volumes (for the PostgreSQL PVC) that Terraform doesn't track, and they keep the subnets in use. The
script removes those first, then runs `terraform destroy`.

## Concepts demonstrated

Providers and `default_tags` · input variables with validation · reusable registry modules with
version constraints · `count`-based optional resources · data sources (`aws_availability_zones`,
`aws_caller_identity`, IAM policy documents) · outputs · implicit dependency graph (VPC → EKS → node
group → add-ons) · plan/apply/destroy lifecycle · state (local here; S3 backend example in `versions.tf`).
