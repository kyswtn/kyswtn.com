#!/usr/bin/env -S nix develop . --command bash

PATH_ROOT="$(realpath "$(dirname "$0")/..")"

# Update my public SSH key. Terraform reads this and add to Hetzner project.
MY_SSH_KEY="$(op read 'op://Personal/SSH Key/public key') $(op read 'op://Personal/SSH Key/email')"
echo "$MY_SSH_KEY" \
  >"$PATH_ROOT/generated/ssh-key.pub"

# Update Cloudflare IPs. Terraform reads this and update Hetzner firewall.
curl -s -w "\n" https://www.cloudflare.com/ips-v{4,6} \
  >"$PATH_ROOT/generated/cloudflare-ips.txt"
