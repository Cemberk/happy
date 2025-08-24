#!/bin/bash

# Happy Cloud to Nebula Migration Script
# Migrates existing Happy cloud setup to peer-to-peer Nebula networking

set -e

echo "🔄 Happy Cloud to Nebula Migration"
echo "=================================="

# Configuration
BACKUP_DIR="$HOME/.happy-backup-$(date +%Y%m%d-%H%M%S)"
NEBULA_DIR="$HOME/.happy-nebula"
HAPPY_DATA_DIR="$HOME/.happy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
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

# Pre-migration checks
pre_migration_checks() {
    print_status "Running pre-migration checks..."
    
    # Check if Happy is installed
    if [[ ! -d "sources" || ! -f "package.json" ]]; then
        print_error "Please run this script from the Happy project root directory"
        exit 1
    fi
    
    # Check for cloud configuration
    if [[ ! -f "$HAPPY_DATA_DIR/credentials.json" && ! -f "sources/sync/serverConfig.ts" ]]; then
        print_warning "No existing Happy cloud configuration found"
    fi
    
    # Check if Nebula is already set up
    if [[ -d "$NEBULA_DIR" ]]; then
        print_warning "Nebula configuration already exists at $NEBULA_DIR"
        read -p "Continue with migration? (y/N): " continue_migration
        if [[ "$continue_migration" != "y" && "$continue_migration" != "Y" ]]; then
            print_error "Migration cancelled"
            exit 1
        fi
    fi
    
    print_success "Pre-migration checks completed"
}

# Backup existing configuration
backup_existing_config() {
    print_status "Creating backup of existing configuration..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup Happy data directory
    if [[ -d "$HAPPY_DATA_DIR" ]]; then
        cp -r "$HAPPY_DATA_DIR" "$BACKUP_DIR/happy-data"
        print_success "Backed up Happy data directory"
    fi
    
    # Backup configuration files
    if [[ -f "sources/sync/serverConfig.ts" ]]; then
        mkdir -p "$BACKUP_DIR/sources/sync"
        cp "sources/sync/serverConfig.ts" "$BACKUP_DIR/sources/sync/"
        print_success "Backed up server configuration"
    fi
    
    # Backup authentication files
    if [[ -f "sources/auth/AuthContext.tsx" ]]; then
        mkdir -p "$BACKUP_DIR/sources/auth"
        cp "sources/auth/AuthContext.tsx" "$BACKUP_DIR/sources/auth/"
        print_success "Backed up authentication configuration"
    fi
    
    # Create backup manifest
    cat > "$BACKUP_DIR/migration-info.txt" << EOF
Happy Cloud to Nebula Migration Backup
======================================
Date: $(date)
Happy Data Directory: $HAPPY_DATA_DIR
Nebula Directory: $NEBULA_DIR
Migration Script: $0

Files backed up:
- Happy data directory (if exists)
- Server configuration files
- Authentication configuration files

To restore cloud configuration:
1. Stop Nebula services
2. Copy backed up files back to original locations
3. Restart Happy application

To remove this backup:
rm -rf "$BACKUP_DIR"
EOF
    
    print_success "Backup created at: $BACKUP_DIR"
}

# Extract existing session data
extract_session_data() {
    print_status "Extracting existing session data..."
    
    local session_data_file="$BACKUP_DIR/sessions.json"
    
    # Try to extract sessions from various sources
    if [[ -f "$HAPPY_DATA_DIR/sessions.json" ]]; then
        cp "$HAPPY_DATA_DIR/sessions.json" "$session_data_file"
        print_success "Found and backed up session data"
    elif [[ -f "$HAPPY_DATA_DIR/persistence.json" ]]; then
        # Extract sessions from persistence data
        node -e "
        const fs = require('fs');
        const persistence = JSON.parse(fs.readFileSync('$HAPPY_DATA_DIR/persistence.json', 'utf8'));
        const sessions = persistence.sessions || {};
        fs.writeFileSync('$session_data_file', JSON.stringify(sessions, null, 2));
        " 2>/dev/null || print_warning "Could not extract session data from persistence file"
    else
        print_warning "No existing session data found"
    fi
}

