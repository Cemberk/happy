#!/bin/bash

# Happy Mobile Nebula Deployment Script
# Generates device certificates for joining the Nebula network

set -e

echo "📱 Happy Mobile Device Setup"
echo "============================"

# Configuration
NEBULA_DIR="$HOME/.happy-nebula"
NEBULA_CONFIG_DIR="$NEBULA_DIR/config"
NEBULA_CERTS_DIR="$NEBULA_DIR/certs"
NEBULA_BIN_DIR="$NEBULA_DIR/bin"
DEVICE_CERTS_DIR="$NEBULA_DIR/devices"

# Create devices directory
mkdir -p "$DEVICE_CERTS_DIR"

# Function to generate device certificate
generate_device_cert() {
    local device_name="$1"
    local device_ip="$2"
    
    if [[ -z "$device_name" || -z "$device_ip" ]]; then
        echo "❌ Usage: generate_device_cert <device_name> <device_ip>"
        echo "   Example: generate_device_cert \"iphone\" \"10.42.0.10\""
        return 1
    fi
    
    echo "🔐 Generating certificate for device: $device_name"
    
    local ca_key="$NEBULA_CERTS_DIR/ca.key"
    local ca_crt="$NEBULA_CERTS_DIR/ca.crt"
    
    if [[ ! -f "$ca_crt" || ! -f "$ca_key" ]]; then
        echo "❌ CA certificates not found. Please run deploy-nebula.sh first."
        exit 1
    fi
    
    local device_key="$DEVICE_CERTS_DIR/${device_name}.key"
    local device_crt="$DEVICE_CERTS_DIR/${device_name}.crt"
    
    # Generate device certificate
    "$NEBULA_BIN_DIR/nebula-cert" sign -name "$device_name" -ip "$device_ip/24" -ca-crt "$ca_crt" -ca-key "$ca_key"
    mv "${device_name}.key" "$device_key"
    mv "${device_name}.crt" "$device_crt"
    
    echo "✅ Device certificate generated: $device_name"
    
    # Create device config
    create_device_config "$device_name" "$device_ip"
    
    # Generate QR code for device
    generate_device_qr "$device_name" "$device_ip"
}

# Create device-specific configuration
create_device_config() {
    local device_name="$1"
    local device_ip="$2"
    
    echo "⚙️  Creating configuration for $device_name..."
    
    # Get lighthouse external IP
    local external_ip=$(curl -s ifconfig.me || echo "YOUR_EXTERNAL_IP")
    local local_ip
    if command -v ip >/dev/null 2>&1; then
        local_ip=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+' | head -n1)
    elif command -v ifconfig >/dev/null 2>&1; then
        local_ip=$(ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -n1 | sed 's/addr://')
    else
        local_ip="YOUR_LOCAL_IP"
    fi
    
    cat > "$DEVICE_CERTS_DIR/${device_name}.yml" << EOF
pki:
  ca: $NEBULA_CERTS_DIR/ca.crt
  cert: $DEVICE_CERTS_DIR/${device_name}.crt
  key: $DEVICE_CERTS_DIR/${device_name}.key

static_host_map:
  "10.42.0.1": ["$external_ip:4242", "$local_ip:4242"]

lighthouse:
  am_lighthouse: false
  interval: 60
  hosts:
    - "10.42.0.1"

listen:
  host: 0.0.0.0
  port: 0

punchy:
  punch: true
  respond: true

cipher: aes

local_range: "172.16.0.0/12"

tun:
  disabled: false
  dev: nebula1
  drop_local_broadcast: false
  drop_multicast: false
  tx_queue: 500
  mtu: 1300

logging:
  level: info
  format: text
  disable_timestamp: false

firewall:
  conntrack:
    tcp_timeout: 12m
    udp_timeout: 3m
    default_timeout: 10m
  
  outbound:
    # Allow all outbound traffic
    - port: any
      proto: any
      host: any

  inbound:
    # Allow Happy communication
    - port: 3001
      proto: tcp
      host: any
    
    # Allow peer-to-peer communication
    - port: 8080-8090
      proto: tcp
      host: any
      
    # Allow voice communication
    - port: 9000-9100
      proto: udp
      host: any
EOF
    
    echo "✅ Configuration created for $device_name"
}

