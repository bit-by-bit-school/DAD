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

  # Startup script: creates 1GB swap space (prevents OOM on low-RAM VMs), installs Git, Node.js 20, and PM2
  metadata_startup_script = <<-EOF
    #!/bin/bash
    set -e

    # 1. Configure 1GB Swap file to prevent Out-Of-Memory issues on e2-nano / e2-micro
    if [ ! -f /swapfile ]; then
      fallocate -l 1G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1024
      chmod 600 /swapfile
      mkswap /swapfile
      swapon /swapfile
      echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi

    # 2. Update packages and install tools
    sudo apt-get update -y
    sudo apt-get install -y curl git build-essential

    # 3. Install Node.js 20 LTS
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # 4. Install PM2 process manager globally
    sudo npm install -g pm2

    echo "Initialization complete."
  EOF

  metadata = {
    ssh-keys = var.ssh_user != "" && var.ssh_pub_key != "" ? "${var.ssh_user}:${var.ssh_pub_key}" : null
  }
}
