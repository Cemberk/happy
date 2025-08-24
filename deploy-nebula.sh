#!/bin/bash

# Happy Nebula Deployment Script
# Deploys Happy with Nebula mesh networking for peer-to-peer operation

set -e

echo "🚀 Starting Happy Nebula deployment..."

# Configuration
NEBULA_DIR="$HOME/.happy-nebula"
NEBULA_CONFIG_DIR="$NEBULA_DIR/config"
NEBULA_CERTS_DIR="$NEBULA_DIR/certs"
NEBULA_BIN_DIR="$NEBULA_DIR/bin"
NEBULA_LOG_DIR="$NEBULA_DIR/logs"

# Network configuration
NEBULA_NETWORK="10.42.0.0/24"
LIGHTHOUSE_IP="10.42.0.1"
PORT=4242

# Create directory structure
echo "📁 Setting up Nebula directories..."
mkdir -p "$NEBULA_CONFIG_DIR" "$NEBULA_CERTS_DIR" "$NEBULA_BIN_DIR" "$NEBULA_LOG_DIR"

# Function to detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "darwin";;
        Linux*)     echo "linux";;
        CYGWIN*|MINGW32*|MSYS*|MINGW*) echo "windows";;
        *)          echo "unknown";;
    esac
}

# Function to detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64) echo "amd64";;
        aarch64|arm64) echo "arm64";;
        armv7l) echo "arm";;
        *) echo "unknown";;
    esac
}

# Download Nebula binary if not exists
download_nebula() {
    local os=$(detect_os)
    local arch=$(detect_arch)
    
    if [[ "$os" == "unknown" || "$arch" == "unknown" ]]; then
        echo "❌ Unsupported platform: $os/$arch"
        exit 1
    fi
    
    local nebula_bin="$NEBULA_BIN_DIR/nebula"
    local nebula_cert_bin="$NEBULA_BIN_DIR/nebula-cert"
    
    if [[ ! -f "$nebula_bin" ]]; then
        echo "📥 Downloading Nebula binaries for $os/$arch..."
        
        local version="v1.8.2"
        local archive_name="nebula-${os}-${arch}.tar.gz"
        local download_url="https://github.com/slackhq/nebula/releases/download/${version}/${archive_name}"
        
        cd "$NEBULA_BIN_DIR"
        curl -L -o "$archive_name" "$download_url"
        tar -xzf "$archive_name"
        rm "$archive_name"
        
        # Make binaries executable
        chmod +x nebula nebula-cert
        
        echo "✅ Nebula binaries downloaded successfully"
    else
        echo "✅ Nebula binaries already exist"
    fi
}

# Generate CA and lighthouse certificate
setup_lighthouse() {
    echo "🔐 Setting up lighthouse certificates..."
    
    local ca_key="$NEBULA_CERTS_DIR/ca.key"
    local ca_crt="$NEBULA_CERTS_DIR/ca.crt"
    local lighthouse_key="$NEBULA_CERTS_DIR/lighthouse.key"
    local lighthouse_crt="$NEBULA_CERTS_DIR/lighthouse.crt"
    
    # Generate CA if doesn't exist
    if [[ ! -f "$ca_crt" ]]; then
        echo "📋 Generating Certificate Authority..."
        "$NEBULA_BIN_DIR/nebula-cert" ca -name "Happy Network CA"
        mv ca.key ca.crt "$NEBULA_CERTS_DIR/"
    fi
    
    # Generate lighthouse certificate
    if [[ ! -f "$lighthouse_crt" ]]; then
        echo "🏠 Generating lighthouse certificate..."
        "$NEBULA_BIN_DIR/nebula-cert" sign -name "lighthouse" -ip "$LIGHTHOUSE_IP/24" -ca-crt "$ca_crt" -ca-key "$ca_key"
        mv lighthouse.key lighthouse.crt "$NEBULA_CERTS_DIR/"
    fi
    
    echo "✅ Lighthouse certificates ready"
}