# Generate QR code data for device
generate_device_qr() {
    local device_name="$1"
    local device_ip="$2"
    
    echo "📱 Generating QR code for $device_name..."
    
    # Read certificates
    local ca_cert=$(base64 -w 0 "$NEBULA_CERTS_DIR/ca.crt" 2>/dev/null || base64 "$NEBULA_CERTS_DIR/ca.crt")
    local device_cert=$(base64 -w 0 "$DEVICE_CERTS_DIR/${device_name}.crt" 2>/dev/null || base64 "$DEVICE_CERTS_DIR/${device_name}.crt")
    local device_key=$(base64 -w 0 "$DEVICE_CERTS_DIR/${device_name}.key" 2>/dev/null || base64 "$DEVICE_CERTS_DIR/${device_name}.key")
    
    # Get network info
    local external_ip=$(curl -s ifconfig.me || echo "YOUR_EXTERNAL_IP")
    local local_ip
    if command -v ip >/dev/null 2>&1; then
        local_ip=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+' | head -n1)
    elif command -v ifconfig >/dev/null 2>&1; then
        local_ip=$(ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -n1 | sed 's/addr://')
    else
        local_ip="YOUR_LOCAL_IP"
    fi
    
    # Create QR data
    cat > "$DEVICE_CERTS_DIR/${device_name}-qr.json" << EOF
{
    "device_name": "$device_name",
    "device_ip": "$device_ip",
    "lighthouse_ip": "10.42.0.1",
    "lighthouse_external": "$external_ip:4242",
    "lighthouse_local": "$local_ip:4242",
    "network_cidr": "10.42.0.0/24",
    "ca_cert": "$ca_cert",
    "device_cert": "$device_cert",
    "device_key": "$device_key"
}
EOF
    
    # Generate QR code string
    local qr_string=$(cat "$DEVICE_CERTS_DIR/${device_name}-qr.json" | base64 -w 0 2>/dev/null || cat "$DEVICE_CERTS_DIR/${device_name}-qr.json" | base64)
    echo "$qr_string" > "$DEVICE_CERTS_DIR/${device_name}-qr.txt"
    
    echo "✅ QR code data saved: $DEVICE_CERTS_DIR/${device_name}-qr.txt"
}

