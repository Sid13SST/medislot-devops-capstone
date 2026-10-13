terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # State is kept locally for the classroom lab (and is git-ignored).
  # For a team setup, switch to a remote backend with locking, e.g.:
  #
  # backend "s3" {
  #   bucket       = "medislot-terraform-state-<account-id>"
  #   key          = "eks/terraform.tfstate"
  #   region       = "ap-south-1"
  #   use_lockfile = true
  #   encrypt      = true
  # }
}
