# 🎬 Demo Simulation - Step-by-Step Commands

This guide walks you through manually setting up and running the hackathon demo with individual commands.

---

## Prerequisites Check

```bash
# Check if required tools are installed
node --version        # Should be v14+
npm --version         # Should be v6+
mysql --version       # Should be v8.0+
kubectl version       # Should show client and server versions

# Check if Kubernetes cluster is running
kubectl cluster-info

# Check if MySQL is running
mysql -u root -p -e "SELECT 1;"
```

---

## Step 1: Database Setup

```bash
# Navigate to project root
cd /Users/gojangra/Desktop/code/hackathon

# Test database connection
mysql -u monitoring_user -pmonitoring123 -e "SHOW DATABASES;"

# Update database schema with priority fields
cd backend
mysql -u monitoring_user -pmonitoring123 monitoring < update-schema.sql

# Verify schema update
mysql -u monitoring_user -pmonitoring123 monitoring -e "DESCRIBE errors;"

# You should see columns: priority, ai_resolution_status, ai_resolution_steps, resolved_at
```

**Expected Output:**
```
+----------------------+----------------------------------------------------------+
| Field                | Type                                                     |
+----------------------+----------------------------------------------------------+
| id                   | int                                                      |
| pod_id               | int                                                      |
| error_message        | text                                                     |
| error_type           | varchar(100)                                             |
| priority             | enum('P0','P1','P2','P3')                               |
| ai_resolution_status | enum('pending','analyzing','fixing','resolved'...)       |
| ai_resolution_steps  | json                                                     |
| resolved_at          | timestamp                                                |
| created_at           | timestamp                                                |
+----------------------+----------------------------------------------------------+
```

---

## Step 2: Start Backend Server

```bash
# Open Terminal 1
cd /Users/gojangra/Desktop/code/hackathon/backend

# Install dependencies (if not already done)
npm install

# Start backend server
npm run dev

# Server should start on http://localhost:3000
```

**Expected Output:**
```
> backend@1.0.0 dev
> nodemon index.js

[nodemon] 3.0.1
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,json
[nodemon] starting `node index.js`
Server running on http://localhost:3000
Database connected successfully
```

**Test Backend:**
```bash
# In another terminal, test the API
curl http://localhost:3000/health

# Should return: {"status":"healthy"}
```

---

## Step 3: Start Frontend Application

```bash
# Open Terminal 2
cd /Users/gojangra/Desktop/code/hackathon/frontend

# Install dependencies (if not already done)
npm install

# Start frontend dev server
npm run dev

# Server should start on http://localhost:5173
```

**Expected Output:**
```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**Test Frontend:**
```bash
# Open in browser
open http://localhost:5173

# You should see the beautiful gradient dashboard
# (It will be empty until we create pods and start the agent)
```

---

## Step 4: Create Kubernetes Demo Environment

```bash
# Open Terminal 3
cd /Users/gojangra/Desktop/code/hackathon/test

# Check if hackathon namespace exists
kubectl get namespace hackathon

# If it exists, delete it first for clean demo
kubectl delete namespace hackathon --wait=true

# Wait for namespace to be fully deleted (this may take 30-60 seconds)
watch kubectl get namespace hackathon
# Press Ctrl+C when you see "Error from server (NotFound)"

# Create fresh demo environment with 5 specific pods
node hackathonDemo.js
```

**Expected Output:**
```
🎬 Creating Hackathon Demo Environment...

Step 1: Creating namespace 'hackathon'...
✓ Namespace created

Step 2: Creating dashboard pod (invalid image - AI can fix)...
✓ Dashboard pod created

Step 3: Creating oidc-server pod (P0 config error)...
✓ OIDC server pod created

Step 4: Creating proxy pod (healthy)...
✓ Proxy pod created

Step 5: Creating redis pod (healthy)...
✓ Redis pod created

Step 6: Creating postgres pod (P0 data corruption - manual required)...
✓ Postgres pod created

🎉 Demo environment ready!

