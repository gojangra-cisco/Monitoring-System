# Kubernetes Pod Monitoring Agent

Build the agent into a standalone executable:

```bash
# Install dependencies
npm install

# Build executable
npm run build
```

This creates executables in the `bin/` directory:
- `agent-monitor-macos` (macOS)
- `agent-monitor-linux` (Linux)
- `agent-monitor-win.exe` (Windows)

## Usage

### Running with Node.js
```bash
# Copy .env.example to .env and configure if needed
cp .env.example .env

# Monitor default namespace
node index.js

# Monitor specific namespace
node index.js --namespace=jira-tracker
```

### Running as executable (after build)
```bash
# Run in foreground
./bin/agent-monitor-macos --namespace=jira-tracker

# Run in background
./bin/agent-monitor-macos --namespace=vimana &
```

## Configuration

Edit `.env` file:
```
BACKEND_URL=http://localhost:3000
CHECK_INTERVAL=10000
```

## Requirements

- Node.js 18+
- kubectl installed and configured
- Access to Kubernetes cluster
- Backend API running
