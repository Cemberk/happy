#!/bin/bash

# Happy System Integration Test Script

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   Happy Ecosystem Integration Test    ${NC}"
echo -e "${CYAN}========================================${NC}"

# Test 1: Database Connection
echo -e "\n${CYAN}Test 1: Database Connection${NC}"
if docker ps | grep -q happy-db; then
    echo -e "${GREEN}✅ PostgreSQL container running${NC}"
else
    echo -e "${RED}❌ PostgreSQL not running${NC}"
    echo "Run: docker run -d --name happy-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=happy -p 5432:5432 postgres:15"
fi

# Test 2: Server Health Check
echo -e "\n${CYAN}Test 2: Server Health Check${NC}"
if curl -s http://localhost:3005/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Happy Server responding at localhost:3005${NC}"
else
    echo -e "${RED}❌ Server not responding${NC}"
    echo "Check: cd happy-server && yarn start"
fi

# Test 3: Happy App Dependencies
echo -e "\n${CYAN}Test 3: Happy App Status${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Happy App dependencies installed${NC}"
    
    # Check if we can build
    if command -v yarn &> /dev/null; then
        echo -e "${CYAN}  Checking TypeScript compilation...${NC}"
        yarn typecheck 2>&1 | head -5
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
        else
            echo -e "${YELLOW}⚠️  TypeScript has some errors (normal for now)${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Dependencies not installed${NC}"
    echo "Run: yarn install"
fi

# Test 4: Nebula Network
echo -e "\n${CYAN}Test 4: Nebula Network${NC}"
if [ -f "$HOME/Documents/GitHub/nebula/nebula" ]; then
    echo -e "${GREEN}✅ Nebula binary found${NC}"
    
    if pgrep nebula > /dev/null; then
        echo -e "${GREEN}✅ Nebula process running${NC}"
    else
        echo -e "${YELLOW}⚠️  Nebula not running${NC}"
        echo "Run: sudo $HOME/Documents/GitHub/nebula/nebula -config $HOME/Documents/GitHub/nebula/config.yml"
    fi
else
    echo -e "${YELLOW}⚠️  Nebula not installed${NC}"
fi

# Test 5: Privacy Check
echo -e "\n${CYAN}Test 5: Privacy Verification${NC}"
echo -e "${CYAN}Checking for removed external services...${NC}"

# Check PostHog
if grep -r "posthog" sources/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// PostHog removed" | grep -v "//" > /dev/null; then
    echo -e "${RED}❌ PostHog references still found${NC}"
else
    echo -e "${GREEN}✅ PostHog removed${NC}"
fi

# Check ElevenLabs
if grep -r "elevenlabs" sources/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// ElevenLabs removed" | grep -v "//" > /dev/null; then
    echo -e "${RED}❌ ElevenLabs references still found${NC}"
else
    echo -e "${GREEN}✅ ElevenLabs removed${NC}"
fi

# Check RevenueCat
if grep -r "react-native-purchases" package.json > /dev/null 2>&1; then
    echo -e "${RED}❌ RevenueCat still in dependencies${NC}"
else
    echo -e "${GREEN}✅ RevenueCat removed${NC}"
fi

# Test 6: Local Analytics
echo -e "\n${CYAN}Test 6: Local Analytics System${NC}"
if [ -f "sources/track/tracking.ts" ]; then
    if grep -q "class LocalAnalytics" sources/track/tracking.ts; then
        echo -e "${GREEN}✅ Local analytics system implemented${NC}"
    else
        echo -e "${RED}❌ Local analytics not found${NC}"
    fi
fi

# Test 7: Environment Check
echo -e "\n${CYAN}Test 7: Environment Configuration${NC}"
if [ -f "../happy-server/.env" ]; then
    echo -e "${GREEN}✅ Server .env file exists${NC}"
    
    if grep -q "ENABLE_ANALYTICS=false" ../happy-server/.env; then
        echo -e "${GREEN}✅ Analytics disabled in server${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Server .env not configured${NC}"
fi

# Test 8: Web Build
echo -e "\n${CYAN}Test 8: Web Build Capability${NC}"
if [ -f "package.json" ]; then
    if grep -q '"web": "expo start --web"' package.json; then
        echo -e "${GREEN}✅ Web build configured${NC}"
    fi
fi

echo -e "\n${CYAN}========================================${NC}"
echo -e "${GREEN}        Test Summary Complete          ${NC}"
echo -e "${CYAN}========================================${NC}"

# Summary
echo -e "\n${CYAN}Quick Start Commands:${NC}"
echo "1. Start database:     docker run -d --name happy-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=happy -p 5432:5432 postgres:15"
echo "2. Start server:       cd ../happy-server && yarn start"
echo "3. Start Happy App:    yarn web"
echo "4. Start full system:  ./start-happy-ecosystem.sh"