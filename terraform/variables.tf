variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Used for naming and tagging."
  type        = string
  default     = "medislot"
}

variable "environment" {
  description = "Environment name (tag only)."
  type        = string
  default     = "dev"
}

variable "owner" {
  description = "Owner tag, so classroom resources can be traced back to a person."
  type        = string
  default     = "siddhant-prasad"
}

# ---------- Network ----------
variable "vpc_cidr" {
  description = "CIDR block of the VPC."
  type        = string
  default     = "10.30.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones (one public + one private subnet in each)."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "EKS needs subnets in at least two availability zones (max 3 here)."
  }
}

variable "availability_zones" {
  description = "Explicit availability zones to use. Leave empty to look them up (needs ec2:DescribeAvailabilityZones)."
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.availability_zones) == 0 || length(var.availability_zones) >= 2
    error_message = "Provide at least two availability zones, or leave the list empty."
  }
}

# ---------- EKS ----------
variable "cluster_name" {
  description = "EKS cluster name (also used by the CI deploy job)."
  type        = string
  default     = "medislot-eks"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version. Use a version in *standard* support to avoid extended-support charges."
  type        = string
  default     = "1.35"
}

variable "node_instance_types" {
  description = "Instance types for the managed node group."
  type        = list(string)
  default     = ["t3.large"]
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 4
}

# ---------- GitHub Actions (OIDC) ----------
variable "github_repository" {
  description = "\"owner/repo\" allowed to deploy via GitHub OIDC. Leave empty to skip creating the CI deploy role."
  type        = string
  default     = ""

  validation {
    condition     = var.github_repository == "" || can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository must look like \"owner/repo\"."
  }
}

variable "create_github_oidc_provider" {
  description = "Create the account-wide GitHub OIDC provider. Set false if your AWS account already has one."
  type        = bool
  default     = true
}
