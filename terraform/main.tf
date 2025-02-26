terraform {
  backend "s3" {
    bucket                      = "tfstate"
    key                         = "kyswtn-com/server.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
  required_providers {
    porkbun = {
      source  = "kyswtn/porkbun"
      version = "0.1.3"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.1.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "2.10.0"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "1.50.0-rc.0"
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

provider "porkbun" {}
provider "cloudflare" {}
provider "hcloud" {}
provider "vercel" {}

# Create a Cloudflare zone.
resource "cloudflare_zone" "zone" {
  account = { id = var.cloudflare_account_id }
  name    = var.porkbun_domain_name
}

# Switch to Cloudflare's nameservers.
resource "porkbun_nameservers" "nameservers" {
  domain      = var.porkbun_domain_name
  nameservers = cloudflare_zone.zone.name_servers
}

# Deploy sites/www with Vercel.
resource "vercel_project" "www" {
  name = "kyswtn-com"
  git_repository = {
    type              = "github"
    repo              = "kyswtn/kyswtn.com"
    production_branch = "main"
  }
  root_directory = "sites/www"
  git_comments = {
    on_commit       = false
    on_pull_request = true
  }
  ignore_command                       = "git diff HEAD^ HEAD --quiet -- . ../../notes"
  enable_affected_projects_deployments = true
}

# Add DOMAIN_NAME environment variable.
resource "vercel_project_environment_variable" "domain_name" {
  project_id = vercel_project.www.id
  key        = "DOMAIN_NAME"
  value      = var.porkbun_domain_name
  target     = ["production", "preview", "development"]
}

# Point Cloudflare's DNS apex A to Vercel's IP.
resource "cloudflare_dns_record" "a_apex" {
  zone_id = cloudflare_zone.zone.id
  type    = "A"
  name    = "@"
  content = "76.76.21.21"
  proxied = false
  ttl     = 1 # 1 means auto
}

# Point Cloudflare's DNS www CNAME to Vercel's CNAME server.
resource "cloudflare_dns_record" "cname_www" {
  zone_id = cloudflare_zone.zone.id
  type    = "CNAME"
  name    = "www"
  content = "cname.vercel-dns.com"
  proxied = false
  ttl     = 1 # 1 means auto
}

# Add custom domain to Vercel project.
resource "vercel_project_domain" "apex" {
  project_id = vercel_project.www.id
  domain     = var.porkbun_domain_name
  depends_on = [cloudflare_dns_record.a_apex]
}

# Redirect www CNAME to apex domain.
resource "vercel_project_domain" "www" {
  project_id           = vercel_project.www.id
  domain               = "www.${var.porkbun_domain_name}"
  redirect             = var.porkbun_domain_name
  redirect_status_code = 308
  depends_on           = [cloudflare_dns_record.cname_www, vercel_project_domain.apex]
}

# Save my ssh key on HCloud.
resource "hcloud_ssh_key" "primary_ssh_key" {
  name       = "ssh_key"
  public_key = file("../generated/ssh-key.pub")
}

# Make a firewall we can update manually in case of emergency on HCloud.
resource "hcloud_firewall" "primary_firewall" {
  name = "primary_firewall"
  # rule {
  #   description = "SSH"
  #   direction   = "in"
  #   protocol    = "tcp"
  #   port        = "22"
  #   source_ips  = ["0.0.0.0/0", "::/0"]
  # }
  rule {
    description = "Tailscale"
    direction   = "in"
    protocol    = "udp"
    port        = "41641"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }
  rule {
    description = "Cloudflare HTTP"
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = compact(split("\n", file("../generated/cloudflare-ips.txt")))
  }
  rule {
    description = "Cloudflare HTTPS"
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = compact(split("\n", file("../generated/cloudflare-ips.txt")))
  }
}

data "hcloud_image" "nixos_24_11" {
  most_recent       = true
  with_architecture = "arm"
  with_selector     = "name=nixos-24.11"
}

# Create a server on HCloud.
resource "hcloud_server" "primary_server" {
  name         = "nixos"
  location     = "hel1"
  image        = data.hcloud_image.nixos_24_11.id
  server_type  = "cax11" # Arm64 (Ampere) €3.29/mo
  ssh_keys     = [hcloud_ssh_key.primary_ssh_key.id]
  firewall_ids = [hcloud_firewall.primary_firewall.id]
}

output "server_ip" {
  value = hcloud_server.primary_server.ipv4_address
}

# Point wildcard subdomains to VPS's IPv4 A.
resource "cloudflare_dns_record" "a" {
  zone_id = cloudflare_zone.zone.id
  type    = "A"
  name    = "*"
  content = hcloud_server.primary_server.ipv4_address
  proxied = true
  ttl     = 1 # 1 means auto
}

# Point wildcard subdomains to VPS's IPv6 AAAA.
resource "cloudflare_dns_record" "aaaa" {
  zone_id = cloudflare_zone.zone.id
  type    = "AAAA"
  name    = "*"
  content = hcloud_server.primary_server.ipv6_address
  proxied = true
  ttl     = 1
}