Pods created:
  • dashboard - will show ImagePullBackOff (AI can fix)
  • oidc-server - will show CrashLoopBackOff (P0 priority)
  • proxy - running healthy
  • redis - running healthy
  • postgres - will show CrashLoopBackOff (P0 priority, manual required)

Next steps:
1. Wait 30 seconds for pods to initialize
2. Start the monitoring agent: cd ../agent && node index.js --namespace=hackathon
3. Open dashboard: http://localhost:5173
```

**Verify Pods Created:**
```bash
# Check all pods in hackathon namespace
kubectl get pods -n hackathon

# You should see 5 pods
kubectl get pods -n hackathon -o wide
```

**Expected Output:**
```
NAME          READY   STATUS              RESTARTS   AGE
dashboard     0/1     ImagePullBackOff    0          10s
oidc-server   1/1     Running             0          10s
postgres      1/1     Running             0          10s
proxy         1/1     Running             0          10s
redis         1/1     Running             0          10s
```

**Note:** Postgres will run healthy for 50 seconds, then crash with a P0 error.

---

## Step 5: Start Monitoring Agent

```bash
# Open Terminal 4
cd /Users/gojangra/Desktop/code/hackathon/agent

# Start the monitoring agent for hackathon namespace
node index.js --namespace=hackathon
```

**Expected Output:**
```
🎯 K8s Monitoring Agent Started
Namespace: hackathon
Backend API: http://localhost:3000
Poll Interval: 10 seconds
----------------------------------------

[2025-11-04 10:30:00] Fetching pods from namespace: hackathon
[2025-11-04 10:30:00] Found 5 pods
[2025-11-04 10:30:00] Processing pod: dashboard (ImagePullBackOff)
[2025-11-04 10:30:00] Processing pod: oidc-server (CrashLoopBackOff)
[2025-11-04 10:30:00] Processing pod: postgres (CrashLoopBackOff)
[2025-11-04 10:30:00] Processing pod: proxy (Running)
[2025-11-04 10:30:00] Processing pod: redis (Running)
[2025-11-04 10:30:00] ✓ Successfully sent update to backend
[2025-11-04 10:30:00] Next update in 10 seconds...
```

**The agent will:**
- Check pod status every 10 seconds
- Send updates to backend API
- Detect errors (ImagePullBackOff, CrashLoopBackOff)
- Track pod health status

---

## Step 6: Open Dashboard and Interact

```bash
# Open the dashboard in your browser
open http://localhost:5173
```

### What You Should See:

1. **Header with Stats:**
   - Namespaces: 1
   - Total Pods: 5
   - Healthy: 4 (initially - oidc-server, proxy, redis, postgres)
   - Errors: 1 (dashboard only)
   - Live indicator (green pulsing dot)

2. **Pod Cards (5 total):**
   - **dashboard** (Red border) - ImagePullBackOff with P1 badge
   - **oidc-server** (Green border) - Running ✅
   - **proxy** (Green border) - Running ✅
   - **redis** (Green border) - Running ✅
   - **postgres** (Green border initially) - Running ✅ → Will turn red after 50 seconds

3. **Critical Errors Sidebar:**
   - ONE error initially (dashboard)
   - After 50 seconds, postgres error appears with P0 badge
   - Total: 2 errors only (no duplicates)

---

## Step 7: Test AI Resolution - Dashboard Pod

```bash
# In browser, click on the "dashboard" pod card
```

**What You Should See:**

1. **Error Modal Opens** showing:
   - Pod name: dashboard
   - Status: ImagePullBackOff
   - Error message: "Failed to pull image 'nginx:invalid-tag-demo'"

2. **AI Resolution Panel Appears with Line-by-Line Command Execution:**
   - Step 1: Analyzing (2 seconds, with spinner)
   - Step 2: Searching for Solutions (2 seconds)
   - Step 3: Generating Fix - **Terminal opens showing commands appearing one-by-one:**
     ```
     [10:30:15]
     $ kubectl get pod dashboard -n hackathon
     ✓ Executed successfully
     
     [10:30:16]  ← 1 second delay
     $ kubectl describe pod dashboard -n hackathon | grep Image
     ✓ Executed successfully
     
     [10:30:17]  ← 1 second delay
     $ kubectl set image pod/dashboard dashboard=nginx:latest -n hackathon
     ⏳ Executing...
     ```
   - Step 4: Applying Fix (3 seconds)
   - Step 5: Verified ✓ (Success with green checkmark)

3. **Timeline Shows:**
   - ✓ Analyzing Error
   - ✓ Searching Solutions
   - ✓ Generating Fix (with terminal commands)
   - ✓ Applying Fix
   - ✓ Verified - Success

**Key Feature:** Commands appear one at a time with 1-second delays between each, simulating real-time execution!

**Manual Test (Optional):**
```bash
# You can actually apply the fix manually
kubectl set image deployment/dashboard dashboard=nginx:latest -n hackathon

