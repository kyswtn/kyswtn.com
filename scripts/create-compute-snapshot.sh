#!/usr/bin/env -S nix develop . --command bash

PATH_ROOT="$(realpath "$(dirname "$0")/..")"
SSH_KEY="$(cat "$PATH_ROOT/generated/ssh-key.pub")"
op run -- create-hcloud-nixos-snapshot \
  --location sin \
  --server-type ccx33 \
  --ssh-key "$SSH_KEY" \
  --host-name compute \
  --save-config-to $PATH_ROOT/compute
