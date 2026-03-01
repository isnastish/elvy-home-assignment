terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ──────────────────────────────────────────────
# Artifact Registry (for Docker images)
# ──────────────────────────────────────────────

resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "smhi-weather-app"
  format        = "DOCKER"
  description   = "Docker images for SMHI Weather App"
}

# ──────────────────────────────────────────────
# Backend — Cloud Run
# ──────────────────────────────────────────────

resource "google_cloud_run_v2_service" "backend" {
  name     = "smhi-weather-backend"
  location = var.region

  depends_on = [google_cloud_run_v2_service.frontend]

  template {
    containers {
      image = var.backend_image

      ports {
        container_port = 8080
      }

      env {
        name  = "SMHI_CACHE_TTL_HOURS"
        value = "6"
      }

      env {
        name  = "CORS__ORIGINS"
        value = jsonencode(length(var.cors_origins) > 0 ? var.cors_origins : [google_cloud_run_v2_service.frontend.uri])
      }

      dynamic "env" {
        for_each = var.backend_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ──────────────────────────────────────────────
# Frontend — Cloud Run
# ──────────────────────────────────────────────

resource "google_cloud_run_v2_service" "frontend" {
  name     = "smhi-weather-frontend"
  location = var.region

  template {
    containers {
      image = var.frontend_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ──────────────────────────────────────────────
# IAM — Make both services publicly accessible
# ──────────────────────────────────────────────

resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  name     = google_cloud_run_v2_service.frontend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
