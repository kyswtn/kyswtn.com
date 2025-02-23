{ config, lib, pkgs, ... }:
{
  imports = [
    ./hardware-configuration.nix
  ];

  # Use the systemd-boot EFI boot loader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  # Mandatory configurations.
  networking.hostName = "nixos";
  networking.networkmanager.enable = true;
  time.timeZone = "Europe/Berlin";
  i18n.defaultLocale = "en_US.UTF-8";

  # Nix settings.
  nix = {
    settings = {
      auto-optimise-store = true;
      experimental-features = [ "nix-command" "flakes" ];
      keep-outputs = true;
    };
    gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 1w";
    };
  };

  users.users.root = {
    extraGroups = [ "docker" ];
    openssh.authorizedKeys.keys = [ (builtins.readFile ../id_ed25519.pub) ];
  };

  # Networking.
  services.openssh = {
    enable = true;
    settings = {
      PasswordAuthentication = false;
      KbdInteractiveAuthentication = false;
      PermitRootLogin = "prohibit-password";
    };
  };
  services.fail2ban.enable = true;
  services.tailscale.enable = true;
  networking.firewall.allowedTCPPorts = [ 80 443 22 ];
  networking.firewall.allowedUDPPorts = [ config.services.tailscale.port ];

  # Docker.
  virtualisation.docker.enable = true;
  system.activationScripts.mkDockerNetworks = let docker = "${pkgs.docker}/bin/docker"; in ''
    ${docker} network inspect traefik >/dev/null 2>&1 || ${docker} network create traefik
  '';

  environment.systemPackages = map lib.lowPrio [
    pkgs.curl
    pkgs.gitMinimal
  ];

  system.stateVersion = "24.11";
}
