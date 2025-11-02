# System Architecture

## Overview

The Kubernetes Pod Monitoring System is designed with a distributed architecture that separates concerns across four main components.

## Components

### 1. Agent (Monitoring Layer)
**Technology:** Node.js  
**Role:** Data Collection

```
┌─────────────────────────────────┐
│         K8s Agent               │
│  - Polls K8s API every 10s      │
│  - Analyzes pod status          │
│  - Parses logs for errors       │
│  - Detects error patterns       │
└────────────┬────────────────────┘
             │ HTTP POST
             ▼
```

**Key Functions:**
- `getPods()` - Fetches pod list from namespace
- `getPodLogs()` - Retrieves pod logs
- `analyzeLogsForErrors()` - Pattern matching for errors
- `isPodInError()` - Status evaluation
- `sendToBackend()` - Data transmission

**Error Patterns Detected:**
- CrashLoopBackOff
- OOMKilled
- Error: prefix
- Failed events
- Fatal errors
- Exceptions

**Configuration:**
- Namespace parameter (--namespace=xxx)
- Check interval (default: 10s)
- Backend URL
- Runs as background process

### 2. Backend (API Layer)
**Technology:** Node.js + Express + MySQL  
**Role:** Data Persistence & API Gateway

```
┌─────────────────────────────────┐
│         Backend API             │
│  - Receives agent updates       │
│  - Stores in MySQL              │
│  - Serves dashboard data        │
│  - Aggregates statistics        │
└────────────┬────────────────────┘
             │ REST API
             ▼
```

**API Endpoints:**

**Agent Communication:**
- `POST /api/agent/update` - Receive monitoring data

**Dashboard APIs:**
- `GET /api/namespaces` - List namespaces
- `GET /api/namespaces/:id/pods` - List pods
- `GET /api/pods/:id/errors` - Pod error logs
- `GET /api/dashboard/stats` - Statistics
- `GET /api/errors/recent` - Recent errors

**Data Flow:**
1. Agent sends pod data
2. Backend validates and normalizes
3. Upserts namespace (if new)
4. Upserts pod status
5. Inserts error records
6. Returns success response

### 3. Database (Persistence Layer)
**Technology:** MySQL 8.0+  
**Role:** Data Storage

```
┌───────────────────────────────────┐
│         MySQL Database            │
│                                   │
│  namespaces (1)                   │
│       ↓ FK                        │
│  pods (N)                         │
│       ↓ FK                        │
│  errors (N)                       │
└───────────────────────────────────┘
```

**Schema Design:**

```sql
namespaces
├── id (PK, AUTO_INCREMENT)
├── name (UNIQUE)
├── created_at
└── updated_at

pods
├── id (PK, AUTO_INCREMENT)
├── name
├── namespace_id (FK → namespaces.id)
├── status (ENUM: running, error, pending, unknown)
├── last_check
└── UNIQUE(name, namespace_id)

errors
├── id (PK, AUTO_INCREMENT)
├── pod_id (FK → pods.id)
├── message (TEXT)
├── error_type (VARCHAR)
└── timestamp
```

**Indexes:**
- namespace.name
- pod.namespace_id
- pod.status
- error.pod_id
- error.timestamp

**Relationships:**
- 1 Namespace → N Pods
- 1 Pod → N Errors
- Cascade delete on namespace/pod removal

### 4. Frontend (Presentation Layer)
**Technology:** React + Vite + Tailwind CSS  
**Role:** User Interface

```
┌───────────────────────────────────┐
│       React Dashboard             │
│  - Fetches data via REST API      │
│  - Auto-refreshes every 5s        │
│  - Interactive UI components      │
│  - Real-time visualization        │
└───────────────────────────────────┘
```

**State Management:**
- React Hooks (useState, useEffect)
- Local state for UI interactions
- Periodic API polling (5s interval)

**Component Tree:**
```
App
├── Header
│   ├── Title
│   └── LiveIndicator
├── StatsCards
│   ├── NamespacesCard
│   ├── RunningPodsCard
│   ├── ErrorPodsCard
│   └── ErrorsTodayCard
├── MainContent
│   ├── NamespaceList
│   │   └── NamespaceButton[]
│   ├── RecentErrors
│   │   └── ErrorCard[]
│   └── PodDashboard
│       └── PodCard[]
└── ErrorModal (conditional)
    ├── ModalHeader
    └── ErrorList
        └── ErrorItem[]
```

## Data Flow

### 1. Monitoring Flow (Agent → Backend)

```
┌─────────┐       ┌─────────┐       ┌─────────┐
│  K8s    │──────▶│  Agent  │──────▶│ Backend │
│ Cluster │       │         │       │   API   │
└─────────┘       └─────────┘       └────┬────┘
                                          │
                                          ▼
                                    ┌─────────┐
                                    │  MySQL  │
                                    └─────────┘
```

**Steps:**
1. Agent polls K8s API (`kubectl get pods`)
2. Agent fetches logs (`kubectl logs`)
3. Agent analyzes for errors
4. Agent sends JSON to backend
5. Backend validates data
6. Backend stores in MySQL

**Data Format:**
```json
{
  "namespace": "jira-tracker",
  "pods": [
    {
      "name": "web-pod-123",
      "status": "error",
      "errors": [
        {
          "message": "Error: Connection timeout",
          "type": "Error"
        }
      ]
    }
  ]
}
```

