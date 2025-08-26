# Happy Ecosystem - Privacy-First Installation Guide

## 🔒 Complete Data Sovereignty Implementation

This guide documents the installation and usage of the Happy ecosystem with **complete data sovereignty** and **zero external dependencies** (except user-chosen AI APIs).

## 🏗️ Actual System Architecture

The Happy ecosystem is a **tightly coupled, single-installation system** consisting of:

1. **Server** - Local backend service (must be running) 
2. **CLI** - Claude Code wrapper (requires server connection)
3. **App** - Mobile/web interface (connects to same server)

**These are NOT independent components** - they are designed to work together as a unified privacy-first system.

## 🎯 How The System Actually Works

### Integrated Session Flow
1. **`happy` command** starts an interactive Claude Code session
2. **Server** manages the session and real-time state
3. **Mobile/Web App** connects to monitor and interact with the same session
4. **All components** share the same data and authentication (Nebula network)

### Tightly Coupled Dependencies
- **CLI requires server** - Cannot work without server running
- **Server manages authentication** - Single `nebula-user` for all components
- **App connects to server** - Shows sessions from CLI in real-time
- **Shared session state** - All components see the same Claude conversations

## Prerequisites

### Required Software
- Node.js 20+
- PostgreSQL 
- Redis (for pub/sub and caching)
- Claude Code CLI (`claude` command available globally)
- Nebula VPN binaries (download from [official releases](https://github.com/slackhq/nebula/releases))

### Required Environment
- All components must be on same local network
- Server must be accessible at `localhost:3005`
- No external internet access required (except for Claude API)

## 🚀 Single System Installation

### Step 1: Clone All Three Repositories

```bash
# Create a directory for the Happy ecosystem
mkdir happy-ecosystem && cd happy-ecosystem

# Clone all three repositories
git clone https://github.com/Cemberk/happy.git
git clone https://github.com/Cemberk/happy-server.git
git clone https://github.com/Cemberk/happy-cli.git
```

### Step 2: Install Dependencies

```bash
# Install server dependencies
cd happy-server
yarn install
cd ..

# Install CLI dependencies and link globally
cd happy-cli
yarn install
yarn build
npm link
cd ..

# Install app dependencies
cd happy
yarn install
cd ..
```

### Step 3: Database Setup

```bash
# Create database
createdb happy

# Run migrations from happy-server directory
cd happy-server
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/happy?schema=public" yarn migrate

# Create system user (required for privacy mode)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/happy?schema=public" node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function createNebulaUser() {
  try {
    const user = await db.account.create({
      data: {
        id: 'nebula-user',
        publicKey: '00000000000000000000000000000000',
        seq: 0,
        settingsVersion: 1
      }
    });
    console.log('System user created:', user.id);
  } finally {
    await db.\$disconnect();
  }
}
createNebulaUser();
"
```

### Step 4: Start the System

```bash
# Option A: Let CLI auto-start the server
# Just run happy from any directory and server will start automatically
happy

# Option B: Manually start server (for development)
cd happy-server
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/happy?schema=public" \
REDIS_URL="redis://localhost:6380" \
HANDY_MASTER_SECRET="development-secret-key-please-change-in-production" \
yarn start

# Start Happy app (in separate terminal)
cd happy
yarn web        # For web version at http://localhost:8081
# OR
yarn ios        # For iPhone
yarn android    # For Android
```

## 🏃 Daily Usage Pattern

### Simple Usage (With Auto-Start)
```bash
# The CLI automatically starts the server if needed
# Just run from any project directory:
cd ~/my-project
happy

# Or with a prompt:
echo "help me understand this code" | happy
```

### Manual Server Start (For Development)
```bash
# If developing the server locally:
cd happy-server
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/happy?schema=public" \
REDIS_URL="redis://localhost:6380" \
HANDY_MASTER_SECRET="development-secret-key-please-change-in-production" \
yarn start
# Keep this running in background
```

### Monitor Sessions
- Open Happy app on phone or web
- See your CLI sessions appear in real-time
- Respond to Claude's questions from mobile
- View file changes and code updates
- **All sessions are shared between CLI and app**

## 🔧 System Integration

### Authentication (Nebula Network)
- **Single user system**: All components authenticate as `nebula-user`
- **Automatic detection**: CLI detects localhost as Nebula network
- **Token sharing**: All components use `nebula-network-token`
- **No external auth**: Everything happens locally

### Session Synchronization
- **CLI creates session** → **Server stores it** → **App displays it**
- **Real-time updates** via WebSocket connections
- **Shared state** across all interfaces
- **Mobile can respond** to CLI prompts

### Data Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ CLI Session │───→│   Server    │───→│ Mobile App  │
│   (happy)   │    │ (required)  │    │ (monitor)   │
│             │    │             │    │             │
│ Interactive │◄───┤ WebSockets  │◄───┤ Real-time   │
│ Claude Code │    │ Database    │    │ Updates     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## ✅ Verify Installation

### 1. Test Server
```bash
curl http://localhost:3005/health
# Should return OK
```

### 2. Test CLI
```bash
cd /tmp
echo "console.log('test')" > test.js
happy --version
# Should work without errors
```

### 3. Test Integration
```bash
# In project directory
echo "analyze this file" | happy
# Check mobile app - should see new session appear
```

## 🚫 Common Issues and Solutions

### "Error: Request failed with status code 500"
```bash
# Problem: CLI trying to connect when server isn't ready
# Solution: Server should auto-start, but check if PostgreSQL/Redis are running

# Problem: Database conflicts
# Solution: Clear CLI cache
rm -rf ~/.happy-dev

# Problem: Machine ID conflicts
# Solution: Restart server after clearing cache
```

### "Input must be provided either through stdin or as a prompt argument"
```bash
# This is normal - Claude needs input
# Solution: Provide input via stdin or arguments
echo "your prompt" | happy
# OR run happy in interactive mode (without arguments)
```

### App Not Showing Sessions
```bash
# Problem: WebSocket connection issues
# Solution: Check server is accessible
curl http://localhost:3005/health

# Solution: Verify environment variables
echo $EXPO_PUBLIC_HAPPY_SERVER_URL
# Should be: http://localhost:3005
```

## 🛠️ Development vs Production

### Current Development Setup
1. **Server**: Manual start with environment variables
2. **CLI**: Global install via `npm link` 
3. **App**: Development server via `yarn web`
4. **All tightly coupled** through shared server

### Production Deployment (Future)
1. **Server**: System service (systemd/launchd)
2. **CLI**: Published npm package
3. **App**: Mobile app store distribution
4. **Single installer** that sets up entire system

## 🔒 Privacy Architecture

### Complete Data Sovereignty
- **No external services**: Everything runs locally
- **Nebula mesh networking**: P2P encrypted communication
- **Local database**: All sessions stored in PostgreSQL
- **No cloud dependencies**: Works offline except for Claude API

### Security Features
- **Local-only authentication**: No external login required
- **Encrypted storage**: All data encrypted at rest
- **Network isolation**: Only connects to chosen AI provider
- **Privacy by design**: No telemetry or tracking

## 📋 System Requirements

### For All Components
```bash
# Required running processes
postgresql      # Database for sessions
redis-server    # Real-time communication  

# Required environment variables (add to ~/.bashrc)
export HAPPY_HOME_DIR=~/.happy-dev
export HAPPY_SERVER_URL=http://localhost:3005
```

### Startup Sequence
1. **Ensure PostgreSQL and Redis are running** (system services)
2. **Run happy CLI** from any project (server auto-starts)
3. **Open Happy app** to monitor sessions

## 🔄 Complete Reset

If you need to start fresh:

```bash
# Stop all processes
pkill -f happy
pkill -f node

# Clear all data
rm -rf ~/.happy-dev
dropdb happy
createdb happy

# Reinstall from your ecosystem directory
cd happy-ecosystem
cd happy-server && yarn install && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/happy?schema=public" yarn migrate && cd ..
cd happy-cli && yarn install && yarn build && npm link && cd ..
cd happy && yarn install && cd ..

# Start fresh with the CLI
happy
```

This is a **unified system** where CLI, server, and mobile app work together to provide privacy-first AI development with complete data sovereignty.

---

# 🚀 Quick Start Guide

## Prerequisites Check
Before starting, ensure you have:
- Node.js 20+ installed
- PostgreSQL running locally
- Redis running locally  
- Claude Code CLI installed globally (`claude --version` should work)
- Nebula VPN binaries (optional, for mesh networking)

## Optional: Nebula VPN Setup
If you want to use Nebula mesh networking for enhanced privacy:

```bash
# 1. Download Nebula binaries for your platform
# Visit: https://github.com/slackhq/nebula/releases
# Download nebula and nebula-cert for your OS (Linux/macOS/Windows)

# 2. Create nebula directory in happy app
cd happy
mkdir -p nebula/bin
cd nebula/bin

# 3. Copy downloaded binaries here and make executable (Linux/macOS)
chmod +x nebula nebula-cert

# 4. Generate certificates (first time only)
./nebula-cert ca -name "Happy Network"
./nebula-cert sign -name "lighthouse" -ip "10.42.0.1/24"
./nebula-cert sign -name "client" -ip "10.42.0.2/24"

# 5. Create config.yml for your node
# See Nebula documentation for configuration details
```

**Note**: Nebula is optional. The Happy ecosystem works perfectly over standard localhost connections.

## 1. Clone and Install (One Time)
```bash
# Create ecosystem directory
mkdir happy-ecosystem && cd happy-ecosystem

# Clone all repositories
git clone https://github.com/Cemberk/happy.git
git clone https://github.com/Cemberk/happy-server.git
git clone https://github.com/Cemberk/happy-cli.git

# Install all dependencies
cd happy-server && yarn install && cd ..
cd happy-cli && yarn install && yarn build && npm link && cd ..
cd happy && yarn install && cd ..

# Setup database
createdb happy
cd happy-server
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/happy?schema=public" yarn migrate
cd ..

# Set environment variables (add to ~/.bashrc)
export HAPPY_HOME_DIR=~/.happy-dev
export HAPPY_SERVER_URL=http://localhost:3005
```

## 2. Start Happy App (Optional)
```bash
# For web monitoring
cd happy
yarn web
# Open http://localhost:8081 in your browser
```

## 3. Use Happy CLI from Any Project
```bash
# Navigate to any project directory
cd ~/my-project

# Start interactive Claude Code session (server auto-starts)
happy

# Or with a prompt
echo "explain this code" | happy
```

## ✅ Verification Steps

### Test Bidirectional Communication
1. **CLI → App**: Type messages in the CLI terminal - they should appear in the web app instantly
2. **App → CLI**: Type messages in the web app - they should appear in the CLI terminal instantly  
3. **Session Titles**: Claude can set session titles using commands like "change the title to 'My Project Session'"

### Expected Behavior
- **New CLI sessions** appear immediately in the Happy app
- **All messages** are synchronized in real-time between CLI and app
- **Session names** display properly (not "unknown")
- **WebSocket connections** maintain live bidirectional communication
- **Complete privacy** - all data stays on localhost, no external calls

### Troubleshooting
- If CLI shows "unknown" sessions: Sessions should show proper names or "Session [id]" as fallback
- If no real-time updates: Check that server shows WebSocket connections for both CLI and app
- If CLI connection fails: Ensure server is running first and environment variables are set

## Daily Workflow
1. **Start server once** (keep running in background)
2. **Run `happy`** from any project directory for interactive Claude sessions
3. **Monitor on web app** to see sessions and respond from mobile interface
4. **Complete data sovereignty** - everything runs locally with no external dependencies

---

# ⚡ NEW: Streamlined One-Command Setup

## Auto-Starting Server Workflow

**The Happy CLI now automatically starts the server when needed!** No more manual server management.

### Prerequisites
- PostgreSQL running locally
- Redis running locally
- Claude Code CLI installed globally
- Happy CLI installed via `npm link` (from installation steps above)
- (Optional) Nebula binaries downloaded and placed in `happy/nebula/bin/`

### One-Command Usage

```bash
# From ANY directory - the server will auto-start if needed
echo "analyze this code" | env HAPPY_HOME_DIR=~/.happy-dev HAPPY_SERVER_URL=http://localhost:3005 happy

# Or run interactively
env HAPPY_HOME_DIR=~/.happy-dev HAPPY_SERVER_URL=http://localhost:3005 happy

# Multiple sessions work automatically - each gets its own session ID
# while sharing the same server instance and machine ID
```

### What Happens Automatically

1. **Server Check**: CLI checks if Happy server is running at localhost:3005
2. **Auto-Start**: If server isn't running, CLI starts it automatically with default config
3. **Authentication**: Automatic Nebula network authentication (privacy-first mode)
4. **Session Creation**: Each `happy` command creates a new session with unique ID
5. **Real-time Sync**: All sessions appear in the Happy app immediately

### Server Configuration

**New Feature**: Configure server URL through the Happy app settings page (no more build-time configuration).

- Open Happy app → Settings → Server Configuration
- Change server URL at runtime
- Test connection
- Reset to defaults

### Multiple Sessions

The system now supports multiple concurrent sessions:
- Each `happy` command from any directory creates a new session
- All sessions share the same server instance (auto-started once)  
- Sessions are distinguished by unique session IDs
- All sessions appear in the Happy app for monitoring

### Environment Variables

Set these once in your shell profile for seamless usage:

```bash
# Add to ~/.bashrc or ~/.zshrc
export HAPPY_HOME_DIR=~/.happy-dev
export HAPPY_SERVER_URL=http://localhost:3005
```

Then simply run:
```bash
happy "what files are in this directory?"
```

### Benefits of New Workflow

- ✅ **One command** - No terminal juggling  
- ✅ **Auto-server management** - Server starts when needed
- ✅ **Multiple sessions** - Work on different projects simultaneously
- ✅ **Runtime configuration** - Change server URL through app settings
- ✅ **Complete privacy** - Everything stays on localhost
- ✅ **Mobile monitoring** - See all sessions in real-time on Happy app

## Daily Workflow (Simplified)
1. **Run `happy` from any project directory** - server auto-starts if needed
2. **Monitor on Happy app** to see all sessions and interact from mobile
3. **Multiple sessions supported** - each directory can have its own session
4. **Complete data sovereignty** - everything runs locally with no external dependencies
