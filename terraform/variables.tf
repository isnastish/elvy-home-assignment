variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for deployment"
  type        = string
  default     = "europe-north1"
}

variable "backend_image" {
  description = "Docker image for the backend service"
  type        = string
}

variable "frontend_image" {
  description = "Docker image for the frontend service"
  type        = string
}

variable "backend_env_vars" {
  description = "Environment variables for the backend service"
  type        = map(string)
  default     = {}
}

variable "cors_origins" {
  description = "CORS origins for the backend service. If not set, will use the frontend service URL."
  type        = list(string)
  default     = []
}
