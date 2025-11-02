# Using Existing Kubernetes Namespaces

## Your Existing Setup

You already have a production namespace `vimana` with real pods running:

```bash
kubectl get pods -n vimana
```

Shows 11 pods including:
- vimana-dev-dashboard
- vimana-dev-oidc-server (2 replicas)
- vimana-dev-postgresql (primary + standby)
- vimana-dev-proxy (3 replicas)
- vimana-dev-redis (master + 2 replicas)

## Option 1: Monitor Your Real Namespace

You can monitor your actual `vimana` namespace instead of creating test pods:

```bash
# Start the agent for your real namespace
cd agent
node index.js --namespace=vimana
```

This will:
- Monitor all 11 pods in real-time
- Detect any actual errors in logs
- Report status to the dashboard

## Option 2: Create Test Namespaces

Use the simulator to create separate test namespaces for demos:

```bash
# Create test namespaces (won't affect vimana)
cd test

# Test namespace 1
node simulatePods.js jira-tracker

# Test namespace 2  
node simulatePods.js test-demo

# Test namespace 3
node simulatePods.js staging-env
```

## Recommended Demo Setup

### For Hackathon Demo:

**Use BOTH approaches:**

1. **Real Production Data** (Impressive!):
   ```bash
   # Terminal 1: Monitor real vimana namespace
   cd agent
   node index.js --namespace=vimana
   ```
   - Shows you can monitor real production pods
   - Demonstrates real-world applicability
   - More impressive to judges

2. **Test Environment** (Controlled):
   ```bash
   # Terminal 2: Create test namespace
   cd test
   node simulatePods.js jira-tracker
   
   # Terminal 3: Monitor test namespace
   cd agent
   node index.js --namespace=jira-tracker
   ```
   - Controlled error simulation
   - Shows multi-namespace support
   - Easy to demonstrate features

### Demo Flow:

1. **Start with empty dashboard**
   
2. **Show real monitoring first:**
   - Start agent for `vimana`
   - Dashboard shows 11 real production pods
   - "This is monitoring our actual production environment"
   
3. **Add test environment:**
   - Create `jira-tracker` with simulator
   - Start second agent
   - "Now we're monitoring multiple namespaces simultaneously"
   
4. **Highlight features:**
   - Switch between namespaces in UI
   - Show error detection on test pods
   - Show all pods in aggregate stats

## Current Namespace Status

### Vimana (Production)
- **Pods:** 11 total
- **Status:** Mostly running (1 Completed)
- **Restarts:** Some pods have restarted (good for showing error detection)

### Can Monitor Immediately
```bash
cd /Users/gojangra/Desktop/code/hackathon/agent
node index.js --namespace=vimana
```

Then open dashboard: http://localhost:5173

You'll see all your real pods appear!

## Cleanup After Demo

**Don't delete vimana** (it's your production namespace!)

Only delete test namespaces:
```bash
kubectl delete namespace jira-tracker
kubectl delete namespace test-demo
kubectl delete namespace staging-env
```

## Pro Tips

1. **Use Real Data for Impact:**
   - Shows it works with actual Kubernetes
   - More impressive than test data
   - Demonstrates real-world value

2. **Use Test Data for Control:**
   - Guaranteed errors to show
   - Can simulate crashes
   - Easy to start/stop

3. **Combine Both:**
   - "Here's production monitoring" (vimana)
   - "Let me show multi-namespace" (add test)
   - "See how it scales" (both visible)

## Important Notes

⚠️ **Never delete vimana namespace** - it's your production environment!

✅ **Agent is read-only** - safe to monitor production

✅ **Test simulator is isolated** - won't affect vimana

✅ **Dashboard aggregates both** - shows total picture
