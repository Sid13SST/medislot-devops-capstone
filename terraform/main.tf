# ─────────────────────────────── VPC ───────────────────────────────
# 2 AZs × (public + private) subnets. Worker nodes live in private subnets and reach the
# internet (GHCR image pulls) through a single NAT gateway; load balancers go in public subnets.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.7"

  name = "${var.project_name}-vpc"
  cidr = var.vpc_cidr
  azs  = local.azs

  public_subnets  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, 100 + i)] # 10.30.100.0/24, 10.30.101.0/24
  private_subnets = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, 1 + i)]   # 10.30.1.0/24,   10.30.2.0/24

  enable_nat_gateway   = true
  single_nat_gateway   = true # one NAT keeps classroom cost down (not HA)
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags that let Kubernetes place internet-facing / internal load balancers in the right subnets.
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}

# ─────────────────────────────── EKS ───────────────────────────────
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.29"

  name               = var.cluster_name
  kubernetes_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Public API endpoint so kubectl / GitHub Actions can reach it; nodes use the private endpoint.
  endpoint_public_access  = true
  endpoint_private_access = true

  # The identity running `terraform apply` becomes cluster admin (EKS access entries).
  enable_cluster_creator_admin_permissions = true

  addons = {
    vpc-cni = {
      before_compute = true
      most_recent    = true
    }
    kube-proxy = {
      most_recent = true
    }
    coredns = {
      most_recent = true
    }
    eks-pod-identity-agent = {
      before_compute = true
      most_recent    = true
    }
    # Provisions EBS volumes for the PostgreSQL PersistentVolumeClaim.
    aws-ebs-csi-driver = {
      most_recent = true
    }
    # Supplies CPU/memory metrics to the Horizontal Pod Autoscaler (kubectl top / HPA).
    metrics-server = {
      most_recent = true
    }
  }

  eks_managed_node_groups = {
    default = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = var.node_instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.node_min_size
      desired_size = var.node_desired_size
      max_size     = var.node_max_size

      # Lets the EBS CSI driver (running on the nodes) create and attach volumes.
      iam_role_additional_policies = {
        ebs_csi = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
      }

      labels = {
        workload = "general"
      }
    }
  }

  # Grant the GitHub Actions deploy role access to the cluster (only when it is created).
  access_entries = local.github_enabled ? {
    github_actions = {
      principal_arn = aws_iam_role.github_actions[0].arn
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  } : {}
}
