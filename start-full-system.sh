#!/bin/bash

# Complete Happy System Startup Script
# Starts all components in privacy mode

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}     🚀 STARTING HAPPY PRIVACY-FIRST ECOSYSTEM 🚀${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

# Step 1: Start/Check Database
echo -e "\n${CYAN}Step 1: Database${NC}"
if docker ps | grep -q happy-db; then
    echo -e "${GREEN}✅ Database already running${NC}"
else
    docker start happy-db 2>/dev/null || \
    docker run -d --name happy-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=happy -e POSTGRES_USER=postgres -p 5432:5432 postgres:15
    echo -e "${GREEN}✅ Database started${NC}"
    sleep 3
fi

# Step 2: Start Happy Server (if possible)
echo -e "\n${CYAN}Step 2: Happy Server${NC}"
cd "$HOME/Documents/GitHub/happy-server"

if [ -f ".env" ]; then
    echo -e "${CYAN}Starting server...${NC}"
    npx tsx --env-file=.env ./sources/main.ts 2>/dev/null &
    SERVER_PID=$!
    sleep 3
    
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server started (PID: $SERVER_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Server failed to start (Redis/config issue)${NC}"
        echo -e "${YELLOW}    Running without server - app will use local mode${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Server .env not configured - skipping${NC}"
fi

# Step 3: Start Happy App Web
echo -e "\n${CYAN}Step 3: Happy App (Web)${NC}"
cd "$HOME/Documents/GitHub/happy"

# Kill any existing metro/expo process
pkill -f "expo start" 2>/dev/null || true
sleep 1

echo -e "${CYAN}Starting Happy App...${NC}"
yarn web &
APP_PID=$!

# Wait for app to start
echo -e "${CYAN}Waiting for app to start...${NC}"
sleep 10

# Check if running
if ps -p $APP_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Happy App running${NC}"
else
    echo -e "${RED}❌ Happy App failed to start${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}           ✅ HAPPY ECOSYSTEM STARTED! ✅${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Access Points:${NC}"
echo -e "  🌐 Happy App:    ${GREEN}http://localhost:8081${NC}"
echo -e "  📊 Database:     ${GREEN}postgresql://localhost:5432/happy${NC}"
if [ ! -z "$SERVER_PID" ] && ps -p $SERVER_PID > /dev/null 2>&1; then
    echo -e "  🖥️  Server:       ${GREEN}http://localhost:3005${NC}"
fi
echo ""
echo -e "${CYAN}Privacy Features:${NC}"
echo -e "  ✅ No external tracking (PostHog removed)"
echo -e "  ✅ Local voice processing (ElevenLabs removed)"
echo -e "  ✅ No payment system (RevenueCat removed)"
echo -e "  ✅ Local-only analytics"
echo -e "  ✅ All data stays on your machine"
echo ""
echo -e "${YELLOW}Commands:${NC}"
echo -e "  Stop all:     ${GREEN}./stop-happy-ecosystem.sh${NC}"
echo -e "  Test system:  ${GREEN}./test-happy-system.sh${NC}"
echo ""

# Function to stop all services
stop_all() {
    echo -e "\n${CYAN}Stopping all services...${NC}"
    
    if [ ! -z "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null || true
        echo -e "${GREEN}✅ App stopped${NC}"
    fi
    
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Server stopped${NC}"
    fi
    
    pkill -f "expo start" 2>/dev/null || true
    pkill -f "tsx.*main.ts" 2>/dev/null || true
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap stop_all INT

echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"
wait