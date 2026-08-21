variable "gcp_project_id" {
  description = "The GCP Project ID where resources will be created."
  type        = string
}

variable "gcp_region" {
  description = "GCP Region. Cheapest regions: us-central1 (Iowa), us-east1 (S. Carolina), us-west1 (Oregon)."
  type        = string
  default     = "us-central1"
}

variable "gcp_zone" {
  description = "GCP Zone within the chosen region."
  type        = string
  default     = "us-central1-a"
}

variable "instance_name" {
  description = "Name of the compute instance."
  type        = string
  default     = "cheapest-gcp-server"
}

variable "machine_type" {
  description = "Machine type. 'e2-micro' (1 GB RAM, smallest E2) or 'f1-micro' (0.6 GB RAM, 1st gen N1)."
  type        = string
  default     = "f1-micro"
}

variable "disk_size_gb" {
  description = "Boot disk size in GB (10 GB pd-standard disk is ~$0.40/month)."
  type        = number
  default     = 10
}

variable "os_image" {
  description = "OS Image (Debian 12 is lightweight and free)."
  type        = string
  default     = "debian-cloud/debian-12"
}

variable "use_spot_instance" {
  description = "Set to true for Spot VM (~60-80% discount). Set to false for standard continuous instance."
  type        = bool
  default     = false
}

variable "ssh_user" {
  description = "SSH username for remote access."
  type        = string
  default     = ""
}

variable "ssh_pub_key" {
  description = "Public SSH key string."
  type        = string
  default     = ""
}
