terraform {
  backend "s3" {
    bucket                      = "tfstate"
    key                         = "kyswtn-com/email.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.1.0"
    }
  }
}

variable "porkbun_domain_name" {
  type     = string
  nullable = false
}

variable "cloudflare_account_id" {
  type     = string
  nullable = false
}

provider "cloudflare" {}

resource "cloudflare_zone" "zone" {
  account = { id = var.cloudflare_account_id }
  name    = var.porkbun_domain_name
}