# Watch the pod recover
kubectl get pods -n hackathon -w

# The dashboard pod should transition to Running state
```

---

## Step 8: Test AI Escalation - Postgres Pod

**IMPORTANT:** Wait at least 50 seconds after creating the pods before clicking postgres. The postgres pod runs healthy initially, then crashes after 50 seconds to show a realistic P0 scenario.

```bash
# Watch postgres pod status change
kubectl get pods -n hackathon -w

# You'll see postgres transition from Running → CrashLoopBackOff after ~50 seconds
```

```bash
# In browser, click on the "postgres" pod card (after it turns red)
```

**What You Should See:**

1. **Error Modal Opens** showing:
   - Pod name: postgres
   - Status: CrashLoopBackOff
   - Priority: P0 (Red pulsing badge)
   - Error message: "Data corruption detected in postgresql.conf"

2. **AI Resolution Panel Shows Escalation with Line-by-Line Commands:**
   - Step 1: Analyzing Critical Error (2 seconds)
   - Step 2: Assessing Severity (2 seconds)
   - Step 3: Attempting Recovery - **Terminal opens showing commands:**
     ```
     [10:31:15]
     $ kubectl logs postgres -n hackathon --tail=50
     ✓ Executed successfully
     
     [10:31:16]  ← 1 second delay
     $ kubectl exec postgres -n hackathon -- pg_isready
     ✓ Executed successfully
     
     [10:31:17]  ← 1 second delay
     $ kubectl exec postgres -n hackathon -- pg_resetwal -f /data
     ⏳ Executing...
     ```
   - Step 4: AI Assessment (2 seconds) - "Auto-recovery failed"
   - Step 5: Manual Required ⚠️ (1 second)

3. **Red Warning Box Appears:**
   ```
   ⚠️ AI cannot safely resolve data corruption without risk of data loss
   Recommendation: Contact database administrator immediately
   ```

4. **Timeline Shows:**
   - ✓ Analyzing Critical Error (P0)
   - ✓ Assessing Severity
   - ✓ Attempting Recovery (with terminal commands)
   - 🤖 AI Assessment: Failed
   - 🚨 Escalation Required - P0 Priority

**Key Feature:** AI executes diagnostic commands but recognizes the limitation and escalates to P0 instead of making the problem worse!

---

## Step 9: Monitor Real-Time Updates

The dashboard updates automatically every 5 seconds. Watch as:

1. **Stats Update:**
   - Error count changes
   - Healthy pod count updates

2. **Pod Status Changes:**
   - If you manually fixed dashboard pod, it turns green
   - Status badges update in real-time

3. **Error Sidebar Updates:**
   - New errors appear
   - Resolved errors disappear
   - Priorities stay sorted (P0 first)

**Monitor in Terminal:**
```bash
# Terminal 3 - Watch pod status
kubectl get pods -n hackathon -w

# Terminal 4 - Watch agent logs
# (Already running, shows updates every 10 seconds)

# Terminal 5 - Watch backend logs
# (Already running in Terminal 1)

# Terminal 6 - Watch database updates
mysql -u monitoring_user -pmonitoring123 monitoring -e "
SELECT 
  p.name,
  p.status,
  e.error_type,
  e.priority,
  e.ai_resolution_status,
  e.created_at