# List available IP addresses
list_available_ips() {
    echo "📋 Available IP addresses in network 10.42.0.0/24:"
    echo "   10.42.0.1  - Reserved for Lighthouse"
    echo "   10.42.0.2  - Available"
    echo "   10.42.0.3  - Available"
    echo "   10.42.0.4  - Available"
    echo "   10.42.0.5  - Available"
    echo "   ..."
    echo "   10.42.0.254 - Available"
    echo ""
    
    if [[ -d "$DEVICE_CERTS_DIR" ]]; then
        echo "📱 Already configured devices:"
        for config in "$DEVICE_CERTS_DIR"/*.yml; do
            if [[ -f "$config" ]]; then
                local device_name=$(basename "$config" .yml)
                local device_ip=$(grep -A1 "static_host_map:" "$config" | grep -oE '10\.42\.0\.[0-9]+' | head -n1)
                echo "   $device_name - $device_ip"
            fi
        done
    fi
}

# Interactive device setup
interactive_setup() {
    echo "🔧 Interactive Device Setup"
    echo "=========================="
    
    list_available_ips
    echo ""
    
    read -p "Enter device name (e.g., 'iphone', 'android'): " device_name
    read -p "Enter device IP (e.g., '10.42.0.2'): " device_ip
    
    # Validate IP format
    if ! [[ "$device_ip" =~ ^10\.42\.0\.([2-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-4])$ ]]; then
        echo "❌ Invalid IP address. Must be in range 10.42.0.2 - 10.42.0.254"
        exit 1
    fi
    
    # Check if device already exists
    if [[ -f "$DEVICE_CERTS_DIR/${device_name}.crt" ]]; then
        read -p "Device '$device_name' already exists. Overwrite? (y/N): " overwrite
        if [[ "$overwrite" != "y" && "$overwrite" != "Y" ]]; then
            echo "❌ Cancelled"
            exit 1
        fi
    fi
    
    generate_device_cert "$device_name" "$device_ip"
    
    echo ""
    echo "🎉 Device setup complete!"
    echo "========================="
    echo ""
    echo "📱 QR Code Data for $device_name:"
    echo "File: $DEVICE_CERTS_DIR/${device_name}-qr.txt"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Share the QR code data with the mobile device"
    echo "2. The Happy mobile app will scan this QR code"
    echo "3. The device will automatically join the Nebula network"
    echo ""
    echo "🔧 Configuration Files Created:"
    echo "   Certificate: $DEVICE_CERTS_DIR/${device_name}.crt"
    echo "   Private Key: $DEVICE_CERTS_DIR/${device_name}.key"
    echo "   Config File: $DEVICE_CERTS_DIR/${device_name}.yml"
    echo "   QR Data: $DEVICE_CERTS_DIR/${device_name}-qr.txt"
}

# Bulk device generation
bulk_generate() {
    local count=${1:-5}
    local base_name=${2:-"device"}
    
    echo "🏭 Bulk generating $count devices..."
    
    for i in $(seq 1 "$count"); do
        local device_name="${base_name}${i}"
        local device_ip="10.42.0.$((i + 1))"
        
        echo "Creating: $device_name -> $device_ip"
        generate_device_cert "$device_name" "$device_ip"
    done
    
    echo "✅ Bulk generation complete"
}

# Show device QR codes
show_qr_codes() {
    echo "📱 Available Device QR Codes:"
    echo "============================"
    
    if [[ ! -d "$DEVICE_CERTS_DIR" ]]; then
        echo "❌ No devices found. Run with --interactive to create devices."
        exit 1
    fi
    
    for qr_file in "$DEVICE_CERTS_DIR"/*-qr.txt; do
        if [[ -f "$qr_file" ]]; then
            local device_name=$(basename "$qr_file" -qr.txt)
            echo ""
            echo "📱 Device: $device_name"
            echo "File: $qr_file"
            echo "Data:"
            head -c 100 "$qr_file"
            echo "..."
        fi
    done
}

# Main function
main() {
    # Check if lighthouse is set up
    if [[ ! -d "$NEBULA_CERTS_DIR" || ! -f "$NEBULA_CERTS_DIR/ca.crt" ]]; then
        echo "❌ Nebula lighthouse not found. Please run deploy-nebula.sh first."
        exit 1
    fi
    
    case "${1:---interactive}" in
        --interactive|-i)
            interactive_setup
            ;;
        --generate|-g)
            if [[ -z "$2" || -z "$3" ]]; then
                echo "❌ Usage: $0 --generate <device_name> <device_ip>"
                echo "   Example: $0 --generate \"iphone\" \"10.42.0.2\""
                exit 1
            fi
            generate_device_cert "$2" "$3"
            ;;
        --bulk|-b)
            bulk_generate "$2" "$3"
            ;;
        --list|-l)
            list_available_ips
            ;;
        --qr|-q)
            show_qr_codes
            ;;
        --help|-h)
            echo "Happy Mobile Nebula Device Setup"
            echo "==============================="
            echo ""
            echo "Usage: $0 [OPTION]"
            echo ""
            echo "Options:"
            echo "  --interactive, -i    Interactive device setup (default)"
            echo "  --generate, -g       Generate specific device: -g <name> <ip>"
            echo "  --bulk, -b          Bulk generate: -b [count] [base_name]"
            echo "  --list, -l          List available IP addresses"
            echo "  --qr, -q            Show all device QR codes"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Interactive setup"
            echo "  $0 -g iphone 10.42.0.2     # Generate iPhone cert"
            echo "  $0 -b 5 mobile              # Generate mobile1-5"
            echo "  $0 -l                       # List available IPs"
            echo "  $0 -q                       # Show QR codes"
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

main "$@"