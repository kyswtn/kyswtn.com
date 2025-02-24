#!/usr/bin/env -S nix develop . --command bash

PATH_ROOT="$(realpath "$(dirname "$0")/..")"
SSH_KEY="$(cat "$PATH_ROOT/generated/ssh-key.pub")"
op run -- create-hcloud-nixos-snapshot \
  --location nbg1 \
  --server-type cax11 \
  --ssh-key "$SSH_KEY" \
  --save-config-to $PATH_ROOT/nixos