# Create Nebula lighthouse configuration
create_lighthouse_config() {
    echo "⚙️  Creating lighthouse configuration..."
    
    cat > "$NEBULA_CONFIG_DIR/lighthouse.yml" << EOF
pki:
  ca: $NEBULA_CERTS_DIR/ca.crt
  cert: $NEBULA_CERTS_DIR/lighthouse.crt
  key: $NEBULA_CERTS_DIR/lighthouse.key

static_host_map:
  "$LIGHTHOUSE_IP": ["0.0.0.0:$PORT"]

lighthouse:
  am_lighthouse: true
  serve_dns: false

listen:
  host: 0.0.0.0
  port: $PORT

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
  timestamp_format: "2006-01-02T15:04:05Z07:00"

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
    # Allow SSH
    - port: 22
      proto: tcp
      host: any
    
    # Allow Happy Local Relay
    - port: 3001
      proto: tcp
      host: any
      
    # Allow HTTP/HTTPS for web interface
    - port: 80
      proto: tcp
      host: any
    - port: 443
      proto: tcp
      host: any
      
    # Allow custom Happy ports
    - port: 8080-8090
      proto: tcp
      host: any
EOF

    echo "✅ Lighthouse configuration created"
}

# Start Nebula lighthouse
start_lighthouse() {
    echo "🚀 Starting Nebula lighthouse..."
    
    local pid_file="$NEBULA_DIR/lighthouse.pid"
    
    # Check if already running
    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "✅ Lighthouse already running (PID: $(cat "$pid_file"))"
        return
    fi
    
    # Start lighthouse in background
    nohup "$NEBULA_BIN_DIR/nebula" -config "$NEBULA_CONFIG_DIR/lighthouse.yml" > "$NEBULA_LOG_DIR/lighthouse.log" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"
    
    # Wait a moment and check if it's running
    sleep 2
    if kill -0 $pid 2>/dev/null; then
        echo "✅ Lighthouse started successfully (PID: $pid)"
    else
        echo "❌ Failed to start lighthouse"
        cat "$NEBULA_LOG_DIR/lighthouse.log"
        exit 1
    fi
}

# Generate QR code for mobile devices
generate_qr_code() {
    echo "📱 Generating QR code for mobile device setup..."
    
    local ca_content=$(base64 -w 0 "$NEBULA_CERTS_DIR/ca.crt" 2>/dev/null || base64 "$NEBULA_CERTS_DIR/ca.crt")
    local external_ip=$(curl -s ifconfig.me || echo "YOUR_EXTERNAL_IP")
    
    # Get local IP
    local local_ip
    if command -v ip >/dev/null 2>&1; then
        local_ip=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+' | head -n1)
    elif command -v ifconfig >/dev/null 2>&1; then
        local_ip=$(ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -n1 | sed 's/addr://')
    else
        local_ip="YOUR_LOCAL_IP"
    fi
    
    cat > "$NEBULA_CONFIG_DIR/qr-data.json" << EOF
{
    "network_name": "Happy Network",
    "lighthouse_ip": "$LIGHTHOUSE_IP",
    "lighthouse_external": "$external_ip:$PORT",
    "lighthouse_local": "$local_ip:$PORT",
    "ca_cert": "$ca_content",
    "network_cidr": "$NEBULA_NETWORK"
}
EOF
    
    # Generate QR code string
    local qr_string=$(cat "$NEBULA_CONFIG_DIR/qr-data.json" | base64 -w 0 2>/dev/null || cat "$NEBULA_CONFIG_DIR/qr-data.json" | base64)
    echo "$qr_string" > "$NEBULA_CONFIG_DIR/qr-code.txt"
    
    echo "✅ QR code data saved to: $NEBULA_CONFIG_DIR/qr-code.txt"
    echo "📋 Share this data with mobile devices to join the network"
}

# Install Happy dependencies and build
setup_happy() {
    echo "📦 Setting up Happy application..."
    
    # Check if we're in the Happy directory
    if [[ ! -f "package.json" ]]; then
        echo "❌ Please run this script from the Happy project root directory"
        exit 1
    fi
    
    # Install dependencies
    if command -v yarn >/dev/null 2>&1; then
        echo "📥 Installing dependencies with yarn..."
        yarn install
    else
        echo "📥 Installing dependencies with npm..."
        npm install
    fi
    
    # Type check
    echo "🔍 Running type check..."
    if command -v yarn >/dev/null 2>&1; then
        yarn typecheck
    else
        npm run typecheck
    fi
    
    echo "✅ Happy application setup complete"
}

# Create systemd service (Linux only)
create_systemd_service() {
    if [[ "$(detect_os)" != "linux" ]]; then
        return
    fi
    
    echo "🔧 Creating systemd service..."
    
    sudo tee /etc/systemd/system/happy-nebula.service > /dev/null << EOF
[Unit]
Description=Happy Nebula Lighthouse
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$NEBULA_DIR
ExecStart=$NEBULA_BIN_DIR/nebula -config $NEBULA_CONFIG_DIR/lighthouse.yml
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable happy-nebula
    
    echo "✅ Systemd service created. Use 'sudo systemctl start happy-nebula' to start"
}

