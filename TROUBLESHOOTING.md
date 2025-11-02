# Troubleshooting Guide

Common issues and their solutions for the Kubernetes Pod Monitoring System.

## 🔴 Backend Issues

### Issue: "Database connection failed"

**Symptoms:**
```
❌ Database connection failed: ER_ACCESS_DENIED_ERROR
```

**Solutions:**
1. Check MySQL is running:
   ```bash
   mysql -u root -p -e "SELECT 1"
   ```

2. Verify credentials in `backend/.env`:
   ```env
   DB_HOST=localhost
   DB_USER=monitor_user
   DB_PASSWORD=StrongPassword123!
   DB_NAME=monitoring
   ```

3. Grant permissions:
   ```sql
   GRANT ALL PRIVILEGES ON monitoring.* TO 'monitor_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Issue: "Port 3000 already in use"

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. Find and kill the process:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. Or change the port in `backend/.env`:
   ```env
   PORT=3001
   ```

### Issue: "Cannot find module 'express'"

**Symptoms:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Issue: "CORS error in browser console"

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
Backend already has CORS enabled. Check:
1. Backend is running
2. Frontend is using correct API URL in `.env`
3. Clear browser cache

---

## 🔵 Frontend Issues

### Issue: "Blank dashboard / No data showing"

**Symptoms:**
- Dashboard loads but shows empty
- "No namespaces found"

**Solutions:**
1. Check backend is running:
   ```bash
   curl http://localhost:3000/health
   ```

2. Check browser console for errors (F12)

3. Verify API URL in `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

4. Create test data:
   ```bash
   cd test
   node simulatePods.js test-namespace
   ```

5. Start an agent:
   ```bash
   cd agent
   node index.js --namespace=test-namespace
   ```

### Issue: "npm run dev fails"

**Symptoms:**
```
Error: Cannot find module '@vitejs/plugin-react'
```

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Styles not working / No Tailwind"

**Symptoms:**
- Plain HTML without styling
- Classes not applied

**Solutions:**
1. Restart dev server:
   ```bash
   npm run dev
   ```

2. Check `tailwindcss` is installed:
   ```bash
   npm list tailwindcss
   ```

3. Reinstall if needed:
   ```bash
   npm install -D tailwindcss
   ```

---

## 🟢 Agent Issues

### Issue: "kubectl not found"

**Symptoms:**
```
❌ kubectl not found. Please install kubectl to use this agent.
```

