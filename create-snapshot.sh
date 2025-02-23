#!/usr/bin/env -S nix develop . --command bash

SSH_KEY=$(cat ./id_ed25519.pub)
op run -- create-hcloud-nixos-snapshot \
  --location nbg1 \
  --server-type cax11 \
  --ssh-key "$SSH_KEY" \
  --save-config-to ./nixos
