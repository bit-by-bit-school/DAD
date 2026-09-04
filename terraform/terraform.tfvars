# Replace with your actual GCP Project ID (e.g. "my-gcp-project-123456")
gcp_project_id = "gen-lang-client-0103323510"

# Region & Zone
gcp_region     = "us-central1"
gcp_zone       = "us-central1-a"

instance_name  = "hackerrank-prod-server"

# Machine type options:
# "e2-micro" (1 GB RAM) - Recommended for Go backend
# "f1-micro" (0.6 GB RAM) - Smallest legacy VM
machine_type   = "f1-micro"

# Set to true for Spot VM (~$2/mo), or false for standard VM (~$7/mo)
use_spot_instance = false
