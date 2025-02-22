#!/usr/bin/env -S nix develop . --command bash

CWD=$(dirname "$0")

# Update my public SSH key. Terraform reads this and add to Hetzner project.
op read --out-file "$PWD/id_ed25519.pub" "op://Personal/SSH Key/public key"

# Update Cloudflare IPs. Terraform reads this and update Hetzner firewall.
curl -s -w "\n" https://www.cloudflare.com/ips-v{4,6} >"$CWD/cloudflare-ips.txt"
