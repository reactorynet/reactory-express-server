#!/bin/bash
# Fetch and generate kubeconfig from Terraform outputs
set -e

CLUSTER_ENDPOINT=$(bin/terraform.sh output -raw cluster_endpoint --target=linode/small/cluster --reactory-env=linode 2>/dev/null | tail -n 1)
CLUSTER_CA=$(bin/terraform.sh output -raw cluster_ca_certificate --target=linode/small/cluster --reactory-env=linode 2>/dev/null | tail -n 1)
CLUSTER_TOKEN=$(bin/terraform.sh output -raw cluster_token --target=linode/small/cluster --reactory-env=linode 2>/dev/null | tail -n 1)

mkdir -p ~/.kube
cat <<EOF > ~/.kube/reactory-small.yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${CLUSTER_CA}
    server: ${CLUSTER_ENDPOINT}
  name: reactory-small
contexts:
- context:
    cluster: reactory-small
    user: reactory-small-admin
  name: reactory-small
current-context: reactory-small
kind: Config
preferences: {}
users:
- name: reactory-small-admin
  user:
    token: ${CLUSTER_TOKEN}
EOF

echo "✅ Generated ~/.kube/reactory-small.yaml successfully"
