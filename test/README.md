# Kubernetes Pod Simulator

This utility creates test Kubernetes pods with simulated logs for testing the monitoring system.

## Usage

```bash
# Simulate pods in default namespace (jira-tracker)
node simulatePods.js

# Or use npm script
npm run simulate

# Simulate pods in custom namespace
node simulatePods.js vimana
```

## What it does

1. **Deletes existing namespace** (if present)
2. **Creates a new namespace** (e.g., jira-tracker)
3. **Deploys 3 test pods** with names like:
   - `jira-tracker-web-pod`
   - `jira-tracker-api-pod`
   - `jira-tracker-worker-pod`
4. **Generates logs** every 3 seconds with:
   - 85% "OK" messages (normal operation)
   - 15% error messages (CrashLoopBackOff, OOMKilled, etc.)
   - Simulates pod crashes after 3 consecutive errors

## Requirements

- kubectl installed and configured
- Access to Kubernetes cluster
- Proper permissions to create/delete namespaces

## Cleanup

To remove the test namespace and all pods:

```bash
kubectl delete namespace jira-tracker
```

Or for custom namespace:

```bash
kubectl delete namespace <your-namespace>
```