# Migrate authentication credentials
migrate_auth_credentials() {
    print_status "Migrating authentication credentials..."
    
    local credentials_file="$HAPPY_DATA_DIR/credentials.json"
    local nebula_auth_file="$NEBULA_DIR/auth-migration.json"
    
    if [[ -f "$credentials_file" ]]; then
        # Extract cloud credentials for reference
        mkdir -p "$NEBULA_DIR"
        cp "$credentials_file" "$nebula_auth_file"
        
        # Create migration notes
        cat >> "$nebula_auth_file" << EOF

// Migration Notes:
// ===============
// These are your original cloud authentication credentials.
// After Nebula setup is complete, these will no longer be needed.
// The new Nebula authentication will use certificate-based auth.
// 
// To complete migration:
// 1. Set up Nebula lighthouse with deploy-nebula.sh
// 2. Generate device certificates with deploy-mobile.sh
// 3. Share QR codes with mobile devices
// 4. Test Nebula connectivity
// 5. Remove this file after successful migration
EOF
        
        print_success "Cloud credentials backed up for reference"
    else
        print_warning "No existing authentication credentials found"
    fi
}

# Set up Nebula environment
setup_nebula_environment() {
    print_status "Setting up Nebula environment..."
    
    # Check if deploy-nebula.sh exists
    if [[ ! -f "./deploy-nebula.sh" ]]; then
        print_error "deploy-nebula.sh not found. Please ensure you have the latest Happy version with Nebula support."
        exit 1
    fi
    
    # Make scripts executable
    chmod +x ./deploy-nebula.sh
    chmod +x ./deploy-mobile.sh
    
    print_success "Nebula deployment scripts ready"
    
    print_status "Run the following command to set up Nebula lighthouse:"
    echo "    ./deploy-nebula.sh"
    echo ""
    print_status "After lighthouse setup, configure mobile devices with:"
    echo "    ./deploy-mobile.sh"
}

# Update package configuration
update_package_config() {
    print_status "Updating package configuration for Nebula mode..."
    
    # Update package.json scripts if needed
    if [[ -f "package.json" ]] && command -v node >/dev/null 2>&1; then
        # Add Nebula-specific scripts
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        pkg.scripts = pkg.scripts || {};
        pkg.scripts['nebula:deploy'] = './deploy-nebula.sh';
        pkg.scripts['nebula:mobile'] = './deploy-mobile.sh';
        pkg.scripts['nebula:status'] = './deploy-nebula.sh --status';
        pkg.scripts['nebula:logs'] = 'tail -f ~/.happy-nebula/logs/lighthouse.log';
        
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        " 2>/dev/null && print_success "Updated package.json with Nebula scripts" || print_warning "Could not update package.json"
    fi
}

