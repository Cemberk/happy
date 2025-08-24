# Happy Nebula Setup and Deployment Guide

Complete guide for deploying Happy with Nebula peer-to-peer networking, eliminating all cloud dependencies.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Quick Start](#quick-start)
4. [Desktop Setup (Lighthouse)](#desktop-setup-lighthouse)
5. [Mobile Device Setup](#mobile-device-setup)
6. [Docker Deployment](#docker-deployment)
7. [Migration from Cloud](#migration-from-cloud)
8. [Network Architecture](#network-architecture)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Configuration](#advanced-configuration)

## Overview

Happy has been redesigned to use Slack's Nebula mesh VPN for peer-to-peer networking, completely eliminating cloud dependencies. This setup provides:

- **Zero Cloud Dependencies**: All data stays on your devices
- **Better Performance**: Direct peer connections with lower latency
- **Enhanced Privacy**: No third-party servers can access your data
- **Network Isolation**: Only authorized devices can join your network
- **End-to-End Security**: Double encryption (Nebula + Happy's E2EE)

## Requirements

### System Requirements
- **Desktop/Lighthouse**: macOS, Linux, or Windows with admin rights
- **Mobile**: iOS 14+ or Android 8+ with network permissions
- **Network**: Internet access for initial setup (can work offline after setup)
- **Ports**: UDP 4242 (configurable) for Nebula communication

### Software Dependencies
- **Node.js 18+** and **Yarn** (for Happy application)
- **curl** and **tar** (for Nebula binary download)
- **Docker** and **Docker Compose** (optional, for containerized deployment)

## Quick Start

### 1. Desktop Setup (5 minutes)
```bash
# Clone Happy repository
git clone https://github.com/anthropics/happy.git
cd happy

# Deploy Nebula lighthouse
./deploy-nebula.sh

# Start Happy application
yarn install
yarn start
```

### 2. Mobile Setup (2 minutes)
```bash
# Generate mobile device certificate
./deploy-mobile.sh

# Share the generated QR code with your mobile device
# Mobile app will scan QR code and automatically join network
```

### 3. Verification
```bash
# Verify migration completed successfully
./verify-nebula-migration.sh
```

That's it! Your devices are now connected via secure peer-to-peer networking.

## Desktop Setup (Lighthouse)

The desktop computer acts as the Certificate Authority and network lighthouse.

### Automatic Setup
```bash
# Run the deployment script
./deploy-nebula.sh

# This will:
# 1. Download Nebula binaries for your platform
# 2. Generate CA and lighthouse certificates
# 3. Create network configuration
# 4. Start Nebula lighthouse service
# 5. Generate QR codes for mobile devices
```

### Manual Setup

#### 1. Download Nebula
```bash
# Create directories
mkdir -p ~/.happy-nebula/{config,certs,bin,logs}

# Download Nebula binaries (replace OS/ARCH as needed)
cd ~/.happy-nebula/bin
curl -L -o nebula.tar.gz https://github.com/slackhq/nebula/releases/download/v1.8.2/nebula-linux-amd64.tar.gz
tar -xzf nebula.tar.gz
chmod +x nebula nebula-cert
```

#### 2. Generate Certificates
```bash
cd ~/.happy-nebula/certs

# Generate Certificate Authority
../bin/nebula-cert ca -name "Happy Network CA"

# Generate lighthouse certificate  
../bin/nebula-cert sign -name "lighthouse" -ip "10.42.0.1/24" -ca-crt ca.crt -ca-key ca.key
```

#### 3. Create Configuration
Create `~/.happy-nebula/config/lighthouse.yml`:
```yaml
pki:
  ca: /home/user/.happy-nebula/certs/ca.crt
  cert: /home/user/.happy-nebula/certs/lighthouse.crt
  key: /home/user/.happy-nebula/certs/lighthouse.key

static_host_map:
  "10.42.0.1": ["0.0.0.0:4242"]

lighthouse:
  am_lighthouse: true
  serve_dns: false

listen:
  host: 0.0.0.0
  port: 4242

punchy:
  punch: true
  respond: true

cipher: aes
tun:
  disabled: false
  dev: nebula1
  mtu: 1300

firewall:
  outbound:
    - port: any
      proto: any
      host: any
  inbound:
    - port: 22
      proto: tcp
      host: any
    - port: 3001
      proto: tcp
      host: any
```

#### 4. Start Lighthouse
```bash
# Start Nebula lighthouse
nohup ~/.happy-nebula/bin/nebula -config ~/.happy-nebula/config/lighthouse.yml > ~/.happy-nebula/logs/lighthouse.log 2>&1 &
echo $! > ~/.happy-nebula/lighthouse.pid
```

### Service Management

#### macOS (LaunchDaemon)
The deployment script creates a LaunchDaemon that starts automatically:
```bash
# Manual control
launchctl load ~/Library/LaunchAgents/com.happy.nebula.plist
launchctl unload ~/Library/LaunchAgents/com.happy.nebula.plist
```

#### Linux (systemd)
The deployment script creates a systemd service:
```bash
# Manual control
sudo systemctl start happy-nebula
sudo systemctl stop happy-nebula
sudo systemctl status happy-nebula

# Enable auto-start
sudo systemctl enable happy-nebula
```

## Mobile Device Setup

Each mobile device needs its own certificate to join the network.

### Interactive Setup
```bash
# Run interactive device setup
./deploy-mobile.sh

# Follow prompts:
# 1. Enter device name (e.g., "iphone", "android")
# 2. Choose IP address (e.g., "10.42.0.2")
# 3. QR code data will be generated
```

### Bulk Setup
```bash
# Generate 5 devices with base name "mobile"
./deploy-mobile.sh --bulk 5 mobile

# Generates: mobile1, mobile2, mobile3, mobile4, mobile5
# With IPs: 10.42.0.2, 10.42.0.3, 10.42.0.4, 10.42.0.5, 10.42.0.6
```

### Manual Device Setup
```bash
# Generate specific device
./deploy-mobile.sh --generate "my-phone" "10.42.0.10"

# List available IP addresses
./deploy-mobile.sh --list

# View generated QR codes
./deploy-mobile.sh --qr
```

### Mobile App Integration

The Happy mobile app includes built-in Nebula support:

1. **QR Code Scanning**: Open Happy app and scan the QR code
2. **Automatic Setup**: App configures Nebula VPN automatically
3. **Network Join**: Device joins mesh network seamlessly
4. **Status Verification**: App shows network status and connected peers

#### QR Code Content
Each QR code contains:
```json
{
  "device_name": "iphone",
  "device_ip": "10.42.0.2", 
  "lighthouse_ip": "10.42.0.1",
  "lighthouse_external": "203.0.113.1:4242",
  "lighthouse_local": "192.168.1.100:4242",
  "network_cidr": "10.42.0.0/24",
  "ca_cert": "base64-encoded-ca-certificate",
  "device_cert": "base64-encoded-device-certificate", 
  "device_key": "base64-encoded-private-key"
}
```

## Docker Deployment

For production deployments or easier management, use Docker Compose.

### Setup
```bash
# Create required directories
mkdir -p nebula-config nebula-certs nebula-logs happy-config happy-logs

# Copy certificates to Docker directories
cp ~/.happy-nebula/certs/* nebula-certs/
cp ~/.happy-nebula/config/lighthouse.yml nebula-config/

# Start services
docker-compose -f docker-compose.nebula.yml up -d
```

### Services Included
- **nebula-lighthouse**: Nebula mesh VPN lighthouse
- **happy-local-relay**: Local relay server replacing cloud functionality
- **happy-web**: Web interface for Happy (optional)
- **watchtower**: Automatic container updates (optional)

### Management Commands
```bash
# View status
docker-compose -f docker-compose.nebula.yml ps

# View logs
docker-compose -f docker-compose.nebula.yml logs -f nebula-lighthouse

# Restart services
docker-compose -f docker-compose.nebula.yml restart

# Stop all services
docker-compose -f docker-compose.nebula.yml down
```

## Migration from Cloud

If you have an existing Happy cloud setup, use the migration script:

```bash
# Run migration script
./migrate-to-nebula.sh

# This will:
# 1. Backup existing cloud configuration
# 2. Extract session data for preservation
# 3. Set up Nebula environment
# 4. Create deployment scripts
# 5. Provide step-by-step migration guide
```

### Migration Steps
1. **Backup**: Existing configuration backed up to `~/.happy-backup-TIMESTAMP/`
2. **Nebula Setup**: Run `./deploy-nebula.sh` to set up lighthouse
3. **Device Setup**: Use `./deploy-mobile.sh` to configure mobile devices
4. **Verification**: Run `./verify-nebula-migration.sh` to confirm success
5. **Testing**: Test all Happy functionality in Nebula mode

### Rollback (if needed)
```bash
# Stop Nebula services
./deploy-nebula.sh --stop

# Restore backup files
cp -r ~/.happy-backup-TIMESTAMP/happy-data ~/.happy-data
cp ~/.happy-backup-TIMESTAMP/sources/sync/serverConfig.ts sources/sync/

# Restart Happy in cloud mode
```

## Network Architecture

### Topology
```
Desktop (10.42.0.1)     Mobile 1 (10.42.0.2)
      |                        |
      |                        |
   Lighthouse  <-----------> Nebula Node
      |                        |
      |                        |
   Happy App               Happy App
```

### Network Details
- **CIDR**: `10.42.0.0/24` (254 possible devices)
- **Lighthouse**: `10.42.0.1` (desktop/primary device)
- **Devices**: `10.42.0.2` - `10.42.0.254` (mobile/secondary devices)
- **Port**: `4242/udp` (configurable)
- **Protocol**: UDP with NAT traversal and hole punching

### Security Layers
1. **Network Encryption**: Nebula's X25519 + AES-256-GCM
2. **Certificate Authentication**: Only devices with valid certs can join
3. **Application Encryption**: Happy's existing end-to-end encryption
4. **Firewall Rules**: Configurable per-device access controls

## Troubleshooting

### Connection Issues

#### Desktop/Lighthouse Not Starting
```bash
# Check logs
tail -f ~/.happy-nebula/logs/lighthouse.log

# Common issues:
# - Port 4242 already in use
# - Certificate permissions
# - Network interface conflicts
```

#### Mobile Device Can't Connect
```bash
# Verify lighthouse is running
./deploy-nebula.sh --status

# Check device certificate
ls -la ~/.happy-nebula/devices/

# Regenerate device certificate
./deploy-mobile.sh --generate "device-name" "10.42.0.X"
```

#### Network Connectivity
```bash
# Test from mobile device (once connected)
ping 10.42.0.1  # Ping lighthouse

# Test from desktop
ping 10.42.0.2  # Ping mobile device
```

### Performance Issues

#### High Latency
- Check if direct peer connections are established
- Verify NAT traversal is working
- Consider adjusting MTU size (default: 1300)

#### Connection Drops
- Check network stability
- Verify UDP port 4242 isn't blocked
- Review firewall rules

### Certificate Issues

#### Certificate Expired
```bash
# Regenerate CA (will require new device certs)
cd ~/.happy-nebula/certs
../bin/nebula-cert ca -name "Happy Network CA"

# Regenerate all device certificates
./deploy-mobile.sh --bulk 5 device
```

#### Invalid Certificate
```bash
# Verify certificate
~/.happy-nebula/bin/nebula-cert print -path ~/.happy-nebula/certs/lighthouse.crt

# Check certificate permissions
chmod 600 ~/.happy-nebula/certs/*.key
chmod 644 ~/.happy-nebula/certs/*.crt
```

### Happy Application Issues

#### App Won't Start in Nebula Mode
```bash
# Verify Nebula integration files exist
ls sources/nebula/

# Check TypeScript compilation
yarn typecheck

# Test in development mode
yarn start
```

#### Socket Connection Failures
- Verify LocalRelay is running (port 3001)
- Check NebulaSocket configuration
- Review network firewall rules

## Advanced Configuration

### Custom Network Range
Edit `deploy-nebula.sh` and change:
```bash
NEBULA_NETWORK="10.100.0.0/24"  # Custom network
LIGHTHOUSE_IP="10.100.0.1"     # Custom lighthouse IP
```

### Multiple Networks
Create separate configurations for different networks:
```bash
# Work network
NEBULA_DIR="$HOME/.happy-work" ./deploy-nebula.sh

# Personal network  
NEBULA_DIR="$HOME/.happy-personal" ./deploy-nebula.sh
```

### Performance Tuning

#### Lighthouse Configuration
```yaml
# In lighthouse.yml
punchy:
  punch: true
  respond: true
  delay: 1s        # Faster hole punching
  
tun:
  tx_queue: 1000   # Larger TX queue
  mtu: 1500        # Larger MTU if network supports
```

#### Firewall Optimization
```yaml
firewall:
  # Allow Happy-specific ports
  inbound:
    - port: 3001-3010
      proto: tcp
      host: any
    - port: 8080-8090  
      proto: tcp
      host: any
    - port: 9000-9100
      proto: udp
      host: any
```

### Monitoring and Logging

#### Log Levels
```yaml
logging:
  level: debug     # For troubleshooting
  format: json     # Machine readable
  timestamp_format: "2006-01-02T15:04:05Z07:00"
```

#### Metrics Collection
```bash
# Monitor connections
watch -n 5 'netstat -an | grep 4242'

# Monitor Nebula interface
watch -n 5 'ip addr show nebula1'

# Monitor network traffic
sudo iftop -i nebula1
```

## Support and Resources

### Documentation
- [Nebula Documentation](https://github.com/slackhq/nebula)
- [Happy GitHub Repository](https://github.com/anthropics/happy)

### Getting Help
- Review logs: `tail -f ~/.happy-nebula/logs/lighthouse.log`
- Run verification: `./verify-nebula-migration.sh`
- Check network status: `./deploy-nebula.sh --status`

### Contributing
To contribute to Happy's Nebula integration:
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request with detailed description

---

🎉 **Congratulations!** You now have Happy running with secure peer-to-peer Nebula networking, completely free from cloud dependencies while maintaining all functionality and gaining better performance and privacy.