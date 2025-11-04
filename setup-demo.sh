#!/bin/bash

# Hackathon Demo Setup Script
# This script sets up the complete demo environment

echo "🎬 Hackathon Demo Setup"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if database is running
echo -e "${BLUE}Step 1: Checking database connection...${NC}"
if mysql -u monitoring_user -pmonitoring123 -e "USE monitoring;" 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
    
    # Update schema
    echo -e "${BLUE}Updating database schema...${NC}"
    mysql -u monitoring_user -pmonitoring123 monitoring < update-schema.sql 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database schema updated${NC}"
    else
        echo -e "${YELLOW}⚠ Schema might already be updated${NC}"
    fi
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo -e "${YELLOW}Please make sure MySQL is running and credentials are correct${NC}"
    exit 1
fi

# Step 2: Check if backend is running
echo -e "\n${BLUE}Step 2: Checking backend server...${NC}"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend server is running${NC}"
else
    echo -e "${YELLOW}⚠ Backend server is not running${NC}"
    echo -e "${BLUE}Starting backend server...${NC}"
    cd backend
    npm run dev &
    BACKEND_PID=$!
    sleep 3
    echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"
    cd ..
fi

# Step 3: Check if frontend is running
echo -e "\n${BLUE}Step 3: Checking frontend...${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend is not running${NC}"
    echo -e "${BLUE}Starting frontend...${NC}"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    sleep 3
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    cd ..
fi

# Step 4: Create hackathon demo environment
echo -e "\n${BLUE}Step 4: Setting up Kubernetes demo environment...${NC}"
cd test
node hackathonDemo.js

# Step 5: Start monitoring agent
echo -e "\n${BLUE}Step 5: Starting monitoring agent...${NC}"
cd ../agent
node index.js --namespace=hackathon &
AGENT_PID=$!
echo -e "${GREEN}✓ Monitoring agent started (PID: $AGENT_PID)${NC}"

# Summary
echo -e "\n${GREEN}======================================"
echo -e "🎉 Demo Environment Ready!"
echo -e "======================================${NC}"
echo ""
echo -e "${BLUE}📊 Dashboard:${NC} http://localhost:5173"
echo -e "${BLUE}🔧 Backend API:${NC} http://localhost:3000"
echo -e "${BLUE}📦 Kubernetes Namespace:${NC} hackathon"
echo ""
echo -e "${YELLOW}Demo Pods:${NC}"
echo -e "  • ${RED}dashboard${NC} - ImagePullBackOff (AI will fix)"
echo -e "  • ${RED}oidc-server${NC} - P0 Configuration Error"
echo -e "  • ${GREEN}proxy${NC} - Running healthy"
echo -e "  • ${GREEN}redis${NC} - Running healthy"
echo -e "  • ${RED}postgres${NC} - P0 Data Corruption (Manual required)"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo -e "  1. Click on '${RED}dashboard${NC}' pod to see AI resolution in action"
echo -e "  2. Click on '${RED}postgres${NC}' pod to see manual escalation"
echo -e "  3. Check 'Critical Errors' sidebar for P0 priorities"
echo ""
echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  kill $AGENT_PID  # Stop agent"
echo -e "  kubectl delete namespace hackathon  # Clean up K8s"
echo ""
