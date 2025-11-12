#!/bin/bash

# Development Certificate Authority (CA) Script
# Generates self-signed CA and client certificates for mTLS between API and Wings
# WARNING: This is for DEVELOPMENT ONLY. Use proper PKI infrastructure in production.

set -e

# Configuration
CA_DIR="./certs/ca"
NODES_DIR="./certs/nodes"
CA_KEY="$CA_DIR/ca-key.pem"
CA_CERT="$CA_DIR/ca-cert.pem"
CA_VALIDITY_DAYS=3650  # 10 years
CERT_VALIDITY_DAYS=365  # 1 year

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Mamba Host Panel - Development CA${NC}"
echo ""

# Create directories
mkdir -p "$CA_DIR"
mkdir -p "$NODES_DIR"

# Function to generate CA
generate_ca() {
    if [ -f "$CA_CERT" ]; then
        echo -e "${YELLOW}⚠️  CA certificate already exists at $CA_CERT${NC}"
        read -p "Regenerate CA? This will invalidate all existing client certificates. (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Skipping CA generation."
            return
        fi
        echo -e "${YELLOW}Removing existing CA...${NC}"
        rm -f "$CA_KEY" "$CA_CERT"
    fi

    echo -e "${GREEN}📜 Generating CA certificate...${NC}"

    # Generate CA private key
    openssl genrsa -out "$CA_KEY" 4096

    # Generate CA certificate
    openssl req -new -x509 \
        -days "$CA_VALIDITY_DAYS" \
        -key "$CA_KEY" \
        -out "$CA_CERT" \
        -subj "/C=US/ST=Development/L=Dev/O=Mamba Host Panel/OU=Development CA/CN=Mamba Dev CA"

    echo -e "${GREEN}✅ CA certificate generated at $CA_CERT${NC}"
    echo ""
}

# Function to generate node client certificate
generate_node_cert() {
    local NODE_ID=$1
    local NODE_FQDN=${2:-"node-${NODE_ID}.local"}

    local NODE_KEY="$NODES_DIR/${NODE_ID}-key.pem"
    local NODE_CSR="$NODES_DIR/${NODE_ID}-csr.pem"
    local NODE_CERT="$NODES_DIR/${NODE_ID}-cert.pem"
    local NODE_BUNDLE="$NODES_DIR/${NODE_ID}-bundle.pem"

    if [ -f "$NODE_CERT" ]; then
        echo -e "${YELLOW}⚠️  Certificate for node $NODE_ID already exists${NC}"
        read -p "Regenerate? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    echo -e "${GREEN}🔑 Generating certificate for node: $NODE_ID ($NODE_FQDN)${NC}"

    # Generate node private key
    openssl genrsa -out "$NODE_KEY" 2048

    # Generate certificate signing request (CSR)
    # CN is set to the node ID for extraction in the API
    openssl req -new \
        -key "$NODE_KEY" \
        -out "$NODE_CSR" \
        -subj "/C=US/ST=Development/L=Dev/O=Mamba Host Panel/OU=Wings Node/CN=${NODE_ID}"

    # Create SAN config for the certificate
    cat > "$NODES_DIR/${NODE_ID}-san.cnf" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${NODE_FQDN}
DNS.2 = localhost
DNS.3 = ${NODE_ID}
IP.1 = 127.0.0.1
EOF

    # Sign the certificate with CA
    openssl x509 -req \
        -in "$NODE_CSR" \
        -CA "$CA_CERT" \
        -CAkey "$CA_KEY" \
        -CAcreateserial \
        -out "$NODE_CERT" \
        -days "$CERT_VALIDITY_DAYS" \
        -extensions v3_req \
        -extfile "$NODES_DIR/${NODE_ID}-san.cnf"

    # Create bundle (cert + CA)
    cat "$NODE_CERT" "$CA_CERT" > "$NODE_BUNDLE"

    # Calculate certificate fingerprint (SHA256)
    FINGERPRINT=$(openssl x509 -in "$NODE_CERT" -noout -fingerprint -sha256 | cut -d'=' -f2)

    # Clean up
    rm -f "$NODE_CSR" "$NODES_DIR/${NODE_ID}-san.cnf"

    echo -e "${GREEN}✅ Certificate generated for node $NODE_ID${NC}"
    echo -e "   Key:         $NODE_KEY"
    echo -e "   Certificate: $NODE_CERT"
    echo -e "   Bundle:      $NODE_BUNDLE"
    echo -e "   Fingerprint: $FINGERPRINT"
    echo ""

    # Save fingerprint for database
    echo "$FINGERPRINT" > "$NODES_DIR/${NODE_ID}-fingerprint.txt"
}

