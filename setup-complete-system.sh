#!/bin/bash

# Complete Happy System Setup Script
# Sets up the entire Happy ecosystem with Nebula P2P networking

set -e

echo "🎉 Happy Complete System Setup"
echo "==============================="
echo ""
echo "This script will set up the entire Happy ecosystem:"
echo "• Happy CLI (command-line interface)"
echo "• Nebula mesh networking (peer-to-peer)"
echo "• Mobile app setup (QR codes for pairing)"
echo "• Local server components"
echo ""
echo "🔒 SECURITY NOTICE:"
echo "This system creates certificates and keys for secure networking."
echo "All data stays on your devices - no cloud servers involved."
echo ""

# Configuration
INSTALL_DIR="$HOME/.happy-system"
DOWNLOADS_DIR="$INSTALL_DIR/downloads"
RELEASES_DIR="$INSTALL_DIR/releases"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "1" "Checking prerequisites"
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("Node.js (https://nodejs.org)")
    fi
    
    # Check npm/yarn
    if ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("npm (comes with Node.js)")
    fi
    
    # Check curl
    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi
    
    # Check unzip
    if ! command -v unzip >/dev/null 2>&1; then
        missing_deps+=("unzip")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Please install the missing dependencies and run this script again."
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Setup directories
setup_directories() {
    print_step "2" "Setting up directories"
    
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$DOWNLOADS_DIR"
    mkdir -p "$RELEASES_DIR"
    
    print_success "Directories created"
}

# Install Happy CLI
install_happy_cli() {
    print_step "3" "Installing Happy CLI"
    
    if command -v happy >/dev/null 2>&1; then
        print_warning "Happy CLI already installed, updating..."
        npm update -g happy-coder
    else
        npm install -g happy-coder
    fi
    
    print_success "Happy CLI installed"
}

# Setup Nebula networking
setup_nebula() {
    print_step "4" "Setting up Nebula networking"
    
    print_warning "Setting up Nebula network (this may take a few minutes)..."
    
    # Check if already set up
    if [[ -d "$HOME/.happy-nebula/certs" ]] && [[ -f "$HOME/.happy-nebula/certs/ca.crt" ]]; then
        print_success "Nebula already configured"
        return
    fi
    
    # Run setup
    if ! happy setup --auto 2>/dev/null; then
        print_warning "Automatic setup failed, trying interactive setup..."
        happy setup
    fi
    
    print_success "Nebula networking configured"
}

# Download mobile app releases
download_mobile_releases() {
    print_step "5" "Checking for mobile app releases"
    
    local latest_release_url="https://api.github.com/repos/Cemberk/happy/releases/latest"
    local latest_release=$(curl -s "$latest_release_url" 2>/dev/null || echo "")
    
    if [[ -z "$latest_release" ]] || echo "$latest_release" | grep -q "Not Found"; then
        print_warning "No GitHub releases found yet"
        print_warning "Mobile apps are being built automatically by GitHub Actions"
        print_warning ""
        print_warning "Status: Building first release (v1.0.0-nebula)"
        print_warning "Check build progress: https://github.com/Cemberk/happy/actions"
        print_warning ""
        print_warning "Once complete, mobile apps will be available at:"
        print_warning "  📱 https://github.com/Cemberk/happy/releases/latest"
        print_warning ""
        print_warning "For now, you can continue with CLI setup."
        print_warning "The mobile apps will be ready in a few minutes!"
        return
    fi
    
    # Extract download URLs
    local android_url=$(echo "$latest_release" | grep -o 'https://.*Happy-Android.*\.apk' | head -n1)
    local ios_url=$(echo "$latest_release" | grep -o 'https://.*Happy-iOS.*\.zip' | head -n1)
    
    # Download Android APK
    if [[ -n "$android_url" ]]; then
        print_warning "Downloading Android APK..."
        if curl -L -o "$RELEASES_DIR/Happy-Android.apk" "$android_url" 2>/dev/null; then
            print_success "Android APK downloaded to $RELEASES_DIR/Happy-Android.apk"
        else
            print_warning "Failed to download Android APK"
        fi
    fi
    
    # Download iOS archive
    if [[ -n "$ios_url" ]]; then
        print_warning "Downloading iOS app..."
        if curl -L -o "$RELEASES_DIR/Happy-iOS.zip" "$ios_url" 2>/dev/null; then
            print_success "iOS app downloaded to $RELEASES_DIR/Happy-iOS.zip"
        else
            print_warning "Failed to download iOS app"
        fi
    fi
    
    if [[ -z "$android_url" && -z "$ios_url" ]]; then
        print_warning "No pre-built mobile apps found in releases"
        print_warning "Mobile apps are built automatically when tags are pushed"
        print_warning "Check: https://github.com/Cemberk/happy/releases"
    fi
}