FROM pods p
LEFT JOIN errors e ON e.pod_id = p.id
WHERE p.namespace = 'hackathon'
ORDER BY e.priority, e.created_at DESC;
"
```

---

## Step 10: Test Additional Features

### View All Errors by Priority
```bash
# API call to get all errors sorted by priority
curl http://localhost:3000/api/errors/recent | jq '.'
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "pod_name": "oidc-server",
    "error_type": "CrashLoopBackOff",
    "error_message": "Configuration error: Missing OIDC_CLIENT_SECRET",
    "priority": "P0",
    "namespace": "hackathon",
    "created_at": "2025-11-04T10:30:00.000Z"
  },
  {
    "id": 2,
    "pod_name": "postgres",
    "error_type": "CrashLoopBackOff",
    "error_message": "Data corruption detected in postgresql.conf",
    "priority": "P0",
    "namespace": "hackathon",
    "created_at": "2025-11-04T10:30:01.000Z"
  },
  {
    "id": 3,
    "pod_name": "dashboard",
    "error_type": "ImagePullBackOff",
    "error_message": "Failed to pull image 'nginx:invalid-tag-demo'",
    "priority": "P1",
    "namespace": "hackathon",
    "created_at": "2025-11-04T10:30:02.000Z"
  }
]
```

### Get Specific Pod Details
```bash
# Get dashboard pod details with errors
curl http://localhost:3000/api/pods/1/errors | jq '.'

# Response includes ai_resolution_status and ai_resolution_steps
```

### Update AI Resolution Status
```bash
# Simulate AI updating resolution status
curl -X PATCH http://localhost:3000/api/errors/1/ai-status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "analyzing",
    "steps": [
      {
        "step": "Analyzing error logs",
        "status": "in_progress",
        "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
      }
    ]
  }'
```

---

## Step 11: Demo Video Recording Commands

### Pre-Recording Setup
```bash
# Terminal 1: Backend (already running)
cd /Users/gojangra/Desktop/code/hackathon/backend
npm run dev

# Terminal 2: Frontend (already running)
cd /Users/gojangra/Desktop/code/hackathon/frontend
npm run dev

# Terminal 3: Clean slate
kubectl delete namespace hackathon --wait=true
cd /Users/gojangra/Desktop/code/hackathon/test
node hackathonDemo.js

# Terminal 4: Agent (start when recording)
cd /Users/gojangra/Desktop/code/hackathon/agent
# DON'T START YET - start this when you begin recording

# Terminal 5: For live kubectl commands during demo
cd /Users/gojangra/Desktop/code/hackathon
```

### Recording Flow
```bash
# 1. Start recording
# 2. Start agent in Terminal 4:
node index.js --namespace=hackathon

# 3. Open browser:
open http://localhost:5173

# 4. Wait 15 seconds for first agent update

# 5. Show dashboard overview (30 seconds)
# - Point to gradient header
# - Show stats: 5 pods, 4 healthy, 1 error (dashboard)
# - Show live indicator
# - Point out 3 green pods (oidc-server, proxy, redis)
# - "Postgres is running healthy... for now"

# 6. Click dashboard pod (60 seconds)
# - Watch AI resolution animate
# - **KEY:** Point out commands appearing line-by-line with 1-sec delays
# - "Notice each command executes one at a time, in real-time"
# - Show kubectl commands
# - Emphasize "fully automated, like Copilot for Kubernetes"

# 7. Wait and watch postgres (20 seconds)
# - "Let's wait for the postgres pod..."
# - Show it running healthy
# - At ~50 second mark: "There it goes - P0 error!"
# - Postgres card turns red

# 8. Click postgres pod (60 seconds)
# - Show AI attempting fixes
# - **KEY:** "Watch AI try commands line-by-line"
# - Point out diagnostic commands executing
# - "AI recognizes this is beyond auto-fix"
# - Point out "Manual Required" status
# - Emphasize P0 badge (red pulsing)
# - "AI knows its limits - smart escalation"

