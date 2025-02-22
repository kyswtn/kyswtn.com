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
            # wrangler

            (pkgs.writeShellScriptBin "nixos-redeploy" ''
              ${nixos-rebuild}/bin/nixos-rebuild switch \
                --flake .#nixos --fast \
                --build-host "root@$SERVER_IP"  \
                --target-host "root@$SERVER_IP"
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