### 2. Visualization Flow (Backend → Frontend)

```
┌─────────┐       ┌─────────┐       ┌──────────┐
│  MySQL  │──────▶│ Backend │──────▶│ Frontend │
│         │       │   API   │       │    UI    │
└─────────┘       └─────────┘       └──────────┘
```

**Steps:**
1. Frontend requests data (5s intervals)
2. Backend queries MySQL
3. Backend aggregates/formats data
4. Frontend receives JSON
5. React updates UI
6. User sees real-time changes

## Scalability Considerations

### Horizontal Scaling

**Agents:**
- ✅ Fully stateless
- ✅ One agent per namespace
- ✅ Can run on different machines
- ✅ No inter-agent communication needed

**Backend:**
- ✅ Stateless API
- ✅ Can run multiple instances
- ⚠️ Need load balancer
- ⚠️ Database connection pooling required

**Database:**
- ⚠️ Single MySQL instance (consider replication)
- ✅ Indexed for performance
- ✅ Normalized schema

### Performance Optimizations

**Agent:**
- Configurable check interval
- Limited log tail (last 100 lines)
- Recent logs only (last 1 minute)
- Async operations

**Backend:**
- Connection pooling (10 connections)
- Prepared statements
- Efficient queries with JOINs
- Indexes on foreign keys

**Frontend:**
- Lazy loading of error details
- Debounced API calls
- Virtual scrolling (if needed)
- Optimized re-renders

## Security Architecture

### Authentication (Future Enhancement)
```
Agent → API Key → Backend
Frontend → JWT Token → Backend
```

### Current Security

**Agent:**
- Uses kubectl credentials
- Read-only K8s access sufficient
- Environment variables for config

**Backend:**
- CORS configured
- SQL injection prevention (parameterized queries)
- Environment variables for secrets
- Input validation

**Database:**
- Dedicated user (monitor_user)
- Minimal privileges
- Password protected
- Local binding recommended

## Deployment Patterns

### Development
```
Local Machine
├── MySQL (localhost:3306)
├── Backend (localhost:3000)
├── Frontend (localhost:5173)
└── Agent (local process)
```

### Production (Example)

```
┌──────────────────────────────────┐
│         Kubernetes Cluster       │
│                                  │
│  ┌────────┐  ┌────────┐         │
│  │ Agent  │  │ Agent  │  ...    │
│  │ Pod 1  │  │ Pod 2  │         │
│  └───┬────┘  └───┬────┘         │
└──────┼───────────┼──────────────┘
       │           │
       └─────┬─────┘
             │ HTTPS
             ▼
    ┌─────────────────┐
    │  Load Balancer  │
    └────────┬────────┘
             │
       ┌─────┴─────┐
       │           │
   ┌───▼───┐   ┌───▼───┐
   │Backend│   │Backend│
   │ Pod 1 │   │ Pod 2 │
   └───┬───┘   └───┬───┘
       └─────┬─────┘
             │
        ┌────▼────┐
        │  MySQL  │
        │  Cloud  │
        └─────────┘
```

## Monitoring & Observability

### Logs
- **Agent**: Console logs with timestamps
- **Backend**: Express request logs
- **Frontend**: Browser console

### Metrics (Future)
- Agent check latency
- API response times
- Error detection rate
- Database query performance

### Health Checks
- Backend: `GET /health`
- Agent: Process status
- Database: Connection test on startup

## Error Handling

### Agent
```javascript
try {
  await monitorPods();
} catch (error) {
  console.error('Error:', error);
  // Continue monitoring
}
```

### Backend
```javascript
try {
  await db.query(...);
  res.json({success: true});
} catch (error) {
  res.status(500).json({error: 'Internal server error'});
}
```

### Frontend
```javascript
try {
  const data = await axios.get(...);
  setState(data);
} catch (error) {
  console.error('API Error:', error);
  // Show cached data or error message
}
```

## Technology Choices

### Why Node.js for Agent?
- ✅ Lightweight and fast
- ✅ Easy to package as executable
- ✅ Good async I/O for kubectl calls
- ✅ Cross-platform

### Why Express for Backend?
- ✅ Simple and minimal
- ✅ Great middleware ecosystem
- ✅ Fast development
- ✅ Well-documented

### Why MySQL?
- ✅ Reliable relational database
- ✅ Good for structured data
- ✅ ACID compliance
- ✅ Easy to query and join

### Why React + Tailwind?
- ✅ Modern, fast UI
- ✅ Component-based architecture
- ✅ Rapid styling with Tailwind
- ✅ Great for hackathons

## Future Enhancements

1. **Authentication & Authorization**
   - JWT tokens for API
   - Role-based access control

2. **Real-time Updates**
   - WebSocket connections
   - Server-sent events

3. **Advanced Analytics**
   - Error trend analysis
   - Predictive alerts
   - ML-based anomaly detection

4. **Multi-cluster Support**
   - Monitor multiple K8s clusters
   - Cluster comparison view

5. **Alerting**
   - Slack/Email notifications
   - Webhook integrations
   - Alert rules engine

6. **Historical Data**
   - Long-term storage
   - Time-series database
   - Historical charts

## Conclusion

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Scalable components
- ✅ Easy to understand and extend
- ✅ Production-ready foundation
- ✅ Hackathon-appropriate scope
