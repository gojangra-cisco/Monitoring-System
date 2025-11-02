const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== AGENT ENDPOINTS ====================

/**
 * POST /api/agent/update
 * Receives updates from monitoring agents
 * Body: {
 *   namespace: string,
 *   pods: [{
 *     name: string,
 *     status: 'running' | 'error',
 *     errors?: [{
 *       message: string,
 *       type: string
 *     }]
 *   }]
 * }
 */
app.post('/api/agent/update', async (req, res) => {
  const { namespace, pods } = req.body;

  if (!namespace || !pods || !Array.isArray(pods)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  try {
    // Get or create namespace
    const [nsRows] = await db.query(
      'INSERT INTO namespaces (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
      [namespace]
    );
    const namespaceId = nsRows.insertId;

    // Process each pod
    for (const pod of pods) {
      // Insert or update pod
      const [podRows] = await db.query(
        `INSERT INTO pods (name, namespace_id, status, last_check) 
         VALUES (?, ?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE status=?, last_check=NOW()`,
        [pod.name, namespaceId, pod.status, pod.status]
      );

      const podId = podRows.insertId || (await db.query(
        'SELECT id FROM pods WHERE name=? AND namespace_id=?',
        [pod.name, namespaceId]
      ))[0][0].id;

      // Insert errors if any
      if (pod.errors && Array.isArray(pod.errors)) {
        for (const error of pod.errors) {
          await db.query(
            'INSERT INTO errors (pod_id, message, error_type) VALUES (?, ?, ?)',
            [podId, error.message, error.type || 'unknown']
          );
        }
      }
    }

    res.json({ success: true, message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error processing agent update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FRONTEND ENDPOINTS ====================

/**
 * GET /api/namespaces
 * Returns all monitored namespaces
 */
app.get('/api/namespaces', async (req, res) => {
  try {
    const [namespaces] = await db.query(
      'SELECT id, name, created_at, updated_at FROM namespaces ORDER BY name'
    );
    res.json(namespaces);
  } catch (error) {
    console.error('Error fetching namespaces:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/namespaces/:id/pods
 * Returns all pods in a namespace with their latest status
 */
app.get('/api/namespaces/:id/pods', async (req, res) => {
  const { id } = req.params;

  try {
    const [pods] = await db.query(
      `SELECT 
        p.id, 
        p.name, 
        p.status, 
        p.last_check,
        COUNT(e.id) as error_count
       FROM pods p
       LEFT JOIN errors e ON p.id = e.pod_id AND e.timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
       WHERE p.namespace_id = ?
       GROUP BY p.id, p.name, p.status, p.last_check
       ORDER BY p.name`,
      [id]
    );
    res.json(pods);
  } catch (error) {
    console.error('Error fetching pods:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/pods/:id/errors
 * Returns recent errors for a specific pod
 */
app.get('/api/pods/:id/errors', async (req, res) => {
  const { id } = req.params;
  const limit = req.query.limit || 50;

  try {
    const [errors] = await db.query(
      `SELECT id, message, error_type, timestamp 
       FROM errors 
       WHERE pod_id = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [id, parseInt(limit)]
    );
    res.json(errors);
  } catch (error) {
    console.error('Error fetching errors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dashboard/stats
 * Returns overall statistics for the dashboard
 */
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(DISTINCT n.id) as total_namespaces,
        COUNT(DISTINCT p.id) as total_pods,
        SUM(CASE WHEN p.status = 'running' THEN 1 ELSE 0 END) as running_pods,
        SUM(CASE WHEN p.status = 'error' THEN 1 ELSE 0 END) as error_pods,
        COUNT(DISTINCT e.id) as total_errors_today
      FROM namespaces n
      LEFT JOIN pods p ON n.id = p.namespace_id
      LEFT JOIN errors e ON p.id = e.pod_id AND DATE(e.timestamp) = CURDATE()
    `);
    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/errors/recent
 * Returns most recent errors across all namespaces
 */
app.get('/api/errors/recent', async (req, res) => {
  const limit = req.query.limit || 20;

  try {
    const [errors] = await db.query(
      `SELECT 
        e.id,
        e.message,
        e.error_type,
        e.timestamp,
        p.name as pod_name,
        n.name as namespace_name
       FROM errors e
       JOIN pods p ON e.pod_id = p.id
       JOIN namespaces n ON p.namespace_id = n.id
       ORDER BY e.timestamp DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    res.json(errors);
  } catch (error) {
    console.error('Error fetching recent errors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
