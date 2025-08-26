#!/bin/bash

# Happy Ecosystem Startup Script
# Starts all components in correct order

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}Starting Happy Ecosystem (Privacy Mode)...${NC}"

# Start Nebula VPN
cd "$HOME/Documents/GitHub/nebula"
sudo ./nebula -config config.yml &
NEBULA_PID=$!
echo -e "${GREEN}✅ Nebula VPN started (PID: $NEBULA_PID)${NC}"
sleep 2

# Start PostgreSQL (if Docker)
if command -v docker &> /dev/null && docker ps -a | grep -q happy-db; then
    docker start happy-db
    echo -e "${GREEN}✅ Database started${NC}"
    sleep 3
fi

# Start Happy Server
cd "$HOME/Documents/GitHub/happy-server"
yarn start &
SERVER_PID=$!
echo -e "${GREEN}✅ Happy Server started (PID: $SERVER_PID)${NC}"
sleep 3

# Start Happy CLI daemon
cd "$HOME/Documents/GitHub/happy-cli"
happy daemon start &
CLI_PID=$!
echo -e "${GREEN}✅ Happy CLI daemon started (PID: $CLI_PID)${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     ✅ HAPPY CLI+SERVER ECOSYSTEM IS RUNNING! ✅${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Access Points:${NC}"
echo "  🖥️  Server:      http://localhost:3005"
echo "  🌐 Nebula IP:    http://192.168.100.1:3005"
echo "  💻 CLI:         Run 'happy' commands"
echo ""
echo -e "${CYAN}Quick Commands:${NC}"
echo "  happy status         - Check ecosystem status"
echo "  happy create         - Create new session"
echo "  happy list           - List sessions"
echo "  happy analytics      - View local analytics"
echo "  happy daemon stop    - Stop CLI daemon"
echo ""

# Create stop function
stop_services() {
    echo -e "\n${CYAN}Stopping services...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    kill $CLI_PID 2>/dev/null || true
    sudo kill $NEBULA_PID 2>/dev/null || true
    docker stop happy-db 2>/dev/null || true
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap stop_services INT
echo -e "${GREEN}Services running. Press Ctrl+C to stop all.${NC}"
wait