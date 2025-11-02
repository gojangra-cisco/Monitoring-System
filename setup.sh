#!/bin/bash

# Kubernetes Pod Monitoring System - Quick Setup Script

echo "🚀 Kubernetes Pod Monitoring System - Setup"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check MySQL
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL client not found. Make sure MySQL is installed."
fi

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "⚠️  kubectl not found. Install kubectl to use the agent."
else
    echo "✅ kubectl found"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Backend
echo "📂 Setting up Backend..."
cd backend
npm install
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created backend/.env - Please configure your database credentials"
fi
cd ..

# Frontend
echo ""
echo "📂 Setting up Frontend..."
cd frontend
npm install
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created frontend/.env"
fi
cd ..

# Agent
echo ""
echo "📂 Setting up Agent..."
cd agent
npm install
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created agent/.env"
fi
cd ..

# Test
echo ""
echo "📂 Setting up Test Simulator..."
cd test
npm install
cd ..

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Configure Database:"
echo "   - Edit backend/.env with your MySQL credentials"
echo "   - Run: mysql -u root -p < backend/schema.sql"
echo ""
echo "2. Start Backend:"
echo "   cd backend && npm start"
echo ""
echo "3. Start Frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Run Test Simulator (optional):"
echo "   cd test && node simulatePods.js jira-tracker"
echo ""
echo "5. Start Agent:"
echo "   cd agent && node index.js --namespace=jira-tracker"
echo ""
echo "🎉 Happy Hacking!"
