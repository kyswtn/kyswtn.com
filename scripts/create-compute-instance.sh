#!/usr/bin/env -S nix develop . --command bash

SNAPSHOT_ID="$(op run -- hcloud image list --type snapshot -l name=compute -o noheader -o columns=id)"
op run -- hcloud server create \
  --name compute \
  --location sin \
  --type ccx33 \
  --image $SNAPSHOT_ID