# 9. Show Critical Errors sidebar (15 seconds)
# - Point to P0 badge on postgres
# - Show only 2 total errors
# - "No spam, no duplicates - clean and focused"

# 10. Show live kubectl (10 seconds)
# In Terminal 5:
kubectl get pods -n hackathon
# Show 3 healthy, 1 error (dashboard may be fixed), 1 P0 error (postgres)

# 11. Wrap up (15 seconds)
# - "Real-time monitoring with AI agent"
# - "Commands execute line-by-line, like Copilot"
# - "Smart escalation when AI can't safely fix"
# - "Only 2 errors, no spam, saves hours"
# - "Questions?"
```

---

## Cleanup Commands

```bash
# Stop all services
# Press Ctrl+C in each terminal running services

# Delete Kubernetes namespace
kubectl delete namespace hackathon

# Clear database (optional)
mysql -u monitoring_user -pmonitoring123 monitoring -e "
DELETE FROM errors;
DELETE FROM pods;
DELETE FROM namespaces;
"

# Reset database (if needed)
cd /Users/gojangra/Desktop/code/hackathon/backend
mysql -u monitoring_user -pmonitoring123 monitoring < schema.sql
mysql -u monitoring_user -pmonitoring123 monitoring < update-schema.sql
```

---

## Troubleshooting Commands

### Backend Not Responding
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check backend logs
cd /Users/gojangra/Desktop/code/hackathon/backend
npm run dev

# Test database connection
mysql -u monitoring_user -pmonitoring123 monitoring -e "SELECT 1;"
```

### Frontend Not Loading
```bash
# Check if frontend is running
curl http://localhost:5173

# Restart frontend
cd /Users/gojangra/Desktop/code/hackathon/frontend
npm run dev

# Check for component errors
ls -la src/components/
# Should show: AIResolutionPanel.jsx, ErrorModal.jsx, PriorityBadge.jsx
```

### Pods Not Appearing
```bash
# Check if namespace exists
kubectl get namespace hackathon

# Check if pods exist
kubectl get pods -n hackathon

# Recreate pods
cd /Users/gojangra/Desktop/code/hackathon/test
node hackathonDemo.js

# Check pod details
kubectl describe pods -n hackathon
```

### Agent Not Sending Data
```bash
# Check agent logs
# Should show "✓ Successfully sent update to backend" every 10 seconds

# Test agent manually
cd /Users/gojangra/Desktop/code/hackathon/agent
node index.js --namespace=hackathon

# Check backend received data
curl http://localhost:3000/api/namespaces | jq '.'
curl http://localhost:3000/api/pods | jq '.'
```

### Database Schema Issues
```bash
# Verify schema has new columns
mysql -u monitoring_user -pmonitoring123 monitoring -e "DESCRIBE errors;"

# If missing, reapply schema updates
cd /Users/gojangra/Desktop/code/hackathon/backend
mysql -u monitoring_user -pmonitoring123 monitoring < update-schema.sql

# Check for errors
mysql -u monitoring_user -pmonitoring123 monitoring -e "SHOW WARNINGS;"
```

---

## Quick Reference

### Essential URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Backend Health: http://localhost:3000/health
- API Docs: http://localhost:3000/api/docs (if configured)

### Essential Kubectl Commands
```bash
# Get all pods
kubectl get pods -n hackathon

# Watch pods in real-time
kubectl get pods -n hackathon -w

# Describe specific pod
kubectl describe pod <pod-name> -n hackathon

# View pod logs
kubectl logs <pod-name> -n hackathon

# Delete namespace
kubectl delete namespace hackathon
```

### Essential API Endpoints
```bash
# Get all namespaces
curl http://localhost:3000/api/namespaces

# Get all pods
curl http://localhost:3000/api/pods

# Get recent errors
curl http://localhost:3000/api/errors/recent

# Get specific pod errors
curl http://localhost:3000/api/pods/:id/errors
```

---

**🎬 You're ready to create an amazing demo! Good luck! 🚀**
