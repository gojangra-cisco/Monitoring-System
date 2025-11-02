# Kubernetes Pod Monitoring Backend

Node.js + Express + MySQL backend API for the Kubernetes pod monitoring system.

## Features

- REST API for agent updates
- REST API for dashboard data
- MySQL database for storing namespaces, pods, and errors
- Real-time pod status tracking
- Error log aggregation

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Database

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=monitor_user
DB_PASSWORD=StrongPassword123!
DB_NAME=monitoring
PORT=3000
```

### 3. Create Database and Schema

**Option A: Using MySQL CLI**

```bash
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE monitoring;
CREATE USER 'monitor_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON monitoring.* TO 'monitor_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
mysql -u monitor_user -p monitoring < schema.sql
```

**Option B: Using MySQL root**

```bash
mysql -u root -p < schema.sql
```

### 4. Start the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

The server will start on `http://localhost:3000`.

## API Endpoints

### Agent Endpoints

#### POST `/api/agent/update`

Receives updates from monitoring agents.

**Request Body:**
```json
{
  "namespace": "jira-tracker",
  "pods": [
    {
      "name": "web-pod",
      "status": "running",
      "errors": [
        {
          "message": "Error: connection timeout",
          "type": "Error"
        }
      ]
    }
  ]
}
```

### Frontend Endpoints

#### GET `/api/namespaces`

Returns all monitored namespaces.

#### GET `/api/namespaces/:id/pods`

Returns all pods in a specific namespace.

#### GET `/api/pods/:id/errors`

Returns errors for a specific pod.

**Query Parameters:**
- `limit` - Number of errors to return (default: 50)

#### GET `/api/dashboard/stats`

Returns overall statistics.

**Response:**
```json
{
  "total_namespaces": 2,
  "total_pods": 6,
  "running_pods": 4,
  "error_pods": 2,
  "total_errors_today": 15
}
```

#### GET `/api/errors/recent`

Returns most recent errors across all namespaces.

**Query Parameters:**
- `limit` - Number of errors to return (default: 20)

### Health Check

#### GET `/health`

Returns server health status.

## Database Schema

### Tables

- **namespaces** - Stores Kubernetes namespaces
- **pods** - Stores pod information and status
- **errors** - Stores error logs from pods

See `schema.sql` for complete schema definition.

## Requirements

- Node.js 18+
- MySQL 8.0+
- npm or yarn

## Troubleshooting

### Database Connection Failed

Make sure MySQL is running and credentials in `.env` are correct:

```bash
# Check MySQL status
mysql -u monitor_user -p -e "SELECT 1"
```

### Port Already in Use

Change the port in `.env`:

```env
PORT=3001
```
