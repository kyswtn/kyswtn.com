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

# Save my ssh key on Hcloud.
resource "hcloud_ssh_key" "primary_ssh_key" {
  name       = "ssh_key"
  public_key = file("../../id_ed25519.pub")
}

# Make a firewall on Hcloud.
resource "hcloud_firewall" "primary_firewall" {
  name = "firewall"
  rule {
    description = "SSH"
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }
  rule {
    description = "Cloudflare HTTP"
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = compact(split("\n", file("../../cloudflare-ips.txt")))
  }
  rule {
    description = "Cloudflare HTTPS"
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = compact(split("\n", file("../../cloudflare-ips.txt")))
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

# # Update DNS for IPv4 A.
# resource "cloudflare_dns_record" "a" {
#   zone_id = cloudflare_zone.zone.id
#   type    = "A"
#   name    = "@"
#   content = hcloud_server.primary_server.ipv4_address
#   proxied = true
#   ttl     = 1 # 1 means auto
# }

# # Update DNS for IPv6 AAAA.
# resource "cloudflare_dns_record" "aaaa" {
#   zone_id = cloudflare_zone.zone.id
#   type    = "AAAA"
#   name    = "@"
#   content = hcloud_server.primary_server.ipv6_address
#   proxied = true
#   ttl     = 1
# }
