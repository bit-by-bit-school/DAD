terraform {
  required_version = ">= 1.3.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}

# Firewall rule to allow HTTP, HTTPS, and custom App traffic (Port 3000)
resource "google_compute_firewall" "allow_app_traffic" {
  name    = "${var.instance_name}-allow-app"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "3000"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server", "https-server", "nodejs-app"]
}

# Compute Engine Instance - Lowest Paid Cost GCP Server
resource "google_compute_instance" "cheapest_server" {
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.gcp_zone

  tags = ["http-server", "https-server", "nodejs-app"]

  # Boot disk (10 GB pd-standard = ~$0.40/month)
  boot_disk {
    initialize_params {
      image = var.os_image
      size  = var.disk_size_gb
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"

    access_config {
      # Assigns an ephemeral public IP address
    }
  }

  # Scheduling options: SPOT provisioning provides up to 60-80% discount (~$2/mo)
  scheduling {
    preemptible        = var.use_spot_instance
    automatic_restart  = var.use_spot_instance ? false : true
    provisioning_model = var.use_spot_instance ? "SPOT" : "STANDARD"
  }

  # Startup script: installs Go, clones repo, builds lightweight binary, sets up systemd service
  metadata_startup_script = <<-EOF
    #!/bin/bash
    set -e

    # 1. Configure lightweight 512MB Swap file as safety backup
    if [ ! -f /swapfile ]; then
      fallocate -l 512M /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=512
      chmod 600 /swapfile
      mkswap /swapfile
      swapon /swapfile
      echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi

    # 2. Update packages and install official Go binary + tools
    export HOME=/root
    export GOPATH=/root/go
    export GOMODCACHE=/root/go/pkg/mod
    export PATH=/usr/local/go/bin:$PATH

    sudo apt-get update -y
    sudo apt-get install -y curl git sqlite3 tar

    if [ ! -d "/usr/local/go" ] || ! /usr/local/go/bin/go version | grep -q "go1.23"; then
      echo "Installing official Go 1.23.0..."
      rm -rf /usr/local/go
      curl -sSL https://go.dev/dl/go1.23.0.linux-amd64.tar.gz | tar -C /usr/local -xz
    fi

    # 3. Setup application directory & clone repository
    mkdir -p /opt/hackerrank-server
    if [ ! -d "/opt/hackerrank-server/repo" ]; then
      git clone https://github.com/bit-by-bit-school/DAD.git /opt/hackerrank-server/repo
    else
      cd /opt/hackerrank-server/repo && git pull origin main || true
    fi

    # 4. Build Go executable binary
    cd /opt/hackerrank-server/repo/server
    /usr/local/go/bin/go build -o /opt/hackerrank-server/server main.go

    # 5. Setup application systemd service
    cat <<'SERVICE' > /etc/systemd/system/hackerrank-server.service
    [Unit]
    Description=HackerRank Solutions Hub Golang Server
    After=network.target

    [Service]
    Type=simple
    User=root
    WorkingDirectory=/opt/hackerrank-server/repo/server
    ExecStart=/opt/hackerrank-server/server
    Restart=always
    RestartSec=3
    Environment=PORT=3000

    [Install]
    WantedBy=multi-user.target
SERVICE

    systemctl daemon-reload
    systemctl enable hackerrank-server
    systemctl restart hackerrank-server

    echo "Golang initialization & production service deployment complete."
  EOF

  metadata = {
    ssh-keys = var.ssh_user != "" && var.ssh_pub_key != "" ? "${var.ssh_user}:${var.ssh_pub_key}" : null
  }
}