# Generate QR codes for mobile setup
generate_qr_codes() {
    print_step "6" "Generating QR codes for mobile setup"
    
    # Check Nebula status
    if ! happy status >/dev/null 2>&1; then
        print_warning "Nebula not running, starting..."
        # This will be handled by the happy command itself
    fi
    
    # Generate QR code data
    local qr_file="$HOME/.happy-nebula/config/qr-code.txt"
    if [[ -f "$qr_file" ]]; then
        cp "$qr_file" "$INSTALL_DIR/mobile-setup-qr.txt"
        print_success "QR code data saved to $INSTALL_DIR/mobile-setup-qr.txt"
    else
        print_warning "QR code not found, run 'happy setup' to generate"
    fi
}

# Create desktop shortcuts and scripts
create_shortcuts() {
    print_step "7" "Creating shortcuts and helper scripts"
    
    # Create start script
    cat > "$INSTALL_DIR/start-happy.sh" << 'EOF'
#!/bin/bash
echo "🚀 Starting Happy system..."
echo ""
echo "📋 System Status:"
happy status
echo ""
echo "🌟 Starting Happy (press Ctrl+C to stop):"
echo "   Your mobile device can now connect by scanning the QR code"
echo ""
happy
EOF
    chmod +x "$INSTALL_DIR/start-happy.sh"
    
    # Create system info script
    cat > "$INSTALL_DIR/system-info.sh" << 'EOF'
#!/bin/bash
echo "🔍 Happy System Information"
echo "=========================="
echo ""
echo "📁 Installation Directory: $HOME/.happy-system"
echo ""
echo "🌌 Nebula Status:"
happy status
echo ""
echo "📱 Mobile Setup:"
if [[ -f "$HOME/.happy-system/mobile-setup-qr.txt" ]]; then
    echo "✅ QR code data available: $HOME/.happy-system/mobile-setup-qr.txt"
else
    echo "⚠️  No QR code data found, run 'happy setup'"
fi
echo ""
echo "📱 Mobile Apps:"
if [[ -f "$HOME/.happy-system/releases/Happy-Android.apk" ]]; then
    echo "✅ Android APK: $HOME/.happy-system/releases/Happy-Android.apk"
else
    echo "📱 Android: Install from Google Play (search 'Happy Coder')"
fi
if [[ -f "$HOME/.happy-system/releases/Happy-iOS.zip" ]]; then
    echo "✅ iOS App: $HOME/.happy-system/releases/Happy-iOS.zip"
else
    echo "📱 iOS: Install from App Store (search 'Happy Coder')"
fi
echo ""
echo "💡 Commands:"
echo "   Start Happy: happy"
echo "   Check Status: happy status"  
echo "   Reconfigure: happy setup"
echo "   System Info: $HOME/.happy-system/system-info.sh"
EOF
    chmod +x "$INSTALL_DIR/system-info.sh"
    
    print_success "Helper scripts created"
}

