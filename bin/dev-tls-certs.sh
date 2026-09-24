#!/bin/bash
# Local TLS material for the `tls` compose profile (WP-B4).
#
# Writes a throwaway CA and a server certificate to docker/config/tls/
# (gitignored), plus a pg_hba.conf that refuses plain-text connections, the
# way Aurora does with rds.force_ssl=1. The certificate names localhost and the
# compose service names only, not 127.0.0.1, so a verify-full connection to
# 127.0.0.1 fails its host-name check, which is how to see that the check runs.
#
#   bin/dev-tls-certs.sh            create if missing
#   bin/dev-tls-certs.sh --force    recreate
#
# Then:
#   docker compose -f docker/config/docker-compose.yaml --profile tls up -d \
#     reactory_postgres_tls reactory_mongodb_tls
#   REACTORY_POSTGRES_PORT=5433 REACTORY_POSTGRES_SSL=verify-full \
#     REACTORY_POSTGRES_CA_FILE=docker/config/tls/ca.pem ...
set -euo pipefail
cd "$(dirname "$0")/.."

DIR=docker/config/tls
if [ -f "$DIR/server.crt" ] && [ "${1:-}" != "--force" ]; then
  echo "TLS material already in $DIR (use --force to recreate)"
  exit 0
fi
mkdir -p "$DIR"

openssl req -x509 -newkey rsa:2048 -nodes -days 825 -subj "/CN=Reactory Local Dev CA" \
  -keyout "$DIR/ca.key" -out "$DIR/ca.pem" 2>/dev/null

openssl req -newkey rsa:2048 -nodes -subj "/CN=localhost" \
  -keyout "$DIR/server.key" -out "$DIR/server.csr" 2>/dev/null
printf 'subjectAltName=DNS:localhost,DNS:reactory_postgres_tls,DNS:reactory_mongodb_tls\nextendedKeyUsage=serverAuth\n' > "$DIR/server.ext"
openssl x509 -req -in "$DIR/server.csr" -CA "$DIR/ca.pem" -CAkey "$DIR/ca.key" -CAcreateserial \
  -days 825 -extfile "$DIR/server.ext" -out "$DIR/server.crt" 2>/dev/null

# mongod wants key and certificate in one file.
cat "$DIR/server.key" "$DIR/server.crt" > "$DIR/server.pem"

cat > "$DIR/pg_hba.conf" <<'EOF'
local     all  all                trust
hostssl   all  all  0.0.0.0/0     scram-sha-256
hostssl   all  all  ::/0          scram-sha-256
hostnossl all  all  0.0.0.0/0     reject
hostnossl all  all  ::/0          reject
EOF

rm -f "$DIR/server.csr" "$DIR/server.ext" "$DIR/ca.srl"
chmod 600 "$DIR"/*.key
# mongod reads this as its own user after the entrypoint drops root. Throwaway
# local material only.
chmod 644 "$DIR/server.pem"
echo "Wrote $DIR: ca.pem (trust this), server.crt/.key/.pem, pg_hba.conf"
