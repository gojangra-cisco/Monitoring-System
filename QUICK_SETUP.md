# Quick Setup for Demo

## ✅ Agent is Working!

Your agent successfully detected all 11 pods in the `vimana` namespace!

Now you just need to start the backend and frontend.

## Step 1: Setup Database (One-time)

```bash
# Create the database and schema
mysql -u root -p < backend/schema.sql

# Or if you prefer to do it manually:
mysql -u root -p
```

Then in MySQL:
```sql
CREATE DATABASE IF NOT EXISTS monitoring;
USE monitoring;
SOURCE backend/schema.sql;
EXIT;
```

## Step 2: Configure Backend

```bash
cd backend

# Create .env file (if not exists)
cp .env.example .env

# Edit if needed (default should work)
# DB_HOST=localhost
# DB_USER=root  # or monitor_user if you created it
# DB_PASSWORD=your_mysql_password
# DB_NAME=monitoring
# PORT=3000
```

## Step 3: Install Dependencies (if not done)

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Agent
cd ../agent
npm install
```

## Step 4: Start Everything

### Terminal 1: Backend
```bash
cd backend
npm start
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

### Terminal 3: Agent (Your Real Vimana Namespace!)
```bash
cd agent
node index.js --namespace=vimana
```

### Terminal 4: (Optional) Test Namespace
```bash
cd test
node simulatePods.js jira-tracker
```

### Terminal 5: (Optional) Second Agent
```bash
cd agent
node index.js --namespace=jira-tracker
```

## Step 5: Open Dashboard

Open in browser: **http://localhost:5173**

You should see:
- Your 11 real vimana pods
- Real-time status updates
- Beautiful dashboard!

## Troubleshooting

### Database Error
If you get database errors, you may need to create the user:

```sql
CREATE USER 'monitor_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON monitoring.* TO 'monitor_user'@'localhost';
FLUSH PRIVILEGES;
```

Or just use root user in your `.env`:
```env
DB_USER=root
DB_PASSWORD=your_root_password
```

### Backend 500 Error
This is what you're seeing now - means backend needs database.

Once database is set up, backend will work!

## Quick Test After Setup

```bash
# Test backend
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"..."}
```

## Demo Ready Checklist

- [ ] MySQL running
- [ ] Database created
- [ ] Backend started (Terminal 1)
- [ ] Frontend started (Terminal 2)
- [ ] Agent monitoring vimana (Terminal 3)
- [ ] Dashboard showing 11 pods
- [ ] 🎉 Ready to demo!