**Solutions:**
1. Install kubectl:
   - **macOS**: `brew install kubectl`
   - **Linux**: See [kubectl docs](https://kubernetes.io/docs/tasks/tools/)
   - **Windows**: Download from Kubernetes website

2. Verify installation:
   ```bash
   kubectl version --client
   ```

### Issue: "Namespace not found"

**Symptoms:**
```
⚠️  Namespace 'jira-tracker' not found
```

**Solutions:**
1. List available namespaces:
   ```bash
   kubectl get namespaces
   ```

2. Create test namespace:
   ```bash
   cd test
   node simulatePods.js jira-tracker
   ```

3. Or create manually:
   ```bash
   kubectl create namespace jira-tracker
   ```

### Issue: "Cannot connect to backend"

**Symptoms:**
```
❌ Cannot connect to backend at http://localhost:3000
```

**Solutions:**
1. Check backend is running:
   ```bash
   curl http://localhost:3000/health
   ```

2. Check `agent/.env`:
   ```env
   BACKEND_URL=http://localhost:3000
   ```

3. Check firewall isn't blocking connections

### Issue: "Agent crashes immediately"

**Symptoms:**
- Agent starts then exits
- No error message

**Solutions:**
1. Run with full output:
   ```bash
   node index.js --namespace=test 2>&1 | tee agent.log
   ```

2. Check kubectl access:
   ```bash
   kubectl cluster-info
   kubectl get pods --all-namespaces
   ```

3. Verify Node.js version:
   ```bash
   node --version  # Should be 18+
   ```

---

## 🟡 Test Simulator Issues

### Issue: "Cannot create namespace"

**Symptoms:**
```
❌ Error creating namespace: Forbidden
```

**Solutions:**
1. Check kubectl permissions:
   ```bash
   kubectl auth can-i create namespaces
   ```

2. Use a different kubeconfig:
   ```bash
   export KUBECONFIG=~/.kube/config
   ```

3. Ask cluster admin for permissions

### Issue: "Pods stuck in Pending state"

**Symptoms:**
```
NAME                    STATUS    
jira-tracker-web-pod    Pending
```

**Solutions:**
1. Check pod details:
   ```bash
   kubectl describe pod jira-tracker-web-pod -n jira-tracker
   ```

2. Common causes:
   - Insufficient cluster resources
   - Image pull issues
   - Node selector constraints

3. Wait a bit (pods may take time to schedule)

### Issue: "Simulator creates pods but no logs"

**Symptoms:**
- Pods created successfully
- No log messages appearing

**Solution:**
This is expected behavior! The simulator shows local simulation of logs. To see actual pod logs:
```bash
kubectl logs <pod-name> -n <namespace>
```

---

## 🔧 General Issues

### Issue: "Node modules not found after git clone"

**Solution:**
Run setup script or install manually:
```bash
./setup.sh

# Or manually:
cd backend && npm install
cd ../frontend && npm install
cd ../agent && npm install
cd ../test && npm install
```

### Issue: "Everything installed but nothing works"

**Checklist:**

1. ✅ MySQL running?
   ```bash
   mysql -u root -p -e "SELECT 1"
   ```

2. ✅ Database created?
   ```bash
   mysql -u root -p -e "SHOW DATABASES LIKE 'monitoring'"
   ```

3. ✅ Schema imported?
   ```bash
   mysql -u monitor_user -p monitoring -e "SHOW TABLES"
   ```

4. ✅ Backend running?
   ```bash
   curl http://localhost:3000/health
   ```

5. ✅ Frontend running?
   - Check http://localhost:5173

6. ✅ Test data exists?
   ```bash
   kubectl get namespaces | grep jira-tracker
   ```

7. ✅ Agent running?
   ```bash
   ps aux | grep "node.*index.js"
   ```

### Issue: "High CPU usage"

**Possible causes:**
1. Agent check interval too short
   - Edit `agent/.env`: `CHECK_INTERVAL=30000` (30 seconds)

2. Too many agents running
   ```bash
   ps aux | grep node | grep -v grep
   killall node  # Stop all
   ```

3. Frontend refresh too frequent
   - Edit interval in `frontend/src/App.jsx`

### Issue: "MySQL database growing too large"

**Solution:**
Clean old errors periodically:
```sql
DELETE FROM errors WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

Or add to backend as scheduled task.

---

## 📞 Getting Help

If none of these solutions work:

1. **Check Logs:**
   - Backend: Terminal output
   - Frontend: Browser console (F12)
   - Agent: Terminal output

2. **Verify Versions:**
   ```bash
   node --version    # Should be 18+
   npm --version
   mysql --version
   kubectl version
   ```

3. **Clean Restart:**
   ```bash
   # Stop everything
   killall node
   
   # Clean install
   cd backend && rm -rf node_modules && npm install
   cd ../frontend && rm -rf node_modules && npm install
   cd ../agent && rm -rf node_modules && npm install
   
   # Restart
   cd ../backend && npm start &
   cd ../frontend && npm run dev &
   cd ../agent && node index.js --namespace=test &
   ```

4. **Check Component READMEs:**
   - `backend/README.md`
   - `frontend/README.md`
   - `agent/README.md`
   - `test/README.md`

---

## 🐛 Debug Mode

### Enable Verbose Logging

**Backend:**
```javascript
// In backend/index.js, add:
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});
```

**Agent:**
Add more console.log statements in critical sections.

**Frontend:**
Check Network tab in browser DevTools (F12).

---

## ✅ Health Check Commands

Quick commands to verify everything is working:

```bash
# MySQL
mysql -u monitor_user -p monitoring -e "SELECT COUNT(*) FROM namespaces"

# Backend
curl http://localhost:3000/health

# Frontend
curl http://localhost:5173

# Kubectl
kubectl cluster-info

# Agent (check if running)
ps aux | grep "node.*index.js" | grep -v grep

# Check ports
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :3306  # MySQL
```

---

## 🎯 Quick Reset

If everything is broken and you want to start fresh:

```bash
# 1. Stop all processes
killall node

# 2. Drop and recreate database
mysql -u root -p -e "DROP DATABASE IF EXISTS monitoring"
mysql -u root -p < backend/schema.sql

# 3. Clean install all dependencies
cd backend && rm -rf node_modules && npm install && cd ..
cd frontend && rm -rf node_modules && npm install && cd ..
cd agent && rm -rf node_modules && npm install && cd ..

# 4. Delete test Kubernetes resources
kubectl delete namespace jira-tracker --ignore-not-found
kubectl delete namespace vimana --ignore-not-found

# 5. Start fresh
cd backend && npm start
# In new terminal:
cd frontend && npm run dev
# In new terminal:
cd test && node simulatePods.js test-ns
# In new terminal:
cd agent && node index.js --namespace=test-ns
```

---

**Last updated:** November 2025  
**For more help:** Check main README.md and component-specific documentation.
