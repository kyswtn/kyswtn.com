{ config, lib, pkgs, ... }:
{
  imports = [
    ./hardware-configuration.nix
  ];

  # Use the systemd-boot EFI boot loader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  networking.hostName = "nixos";
  networking.networkmanager.enable = true;
  time.timeZone = "Europe/Helsinki";
  i18n.defaultLocale = "en_US.UTF-8";

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

  virtualisation.docker.enable = true;
  users.users.root = {
    extraGroups = [ "docker" ];
    openssh.authorizedKeys.keys = [ (builtins.readFile ../id_ed25519.pub) ];
  };

  environment.systemPackages = map lib.lowPrio [
    pkgs.curl
    pkgs.gitMinimal
  ];

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

  system.stateVersion = "24.11";
}
