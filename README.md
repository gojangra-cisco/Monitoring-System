# Kubernetes Pod Monitoring System 🚀

A complete  project for automated Kubernetes pod monitoring with real-time error detection and visualization.

![Status](https://img.shields.io/badge/status-hackathon-blue)
![Node.js](https://img.shields.io/badge/node.js-18+-green)
![License](https://img.shields.io/badge/license-ISC-lightgrey)

## 🎯 Project Overview

This system automatically monitors Kubernetes pods across multiple namespaces using lightweight Node.js agents. When a pod fails, the system analyzes logs, detects error patterns, and displays real-time results on a modern React dashboard.

### Key Features

✅ **Multi-Namespace Support** - Monitor pods across different namespaces simultaneously  
✅ **Automated Error Detection** - Identifies CrashLoopBackOff, OOMKilled, and other error patterns  
✅ **Real-Time Dashboard** - Beautiful React UI with live updates  
✅ **Lightweight Agents** - Minimal resource usage, runs as background processes  
✅ **Executable Build** - Agents can be packaged as standalone executables  
✅ **Test Simulator** - Built-in tool to generate test pods and logs

## 📁 Project Structure

```

├── backend/        # Node.js + Express + MySQL API
├── frontend/       # React.js + Tailwind CSS dashboard
├── agent/          # Node.js monitoring agent (executable)
└── test/           # Kubernetes pod simulator for testing
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- kubectl (configured with cluster access)
- Docker (optional, for local K8s)

### 1. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Configure database
cp .env.example .env
# Edit .env with your MySQL credentials

# Create database and schema
mysql -u root -p < schema.sql

# Start server
npm start
```

Backend runs on `http://localhost:3000`

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure API URL
cp .env.example .env

# Start dev server
npm run dev
```

Dashboard available at `http://localhost:5173`

### 3. Build and Run Agent

```bash
cd agent

# Install dependencies
npm install

# (Optional) Build executable
npm run build

# Configure agent
cp .env.example .env

# Run agent for specific namespace
node index.js --namespace=jira-tracker

# Or run in background
node index.js --namespace=jira-tracker &

# Run another agent for different namespace
node index.js --namespace=vimana &
```

### 4. Test with Simulator

```bash
cd test

# Create test namespace with simulated pods
node simulatePods.js jira-tracker

# Create another test namespace
node simulatePods.js vimana
```

## 🔧 Component Details

### Backend (Node.js + Express + MySQL)

**Features:**
- REST APIs for agent updates and dashboard data
- MySQL database with namespaces, pods, and errors tables
- CORS enabled for frontend communication
- Health check endpoint

**Key Endpoints:**
- `POST /api/agent/update` - Receive agent updates
- `GET /api/namespaces` - List all namespaces
- `GET /api/namespaces/:id/pods` - Get pods in namespace
- `GET /api/pods/:id/errors` - Get pod error logs
- `GET /api/dashboard/stats` - Dashboard statistics

[→ Full Backend Documentation](./backend/README.md)

### Frontend (React + Tailwind CSS)

**Features:**
- Modern dark theme with gradient backgrounds
- Real-time data refresh (5-second intervals)
- Responsive layout for all screen sizes
- Interactive error log viewer
- Color-coded status indicators

**UI Components:**
- Statistics dashboard (4 metric cards)
- Namespace selector
- Pod status grid
- Recent errors feed
- Error detail modal

[→ Full Frontend Documentation](./frontend/README.md)

### Agent (Node.js)

**Features:**
- Monitors pods every 10 seconds (configurable)
- Detects multiple error patterns:
  - CrashLoopBackOff
  - OOMKilled
  - Error: messages
  - Failed events
  - Exceptions
  - Fatal errors
- Sends data to backend API
- Can run multiple agents concurrently
- Buildable as standalone executable

**Usage:**
```bash
# Monitor default namespace
./bin/agent-monitor

# Monitor specific namespace
./bin/agent-monitor --namespace=production

# Run in background
./bin/agent-monitor --namespace=staging &
```

[→ Full Agent Documentation](./agent/README.md)

### Test Simulator (Node.js)

**Features:**
- Creates test Kubernetes namespace
- Deploys 3 sample pods
- Generates realistic logs (85% normal, 15% errors)
- Simulates pod crashes after consecutive errors

**Usage:**
```bash
# Default namespace (jira-tracker)
node simulatePods.js

# Custom namespace
node simulatePods.js my-namespace
```

[→ Full Simulator Documentation](./test/README.md)

## 🎨 Dashboard Screenshots

### Main Dashboard
- Live status indicator
- Statistics cards for quick metrics
- Namespace selector sidebar
- Pod grid with status colors

### Error Viewer
- Detailed error logs modal
- Error type badges
- Timestamps and formatting
- Searchable error history

## 🔄 System Architecture

```
┌─────────────────┐
│   Kubernetes    │
│     Cluster     │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Agents  │  (Multiple, one per namespace)
    └────┬────┘
         │ HTTP POST
         ▼
    ┌─────────┐
    │ Backend │  (Express + MySQL)
    │   API   │
    └────┬────┘
         │ REST API
         ▼
    ┌──────────┐
    │ Frontend │  (React Dashboard)
    │   UI     │
    └──────────┘
```

## 📊 Database Schema

### Tables

**namespaces**
- `id` (Primary Key)
- `name` (Unique)
- `created_at`, `updated_at`

**pods**
- `id` (Primary Key)
- `name`
- `namespace_id` (Foreign Key)
- `status` (enum: running, error, pending, unknown)
- `last_check`

**errors**
- `id` (Primary Key)
- `pod_id` (Foreign Key)
- `message` (Text)
- `error_type`
- `timestamp`

## 🎯 Demo Flow

### Setup (5 minutes)
1. Start MySQL database
2. Run backend: `cd backend && npm start`
3. Run frontend: `cd frontend && npm run dev`

### Demo (10 minutes)
1. **Show empty dashboard**
2. **Start test simulator**: `cd test && node simulatePods.js jira-tracker`
3. **Start agent**: `cd agent && node index.js --namespace=jira-tracker`
4. **Watch real-time updates** on dashboard
5. **Click pods** to view error details
6. **Start second namespace**: Repeat with `vimana`
7. **Show multi-namespace monitoring**

### Highlights
- ✅ Automatic error detection
- ✅ Real-time visualization
- ✅ Multi-namespace support
- ✅ Clean, professional UI
- ✅ Scalable architecture

## 🛠️ Development

### Install All Dependencies

```bash
# Root level script (create this)
npm run install:all

# Or manually
cd backend && npm install
cd ../frontend && npm install
cd ../agent && npm install
```

### Run in Development Mode

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Agent
cd agent && npm start -- --namespace=test
```

## 📝 Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_USER=monitor_user
DB_PASSWORD=StrongPassword123!
DB_NAME=monitoring
PORT=3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

### Agent (.env)
```env
BACKEND_URL=http://localhost:3000
CHECK_INTERVAL=10000
```

## 🐛 Troubleshooting

### Backend won't start
- Check MySQL is running: `mysql -u root -p`
- Verify database exists: `SHOW DATABASES;`
- Check `.env` credentials

### Frontend shows no data
- Verify backend is running
- Check browser console for errors
- Ensure CORS is enabled in backend

### Agent can't connect
- Check kubectl is configured: `kubectl cluster-info`
- Verify namespace exists: `kubectl get namespaces`
- Test backend connectivity: `curl http://localhost:3000/health`

### Simulator fails
- Ensure kubectl has permissions
- Check cluster is accessible
- Try with different namespace name

## 🚀 Production Deployment

### Backend
```bash
cd backend
npm run build  # If using TypeScript
NODE_ENV=production npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

### Agent
```bash
cd agent
npm run build
# Deploy bin/agent-monitor executable to target machines
```

## 📦 Building Executables

The agent can be packaged as a standalone executable:

```bash
cd agent
npm run build
```

This creates platform-specific executables in `agent/bin/`:
- `agent-monitor-macos` (macOS)
- `agent-monitor-linux` (Linux)
- `agent-monitor-win.exe` (Windows)

Run without Node.js installed:
```bash
./bin/agent-monitor-macos --namespace=production
```

## 🔐 Security Considerations

- **Database**: Use strong passwords, don't commit `.env`
- **API**: Add authentication for production use
- **Agent**: Restrict kubectl permissions to read-only
- **CORS**: Configure specific origins in production

## 🎓 Learning Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express.js Guide](https://expressjs.com/)

## 📄 License

ISC License - Feel free to use and learning!

## 🤝 Contributing

This is a sample project, but improvements are welcome:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request



## 📞 Support

For issues or questions:
1. Check component-specific READMEs
2. Review troubleshooting section
3. Check console/logs for errors

---


