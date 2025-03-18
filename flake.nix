{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    create-hcloud-nixos-snapshot = {
      url = "github:kyswtn/create-hcloud-nixos-snapshot";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { nixpkgs, ... }@inputs:
    let
      mkInputs = system: with inputs; {
        pkgs = import nixpkgs {
          inherit system;
          config = { allowUnfree = true; };
        };
        create-hcloud-nixos-snapshot = create-hcloud-nixos-snapshot.packages.${system}.default;
      };
      forAllSupportedSystems = fn:
        with nixpkgs.lib; attrsets.genAttrs systems.flakeExposed
          (system: fn (mkInputs system));
    in
    {
      devShells = forAllSupportedSystems (inputs: with inputs; {
        default = pkgs.mkShellNoCC {
          packages = with pkgs; [
            _1password-cli
            biome
            bun
            create-hcloud-nixos-snapshot
            hcloud
            opentofu
            terraform-ls

            (pkgs.writeShellScriptBin "nixos-redeploy" ''
              HOSTNAME="nixos"
              SERVER_HOST="''\${1:-$HOSTNAME}"
              ${nixos-rebuild}/bin/nixos-rebuild switch \
                --flake .#$HOSTNAME --fast \
                --build-host "root@$SERVER_HOST"  \
                --target-host "root@$SERVER_HOST"
            '')

            (pkgs.writeShellScriptBin "deploy-compose" ''
              set -euo pipefail

              FOLDER_PATH="$1"
              FOLDER_NAME=$(basename "$FOLDER_PATH")

              if [ -f "$FOLDER_PATH/.env.example" ] && [ ! -f "$FOLDER_PATH/.env" ]; then
                read -p "No .env file found in $FOLDER_PATH but .env.example exists. Continue? [y/N] " -n 1 -r
                echo
                [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
              fi

              HOSTNAME="nixos"
              SERVER_HOST="''\${2:-$HOSTNAME}"

              DOCKER_ARGS="$@"
 
              ssh "$SERVER_HOST" "mkdir -p /root/$FOLDER_NAME"
              rsync -avz --exclude='node_modules' "$FOLDER_PATH/" "$SERVER_HOST:/root/$FOLDER_NAME/"
              ssh "$SERVER_HOST" "cd /root/$FOLDER_NAME && docker compose up -d $DOCKER_ARGS"
            '')
          ];
        };
      });

      nixosConfigurations.nixos = nixpkgs.lib.nixosSystem {
        system = "aarch64-darwin";
        modules = [
          ./nixos/configuration.nix
        ];
      };
    };
}
