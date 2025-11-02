# Quick Start Commands

## Initial Setup
```bash
# Run automated setup
./setup.sh

# Or manual setup
cd backend && npm install
cd ../frontend && npm install  
cd ../agent && npm install
```

## Database Setup
```bash
# Create database
mysql -u root -p < backend/schema.sql
```

## Running the System

### Terminal 1 - Backend
```bash
cd backend
npm start
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### Terminal 3 - Test Simulator (Optional)
```bash
cd test
node simulatePods.js jira-tracker
```

### Terminal 4 - Agent
```bash
cd agent
node index.js --namespace=jira-tracker
```

## Multi-Namespace Example
```bash
# Terminal 1: Agent for jira-tracker
cd agent && node index.js --namespace=jira-tracker &

# Terminal 2: Agent for vimana
cd agent && node index.js --namespace=vimana &

# Terminal 3: Simulator for jira-tracker
cd test && node simulatePods.js jira-tracker &

# Terminal 4: Simulator for vimana
cd test && node simulatePods.js vimana &
```

## URLs
- Backend API: http://localhost:3000
- Frontend Dashboard: http://localhost:5173
- Health Check: http://localhost:3000/health

## Cleanup
```bash
# Stop all background processes
killall node

# Delete test namespaces
kubectl delete namespace jira-tracker
kubectl delete namespace vimana
```

## Building Agent Executable
```bash
cd agent
npm run build
./bin/agent-monitor-macos --namespace=production
```
