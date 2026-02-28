output "backend_url" {
  description = "URL of the deployed backend service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "URL of the deployed frontend service"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "artifact_registry" {
  description = "Artifact Registry repository path"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}
