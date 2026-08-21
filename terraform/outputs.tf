output "instance_ip" {
  description = "The public IP address of the GCP server."
  value       = google_compute_instance.cheapest_server.network_interface[0].access_config[0].nat_ip
}

output "instance_name" {
  description = "The name of the deployed VM instance."
  value       = google_compute_instance.cheapest_server.name
}

output "ssh_command" {
  description = "GCloud CLI SSH command to connect to the instance."
  value       = "gcloud compute ssh ${google_compute_instance.cheapest_server.name} --zone=${var.gcp_zone} --project=${var.gcp_project_id}"
}