# Function to verify certificate
verify_cert() {
    local NODE_ID=$1
    local NODE_CERT="$NODES_DIR/${NODE_ID}-cert.pem"

    if [ ! -f "$NODE_CERT" ]; then
        echo -e "${RED}❌ Certificate for node $NODE_ID not found${NC}"
        return 1
    fi

    echo -e "${GREEN}🔍 Verifying certificate for node: $NODE_ID${NC}"

    # Verify against CA
    openssl verify -CAfile "$CA_CERT" "$NODE_CERT"

    # Show certificate details
    echo ""
    echo "Certificate Details:"
    openssl x509 -in "$NODE_CERT" -noout -text | grep -A2 "Subject:\|Issuer:\|Not Before\|Not After\|Subject Alternative Name"
    echo ""
}

# Function to list all certificates
list_certs() {
    echo -e "${GREEN}📋 Existing Certificates:${NC}"
    echo ""

    if [ -f "$CA_CERT" ]; then
        echo "CA Certificate:"
        openssl x509 -in "$CA_CERT" -noout -subject -dates
        echo ""
    else
        echo -e "${YELLOW}No CA certificate found${NC}"
        echo ""
    fi

    if [ -d "$NODES_DIR" ] && [ "$(ls -A $NODES_DIR/*-cert.pem 2>/dev/null)" ]; then
        echo "Node Certificates:"
        for cert in "$NODES_DIR"/*-cert.pem; do
            if [ -f "$cert" ]; then
                NODE_ID=$(basename "$cert" -cert.pem)
                echo "  - $NODE_ID:"
                openssl x509 -in "$cert" -noout -subject -dates | sed 's/^/    /'
            fi
        done
        echo ""
    else
        echo -e "${YELLOW}No node certificates found${NC}"
        echo ""
    fi
}

# Function to generate environment variables for Wings
generate_env_vars() {
    local NODE_ID=$1
    local NODE_KEY="$NODES_DIR/${NODE_ID}-key.pem"
    local NODE_CERT="$NODES_DIR/${NODE_ID}-cert.pem"

    if [ ! -f "$NODE_KEY" ] || [ ! -f "$NODE_CERT" ]; then
        echo -e "${RED}❌ Certificate for node $NODE_ID not found${NC}"
        return 1
    fi

    echo -e "${GREEN}📝 Environment variables for node $NODE_ID:${NC}"
    echo ""
    echo "# Add to apps/wings/.env.local or docker-compose.yml"
    echo "WINGS_TLS_CERT_FILE=$(realpath $NODE_CERT)"
    echo "WINGS_TLS_KEY_FILE=$(realpath $NODE_KEY)"
    echo "WINGS_API_CA_CERT=$(realpath $CA_CERT)"
    echo "WINGS_NODE_ID=$NODE_ID"
    echo ""
}

# Main menu
case "${1:-}" in
    init)
        generate_ca
        ;;
    generate)
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Usage: $0 generate <node-id> [fqdn]${NC}"
            exit 1
        fi
        generate_node_cert "$2" "$3"
        ;;
    verify)
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Usage: $0 verify <node-id>${NC}"
            exit 1
        fi
        verify_cert "$2"
        ;;
    list)
        list_certs
        ;;
    env)
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Usage: $0 env <node-id>${NC}"
            exit 1
        fi
        generate_env_vars "$2"
        ;;
    *)
        echo "Mamba Host Panel - Development CA Script"
        echo ""
        echo "Usage:"
        echo "  $0 init                          Generate CA certificate"
        echo "  $0 generate <node-id> [fqdn]     Generate client certificate for a node"
        echo "  $0 verify <node-id>              Verify a node certificate"
        echo "  $0 list                          List all certificates"
        echo "  $0 env <node-id>                 Show environment variables for node"
        echo ""
        echo "Example:"
        echo "  $0 init"
        echo "  $0 generate us-east-1-node-01 node1.example.com"
        echo "  $0 verify us-east-1-node-01"
        echo "  $0 env us-east-1-node-01"
        echo ""
        ;;
esac
