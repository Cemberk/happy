#!/bin/bash

# Happy Ecosystem Stop Script

echo "Stopping Happy Ecosystem..."

# Stop CLI daemon
happy daemon stop 2>/dev/null || true

# Stop server processes
pkill -f "happy-server" 2>/dev/null || true
pkill -f "yarn start" 2>/dev/null || true

# Stop Nebula
sudo pkill nebula 2>/dev/null || true

# Stop database
docker stop happy-db 2>/dev/null || true

echo "✅ Happy Ecosystem stopped"