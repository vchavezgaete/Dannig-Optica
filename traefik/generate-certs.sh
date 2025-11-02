#!/bin/bash

# Script to generate self-signed certificates for local development
# These certificates allow HTTPS to work locally without a real domain

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/certs"
DOMAINS=(
  "Dannig-Optica.freeddns.org"
  "app.Dannig-Optica.freeddns.org"
  "api.Dannig-Optica.freeddns.org"
  "db.Dannig-Optica.freeddns.org"
  "dashboard.Dannig-Optica.freeddns.org"
  "traefik.Dannig-Optica.freeddns.org"
)

echo "🔐 Generating self-signed certificates..."
echo "   Domain: Dannig-Optica.freeddns.org"
echo "   Note: For production, use Let's Encrypt (configured by default)"
echo ""

# Create certs directory if it doesn't exist
mkdir -p "$CERTS_DIR"

# Generate private key
if [ ! -f "$CERTS_DIR/dannig.key" ]; then
  echo "📝 Generating private key..."
  openssl genrsa -out "$CERTS_DIR/dannig.key" 2048
fi

# Create certificate signing request config
CSR_CONFIG="$CERTS_DIR/cert.conf"
cat > "$CSR_CONFIG" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=ES
ST=Madrid
L=Madrid
O=DannigOptica
OU=Development
CN=Dannig-Optica.freeddns.org

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
EOF

# Add all domains to SAN
for i in "${!DOMAINS[@]}"; do
  echo "DNS.$((i+1)) = ${DOMAINS[$i]}" >> "$CSR_CONFIG"
done

# Generate certificate signing request
if [ ! -f "$CERTS_DIR/dannig.csr" ]; then
  echo "📝 Generating certificate signing request..."
  openssl req -new -key "$CERTS_DIR/dannig.key" -out "$CERTS_DIR/dannig.csr" -config "$CSR_CONFIG"
fi

# Generate self-signed certificate (valid for 365 days)
if [ ! -f "$CERTS_DIR/dannig.crt" ]; then
  echo "📝 Generating self-signed certificate..."
  openssl x509 -req -in "$CERTS_DIR/dannig.csr" -signkey "$CERTS_DIR/dannig.key" \
    -out "$CERTS_DIR/dannig.crt" -days 365 -extensions v3_req -extfile "$CSR_CONFIG"
fi

# Create Let's Encrypt directory structure (needed by Traefik)
mkdir -p "$SCRIPT_DIR/letsencrypt"
touch "$SCRIPT_DIR/letsencrypt/acme.json"
chmod 600 "$SCRIPT_DIR/letsencrypt/acme.json"

# For Traefik to use self-signed certs, we need to configure it differently
# We'll use file provider instead of ACME for self-signed certs

echo ""
echo "✅ Certificates generated successfully!"
echo ""
echo "📋 Certificates location:"
echo "   - Private Key: $CERTS_DIR/dannig.key"
echo "   - Certificate: $CERTS_DIR/dannig.crt"
echo ""
echo "⚠️  These are self-signed certificates for development only."
echo "   Your browser will show a security warning. Click 'Advanced' and 'Proceed anyway'."
echo ""
echo "📝 To use these certificates, update traefik.yml to use file provider:"
echo "   certificatesFiles:"
echo "     - certFile: /certs/dannig.crt"
echo "       keyFile: /certs/dannig.key"

