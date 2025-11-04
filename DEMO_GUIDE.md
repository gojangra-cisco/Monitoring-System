# 🎬 Hackathon Demo Guide

## Quick Start

### Option 1: Automated Setup (Recommended)
```bash
cd /Users/gojangra/Desktop/code/hackathon
./setup-demo.sh
```

### Option 2: Manual Setup

1. **Start Backend** (Terminal 1):
```bash
cd backend
npm run dev
```

2. **Start Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

3. **Create Demo Pods** (Terminal 3):
```bash
cd test
node hackathonDemo.js
```

4. **Start Monitoring Agent** (Terminal 4):
```bash
cd agent
node index.js --namespace=hackathon
```

5. **Open Dashboard**:
   - Navigate to: http://localhost:5173

---

## 🎯 Demo Scenario

The demo creates a **hackathon** namespace with 5 pods:

### Pod Overview:

1. **🔴 dashboard** - ImagePullBackOff Error
   - **Status**: Error (Invalid image name)
   - **AI Resolution**: ✅ Can be fixed automatically
   - **Demo Flow**: Click on dashboard → Watch AI agent resolve in real-time

2. **🔴 oidc-server** - P0 Configuration Error  
   - **Status**: CrashLoopBackOff
   - **Priority**: P0 (Critical)
   - **Error**: Missing OIDC_CLIENT_SECRET environment variable
   - **Demo Flow**: Shows in Critical Errors sidebar with P0 badge

3. **🟢 proxy** - Healthy
   - **Status**: Running
   - **Purpose**: Shows healthy pod comparison

4. **🟢 redis** - Healthy
   - **Status**: Running  
   - **Purpose**: Shows healthy pod comparison

5. **🔴 postgres** - P0 Data Corruption
   - **Status**: CrashLoopBackOff
   - **Priority**: P0 (Critical)
   - **AI Resolution**: ❌ Cannot fix (requires manual DBA intervention)
   - **Demo Flow**: Click on postgres → See AI attempt and escalate to manual

---

## 🎨 Demo Walkthrough

### Part 1: Dashboard Overview (30 seconds)
1. Open http://localhost:5173
2. Show the beautiful gradient UI with stats cards:
   - 1 Namespace
   - 5 Total Pods
   - 2 Healthy Pods
   - 3 Error Pods
3. Point out the "Live" indicator (green pulsing dot)

### Part 2: AI Resolution - Dashboard Pod (60 seconds)
1. Click on the **dashboard** pod (red border, ImagePullBackOff status)
2. Modal opens showing:
   - **AI Agent Resolution Panel** with real-time steps:
     - ✅ Analyzing Error
     - ✅ Searching Solutions  
     - ⚙️ Generating Fix (shows kubectl command)
     - 🚀 Applying Solution
     - ✅ Verification
   - Watch the progress indicators animate
   - Show the kubectl commands AI would run
3. Explain: "AI detected invalid image, replaced with nginx:latest"

### Part 3: Manual Escalation - Postgres Pod (45 seconds)
1. Click on the **postgres** pod (red border, CrashLoopBackOff)
2. Modal shows:
   - **AI Agent Resolution Panel** attempting fixes
   - All steps complete but showing "Manual Required"
   - Yellow warning: "AI cannot safely resolve data corruption"
   - **P0 Priority Badge** prominently displayed
3. Explain: "AI knows its limits, escalates critical issues requiring human expertise"

### Part 4: Critical Errors Sidebar (30 seconds)
1. Show the left sidebar "Critical Errors" section
2. Point out:
   - **P0 badges** on critical errors (pulsing red)
   - oidc-server error listed with priority
   - Real-time error feed
   - "🤖 AI Active" badges on errors being processed

### Part 5: Real-Time Updates (20 seconds)
1. Show the "Live" indicator
2. Explain: "Dashboard auto-refreshes every 5 seconds"
3. If time permits, run: `kubectl get pods -n hackathon` to show K8s alignment

---

## 🎭 Talking Points

### For Dashboard Pod (AI Success):
> "Our AI agent detected an ImagePullBackOff error caused by an invalid image name. It automatically searched our knowledge base, found the correct image, and would apply the fix using kubectl. This is the kind of repetitive task that wastes developer time—now solved in seconds."

### For Postgres Pod (AI Escalation):
> "Here's where our AI shows intelligence—it attempted auto-recovery procedures but recognized data corruption requires careful human judgment. Instead of making things worse, it escalates to a DBA with full context. Smart AI knows when NOT to act."

### For Priority System:
> "Not all errors are equal. P0 errors like authentication failures or data corruption get immediate attention, while P2 warnings can wait. Our AI triages automatically."

### For Real-Time Monitoring:
> "Everything updates in real-time. When a pod fails, we know instantly. When AI fixes it, we see the resolution steps. This gives teams confidence and visibility."

---

## 🛠️ Troubleshooting

### Database Connection Issues:
```bash
cd backend
mysql -u monitoring_user -pmonitoring123 -e "USE monitoring; SOURCE update-schema.sql;"
```

### Pods Not Appearing:
```bash
# Check if namespace exists
kubectl get namespace hackathon

# Recreate if needed
cd test
node hackathonDemo.js
```

### Frontend Not Loading:
```bash
cd frontend
npm install
npm run dev
```

### Backend Errors:
```bash
cd backend  
# Check logs
npm run dev

# Verify .env file has:
# DB_USER=monitoring_user
# DB_PASSWORD=monitoring123
```

---

## 📊 Metrics to Highlight

- **5 pods** across different states (error, healthy)
- **3 error types** (ImagePull, Config, Data Corruption)
- **2 priority levels** (P0 critical, P2 normal)
- **AI resolution** in <30 seconds for solvable issues
- **Real-time updates** every 5 seconds
- **Intelligent escalation** for unsolvable problems

---

## 🧹 Cleanup

After the demo:
```bash
# Stop agent (Ctrl+C in agent terminal)

# Delete Kubernetes resources
kubectl delete namespace hackathon

# Stop backend/frontend (Ctrl+C in their terminals)
```

---

## 💡 Pro Tips

1. **Practice the flow** 2-3 times before the demo
2. **Have kubectl commands ready** in another terminal to show "behind the scenes"
3. **Keep the demo under 3 minutes** - focus on wow moments
4. **Emphasize the AI agent UI** - it's the key differentiator
5. **Show confidence** - the UI is beautiful, let it shine!

---

## 🎯 Key Differentiators

1. **Beautiful, Modern UI** - Gradients, animations, professional design
2. **AI-Powered Resolution** - Copilot-like step-by-step fixes
3. **Intelligent Prioritization** - P0/P1/P2 badges, automatic triage
4. **Real-Time Monitoring** - Live updates, no manual refresh
5. **Smart Escalation** - AI knows when to ask for human help

---

Good luck with your demo! 🚀