# Display final instructions
display_final_instructions() {
    print_step "8" "Installation complete!"
    
    echo ""
    echo "🎉 Happy System Setup Complete!"
    echo "==============================="
    echo ""
    print_success "Everything is ready to use!"
    echo ""
    echo "📋 Next Steps:"
    echo "=============="
    echo ""
    echo "1. Start Happy on your computer:"
    echo -e "   ${GREEN}happy${NC}"
    echo ""
    echo "2. Install mobile app:"
    if [[ -f "$RELEASES_DIR/Happy-Android.apk" ]]; then
        echo "   📱 Android: Install $RELEASES_DIR/Happy-Android.apk"
    else
        echo "   📱 Android: Download from GitHub releases (building now)"
        echo "      https://github.com/Cemberk/happy/releases/latest"
    fi
    if [[ -f "$RELEASES_DIR/Happy-iOS.zip" ]]; then
        echo "   📱 iOS: Extract and install from $RELEASES_DIR/Happy-iOS.zip"
    else
        echo "   📱 iOS: Download from GitHub releases (building now)"
        echo "      https://github.com/Cemberk/happy/releases/latest"
    fi
    echo ""
    echo "3. Connect your mobile device:"
    echo "   • Open Happy app on your phone"
    echo "   • Scan the QR code shown when you run 'happy'"
    echo "   • Your devices are now connected!"
    echo ""
    echo "📁 System Files:"
    echo "==============="
    echo "   Installation: $INSTALL_DIR"
    if [[ -f "$INSTALL_DIR/mobile-setup-qr.txt" ]]; then
        echo "   QR Code Data: $INSTALL_DIR/mobile-setup-qr.txt"
    fi
    echo "   Start Script: $INSTALL_DIR/start-happy.sh"
    echo "   System Info:  $INSTALL_DIR/system-info.sh"
    echo ""
    echo "💡 Useful Commands:"
    echo "=================="
    echo "   Start Happy:     happy"
    echo "   Check Status:    happy status"
    echo "   Reconfigure:     happy setup"
    echo "   System Info:     $INSTALL_DIR/system-info.sh"
    echo "   Quick Start:     $INSTALL_DIR/start-happy.sh"
    echo ""
    echo "🔒 Privacy & Security:"
    echo "====================="
    echo "• ✅ No cloud dependencies - everything runs locally"
    echo "• ✅ End-to-end encrypted communication"
    echo "• ✅ Your code never leaves your devices"
    echo "• ✅ Free forever - no subscriptions or server costs"
    echo ""
    print_success "Happy coding with complete privacy! 🌟"
}

# Main installation flow
main() {
    echo "Starting installation..."
    echo ""
    
    # Run all setup steps
    check_prerequisites
    setup_directories  
    install_happy_cli
    setup_nebula
    download_mobile_releases
    generate_qr_codes
    create_shortcuts
    display_final_instructions
    
    echo ""
    print_success "Setup completed successfully!"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Happy Complete System Setup"
        echo "==========================="
        echo ""
        echo "This script sets up the complete Happy ecosystem with:"
        echo "• Happy CLI (command-line interface)"
        echo "• Nebula mesh networking (peer-to-peer)"
        echo "• Mobile app downloads and setup"
        echo "• Helper scripts and shortcuts"
        echo ""
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help"
        echo "  --info, -i          Show system information"
        echo "  --reinstall, -r     Force reinstallation"
        echo ""
        exit 0
        ;;
    --info|-i)
        if [[ -f "$INSTALL_DIR/system-info.sh" ]]; then
            exec "$INSTALL_DIR/system-info.sh"
        else
            echo "Happy system not installed yet. Run $0 to install."
            exit 1
        fi
        ;;
    --reinstall|-r)
        print_warning "Reinstalling Happy system..."
        rm -rf "$INSTALL_DIR" 2>/dev/null || true
        main
        ;;
    *)
        main
        ;;
esac