# Create macOS LaunchDaemon (macOS only)
create_macos_service() {
    if [[ "$(detect_os)" != "darwin" ]]; then
        return
    fi
    
    echo "🔧 Creating macOS LaunchDaemon..."
    
    local plist_path="$HOME/Library/LaunchAgents/com.happy.nebula.plist"
    
    cat > "$plist_path" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.happy.nebula</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NEBULA_BIN_DIR/nebula</string>
        <string>-config</string>
        <string>$NEBULA_CONFIG_DIR/lighthouse.yml</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$NEBULA_LOG_DIR/lighthouse.log</string>
    <key>StandardErrorPath</key>
    <string>$NEBULA_LOG_DIR/lighthouse.log</string>
    <key>WorkingDirectory</key>
    <string>$NEBULA_DIR</string>
</dict>
</plist>
EOF
    
    launchctl load "$plist_path"
    
    echo "✅ macOS service created and loaded"
}

# Main deployment sequence
main() {
    echo "🌟 Happy Nebula Deployment Starting..."
    echo "====================================="
    
    # Pre-flight checks
    if ! command -v curl >/dev/null 2>&1; then
        echo "❌ curl is required but not installed"
        exit 1
    fi
    
    if ! command -v tar >/dev/null 2>&1; then
        echo "❌ tar is required but not installed"
        exit 1
    fi
    
    # Execute deployment steps
    download_nebula
    setup_lighthouse
    create_lighthouse_config
    start_lighthouse
    generate_qr_code
    setup_happy
    
    # Platform-specific services
    create_systemd_service
    create_macos_service
    
    echo ""
    echo "🎉 Happy Nebula Deployment Complete!"
    echo "====================================="
    echo ""
    echo "📋 Next Steps:"
    echo "1. Share the QR code data with mobile devices:"
    echo "   File: $NEBULA_CONFIG_DIR/qr-code.txt"
    echo ""
    echo "2. Start the Happy application:"
    if command -v yarn >/dev/null 2>&1; then
        echo "   yarn start (for development)"
        echo "   yarn web (for web interface)"
    else
        echo "   npm start (for development)"
        echo "   npm run web (for web interface)"
    fi
    echo ""
    echo "3. Mobile devices can scan the QR code to join the network"
    echo ""
    echo "📊 Network Information:"
    echo "   Lighthouse IP: $LIGHTHOUSE_IP"
    echo "   Network: $NEBULA_NETWORK"
    echo "   Port: $PORT"
    echo ""
    echo "📁 Configuration Directory: $NEBULA_DIR"
    echo "📜 Logs Directory: $NEBULA_LOG_DIR"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs: tail -f $NEBULA_LOG_DIR/lighthouse.log"
    echo "   Stop lighthouse: kill \$(cat $NEBULA_DIR/lighthouse.pid)"
    echo "   Restart lighthouse: $0 --restart-lighthouse"
}

# Handle command line arguments
case "${1:-}" in
    --restart-lighthouse)
        echo "🔄 Restarting lighthouse..."
        if [[ -f "$NEBULA_DIR/lighthouse.pid" ]]; then
            kill "$(cat "$NEBULA_DIR/lighthouse.pid")" 2>/dev/null || true
            rm -f "$NEBULA_DIR/lighthouse.pid"
        fi
        start_lighthouse
        ;;
    --stop)
        echo "⏹️  Stopping lighthouse..."
        if [[ -f "$NEBULA_DIR/lighthouse.pid" ]]; then
            kill "$(cat "$NEBULA_DIR/lighthouse.pid")" 2>/dev/null || true
            rm -f "$NEBULA_DIR/lighthouse.pid"
            echo "✅ Lighthouse stopped"
        else
            echo "ℹ️  Lighthouse not running"
        fi
        ;;
    --status)
        echo "📊 Lighthouse Status:"
        if [[ -f "$NEBULA_DIR/lighthouse.pid" ]] && kill -0 "$(cat "$NEBULA_DIR/lighthouse.pid")" 2>/dev/null; then
            echo "✅ Running (PID: $(cat "$NEBULA_DIR/lighthouse.pid"))"
        else
            echo "❌ Not running"
        fi
        ;;
    *)
        main
        ;;
esac