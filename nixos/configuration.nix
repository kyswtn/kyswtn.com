{ config, lib, pkgs, ... }:
let
  credentials = rec {
    sshKey = lib.strings.removeSuffix "\n" (builtins.readFile ../generated/ssh-key.pub);
    email = lib.lists.last (lib.strings.splitString " " sshKey);
  };
in
{
  imports = [
    ./hardware-configuration.nix
  ];

  # Use the systemd-boot EFI boot loader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  # Configure mandatory stuff.
  networking.hostName = "nixos";
  networking.networkmanager.enable = true;
  time.timeZone = "Europe/Helsinki";
  i18n.defaultLocale = "en_US.UTF-8";

  # Configure Nix.
  nix = {
    settings = {
      auto-optimise-store = true;
      experimental-features = [ "nix-command" "flakes" ];
      keep-outputs = true;
    };
    gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 7d";
    };
  };

  # Configure networking (OpenSSH, Fail2Ban, Tailscale, CrowdSec etc).
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

  # Configure Docker.
  virtualisation.docker.enable = true;

  # Configure root user.
  users.users.root = {
    extraGroups = [ "docker" ];
    openssh.authorizedKeys.keys = [ credentials.sshKey ];
  };

  # Patch dynamic-linking to make vscode-server work.
  programs.nix-ld.enable = true;

  # Install these.
  environment.systemPackages = map lib.lowPrio [
    pkgs.curl
    pkgs.gitMinimal
    pkgs.restic
  ];

  # Backup /srv to Cloudflare R2 everyday.
  system.activationScripts.init-restic-repo = ''
    # Set environment variables.
    set -a
    source /.restic-env
    set +a

    # Check if repository exists using cat config.
    if ! ${pkgs.restic}/bin/restic cat config &>/dev/null; then
      echo "Initializing new restic repository..."
      ${pkgs.restic}/bin/restic init
    else
      echo "Restic repository already initialized."
    fi
  '';
  systemd.services.backup-srv = {
    description = "Backup /srv to Cloudflare R2";
    serviceConfig = {
      Type = "oneshot";
      User = "root";
      ExecStart = "${pkgs.restic}/bin/restic backup /srv";
      EnvironmentFile = "/.restic-env";
    };
  };
  systemd.timers.backup-srv = {
    description = "Timer for daily /srv backup to Cloudflare R2";
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnCalendar = "daily";
      Persistent = true;
      Unit = "backup-srv.service";
    };
  };

  # Setup Traefik.
  system.activationScripts.prepareTraefik =
    let docker = "${pkgs.docker}/bin/docker"; in
    ''
      # Make an isolated network for Traefik traffic.
      ${docker} network inspect traefik >/dev/null 2>&1 || ${docker} network create traefik

      # Create dynamic config because Traefik can't read configs inside /nix/store.
      CONFIG_FILE="${config.services.traefik.dynamicConfigFile}"
      mkdir -p "$(dirname "$CONFIG_FILE")"
      CONFIG=${lib.strings.escapeShellArg (builtins.readFile ./traefik-dynamic-config.yml)} 
      echo "$CONFIG" > "$CONFIG_FILE"
    '';
  services.traefik = {
    enable = true;
    group = "docker";
    dynamicConfigFile = "/etc/traefik/dynamic_config.yml";
    staticConfigOptions = {
      api = { dashboard = true; };
      log = {
        level = "INFO";
        format = "json";
        filePath = "${config.services.traefik.dataDir}/traefik.log";
      };
      providers = {
        file = {
          watch = true;
          directory = "/etc/traefik";
        };
        docker = {
          endpoint = "unix:///var/run/docker.sock";
          network = "traefik";
          exposedByDefault = false;
        };
      };
      entryPoints = {
        web = {
          address = ":80";
          asDefault = true;
          http.redirections.entrypoint = {
            to = "websecure";
            scheme = "https";
          };
        };
        websecure = {
          address = ":443";
          asDefault = true;
          http.tls.certResolver = "letsencrypt";
        };
      };
      certificatesResolvers.letsencrypt.acme = {
        email = credentials.email;
        storage = "${config.services.traefik.dataDir}/acme.json";
        httpChallenge.entryPoint = "web";
      };
    };
  };

  system.stateVersion = "24.11";
}