# Create migration verification script
create_verification_script() {
    print_status "Creating migration verification script..."
    
    cat > "./verify-nebula-migration.sh" << 'EOF'
#!/bin/bash

# Happy Nebula Migration Verification Script

echo "🔍 Verifying Happy Nebula Migration"
echo "==================================="

NEBULA_DIR="$HOME/.happy-nebula"
FAILED_CHECKS=0

check_passed() {
    echo "✅ $1"
}

check_failed() {
    echo "❌ $1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

# Check Nebula directories
if [[ -d "$NEBULA_DIR" ]]; then
    check_passed "Nebula directory exists"
else
    check_failed "Nebula directory not found"
fi

# Check Nebula certificates
if [[ -f "$NEBULA_DIR/certs/ca.crt" ]]; then
    check_passed "CA certificate exists"
else
    check_failed "CA certificate not found"
fi

if [[ -f "$NEBULA_DIR/certs/lighthouse.crt" ]]; then
    check_passed "Lighthouse certificate exists"
else
    check_failed "Lighthouse certificate not found"
fi

# Check Nebula configuration
if [[ -f "$NEBULA_DIR/config/lighthouse.yml" ]]; then
    check_passed "Lighthouse configuration exists"
else
    check_failed "Lighthouse configuration not found"
fi

# Check Nebula process
if [[ -f "$NEBULA_DIR/lighthouse.pid" ]] && kill -0 "$(cat "$NEBULA_DIR/lighthouse.pid")" 2>/dev/null; then
    check_passed "Nebula lighthouse is running"
else
    check_failed "Nebula lighthouse is not running"
fi

# Check Happy application
if [[ -f "package.json" ]]; then
    check_passed "Happy application found"
else
    check_failed "Happy application not found in current directory"
fi

# Check mobile device configurations
if [[ -d "$NEBULA_DIR/devices" ]] && [[ -n "$(ls -A "$NEBULA_DIR/devices" 2>/dev/null)" ]]; then
    local device_count=$(ls "$NEBULA_DIR/devices"/*.crt 2>/dev/null | wc -l)
    check_passed "Mobile devices configured: $device_count"
else
    echo "⚠️  No mobile devices configured yet"
fi

echo ""
echo "📊 Migration Status:"
if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo "✅ All checks passed! Nebula migration appears successful."
    echo ""
    echo "📋 Next Steps:"
    echo "1. Configure mobile devices: ./deploy-mobile.sh"
    echo "2. Test connectivity between devices"
    echo "3. Start using Happy in Nebula mode"
else
    echo "❌ $FAILED_CHECKS checks failed. Please review the setup."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Run: ./deploy-nebula.sh"
    echo "2. Check logs: tail -f $NEBULA_DIR/logs/lighthouse.log"
    echo "3. Verify network connectivity"
fi

echo ""
echo "📁 Configuration Directory: $NEBULA_DIR"
echo "📜 Lighthouse Logs: $NEBULA_DIR/logs/lighthouse.log"
EOF
    
    chmod +x "./verify-nebula-migration.sh"
    print_success "Created verification script: verify-nebula-migration.sh"
}

# Display migration summary
display_migration_summary() {
    echo ""
    echo "🎉 Happy Cloud to Nebula Migration Complete!"
    echo "============================================="
    echo ""
    print_success "Migration completed successfully"
    echo ""
    echo "📁 Backup Location: $BACKUP_DIR"
    echo "📁 Nebula Directory: $NEBULA_DIR"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Set up Nebula lighthouse:"
    echo "   ./deploy-nebula.sh"
    echo ""
    echo "2. Configure mobile devices:"
    echo "   ./deploy-mobile.sh"
    echo ""
    echo "3. Verify migration:"
    echo "   ./verify-nebula-migration.sh"
    echo ""
    echo "4. Test Happy application:"
    if command -v yarn >/dev/null 2>&1; then
        echo "   yarn start"
    else
        echo "   npm start"
    fi
    echo ""
    echo "🔧 Management Commands:"
    echo "   Status:     ./deploy-nebula.sh --status"
    echo "   Logs:       tail -f $NEBULA_DIR/logs/lighthouse.log"
    echo "   Stop:       ./deploy-nebula.sh --stop"
    echo ""
    echo "🆘 Rollback (if needed):"
    echo "1. Stop Nebula: ./deploy-nebula.sh --stop"
    echo "2. Restore backup files from: $BACKUP_DIR"
    echo "3. Restart Happy application"
    echo ""
    print_warning "Keep the backup until you've verified Nebula is working correctly!"
}

# Main migration function
main() {
    echo ""
    print_status "Starting migration from Happy Cloud to Nebula..."
    echo ""
    
    # Confirm migration
    print_warning "This will migrate Happy from cloud-based to peer-to-peer Nebula networking."
    print_warning "Your existing configuration will be backed up, but this is a significant change."
    echo ""
    read -p "Do you want to proceed with the migration? (y/N): " confirm_migration
    
    if [[ "$confirm_migration" != "y" && "$confirm_migration" != "Y" ]]; then
        print_error "Migration cancelled by user"
        exit 0
    fi
    
    echo ""
    
    # Execute migration steps
    pre_migration_checks
    backup_existing_config
    extract_session_data
    migrate_auth_credentials
    setup_nebula_environment
    update_package_config
    create_verification_script
    display_migration_summary
    
    echo ""
    print_success "Migration preparation completed successfully! 🎉"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Happy Cloud to Nebula Migration Script"
        echo "====================================="
        echo ""
        echo "This script helps migrate from Happy's cloud-based architecture"
        echo "to the new peer-to-peer Nebula mesh networking system."
        echo ""
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --verify, -v        Run verification checks"
        echo "  --status, -s        Show migration status"
        echo ""
        echo "The script will:"
        echo "1. Backup existing configuration"
        echo "2. Extract session data"
        echo "3. Set up Nebula environment"
        echo "4. Create deployment scripts"
        echo "5. Provide next steps guidance"
        ;;
    --verify|-v)
        if [[ -f "./verify-nebula-migration.sh" ]]; then
            ./verify-nebula-migration.sh
        else
            print_error "Verification script not found. Run migration first."
            exit 1
        fi
        ;;
    --status|-s)
        echo "📊 Happy Nebula Migration Status"
        echo "==============================="
        echo ""
        if [[ -d "$NEBULA_DIR" ]]; then
            print_success "Nebula directory exists: $NEBULA_DIR"
        else
            print_warning "Nebula directory not found"
        fi
        
        if [[ -d "$BACKUP_DIR"* ]]; then
            echo "📁 Available backups:"
            ls -la "$HOME"/.happy-backup-* 2>/dev/null || echo "   No backups found"
        fi
        ;;
    *)
        main
        ;;
esac