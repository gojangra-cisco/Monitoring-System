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
    // Check if namespace exists
    const [existingNs] = await db.query(
      'SELECT id FROM namespaces WHERE name = ?',
      [namespace]
    );

    // If no pods and namespace exists, it means namespace was deleted - remove it
    if (pods.length === 0 && existingNs.length > 0) {
      const namespaceId = existingNs[0].id;
      
      console.log(`🗑️  Namespace ${namespace} has no pods, removing from database...`);
      
      // Delete errors for all pods in this namespace
      await db.query(`
        DELETE e FROM errors e
        JOIN pods p ON e.pod_id = p.id
        WHERE p.namespace_id = ?
      `, [namespaceId]);

      // Delete all pods in this namespace
      await db.query('DELETE FROM pods WHERE namespace_id = ?', [namespaceId]);

      // Delete the namespace
      await db.query('DELETE FROM namespaces WHERE id = ?', [namespaceId]);

      return res.json({ success: true, message: 'Namespace removed (no pods found)' });
    }

    // If no pods and namespace doesn't exist, nothing to do
    if (pods.length === 0) {
      return res.json({ success: true, message: 'No pods to update' });
    }

    // Get or create namespace (only if we have pods)
    const [nsRows] = await db.query(
      'INSERT INTO namespaces (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), updated_at=NOW()',
      [namespace]
    );
    const namespaceId = nsRows.insertId || existingNs[0].id;

    // Get current pods in database for this namespace
    const [currentPods] = await db.query(
      'SELECT name FROM pods WHERE namespace_id = ?',
      [namespaceId]
    );
    
    const currentPodNames = new Set(currentPods.map(p => p.name));
    const newPodNames = new Set(pods.map(p => p.name));
    
    // Delete pods that no longer exist in Kubernetes
    for (const podName of currentPodNames) {
      if (!newPodNames.has(podName)) {
        console.log(`🗑️  Removing deleted pod: ${podName}`);
        await db.query(
          'DELETE FROM pods WHERE name = ? AND namespace_id = ?',
          [podName, namespaceId]
        );
      }
    }

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

      // Insert errors if any - but only ONE error per pod per type (no duplicates)
      if (pod.errors && Array.isArray(pod.errors) && pod.errors.length > 0) {
        const error = pod.errors[0]; // Take only the FIRST error
        
        // Check if this exact error already exists for this pod
        const [existingErrors] = await db.query(
          'SELECT id FROM errors WHERE pod_id = ? AND error_type = ? AND message = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 1 MINUTE)',
          [podId, error.type || 'unknown', error.message]
        );

        // Only insert if this specific error doesn't exist in the last minute
        if (existingErrors.length === 0) {
          // Determine priority based on error message
          let priority = 'P2'; // default
          const errorMsg = error.message.toLowerCase();
          if (errorMsg.includes('p0') || errorMsg.includes('critical') || errorMsg.includes('fatal') || errorMsg.includes('corruption')) {
            priority = 'P0';
          } else if (errorMsg.includes('p1') || errorMsg.includes('error:') || errorMsg.includes('image')) {
            priority = 'P1';
          }

          // Determine AI resolution status
          let aiStatus = 'not_started';
          if (pod.name === 'dashboard' && errorMsg.includes('image')) {
            aiStatus = 'analyzing'; // Will be updated by AI resolution process
          } else if (pod.name === 'postgres' && errorMsg.includes('corruption')) {
            aiStatus = 'analyzing'; // Will attempt to fix
          }

          await db.query(
            'INSERT INTO errors (pod_id, message, error_type, priority, ai_resolution_status) VALUES (?, ?, ?, ?, ?)',
            [podId, error.message, error.type || 'unknown', priority, aiStatus]
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
 * Returns recent errors for a specific pod with priority and AI status
 */
app.get('/api/pods/:id/errors', async (req, res) => {
  const { id } = req.params;
  const limit = req.query.limit || 50;

  try {
    const [errors] = await db.query(
      `SELECT id, message, error_type, priority, ai_resolution_status, ai_resolution_steps, resolved_at, timestamp 
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
        SUM(CASE WHEN p.status NOT IN ('error', 'Failed', 'CrashLoopBackOff', 'OOMKilled') THEN 1 ELSE 0 END) as running_pods,
        SUM(CASE WHEN p.status IN ('error', 'Failed', 'CrashLoopBackOff', 'OOMKilled') THEN 1 ELSE 0 END) as error_pods,
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
 * DELETE /api/namespaces/:name
 * Deletes a namespace and all associated pods/errors
 */
app.delete('/api/namespaces/:name', async (req, res) => {
  const { name } = req.params;

  try {
    // Get namespace ID
    const [nsRows] = await db.query('SELECT id FROM namespaces WHERE name = ?', [name]);
    
    if (nsRows.length === 0) {
      return res.json({ success: true, message: 'Namespace not found (already deleted)' });
    }

    const namespaceId = nsRows[0].id;

    // Delete errors for all pods in this namespace (cascade handled by FK)
    await db.query(`
      DELETE e FROM errors e
      JOIN pods p ON e.pod_id = p.id
      WHERE p.namespace_id = ?
    `, [namespaceId]);

    // Delete all pods in this namespace
    await db.query('DELETE FROM pods WHERE namespace_id = ?', [namespaceId]);

    // Delete the namespace
    await db.query('DELETE FROM namespaces WHERE id = ?', [namespaceId]);

    console.log(`🗑️  Deleted namespace: ${name}`);
    res.json({ success: true, message: 'Namespace deleted successfully' });
  } catch (error) {
    console.error('Error deleting namespace:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/errors/recent
 * Returns most recent errors across all namespaces with priorities
 */
app.get('/api/errors/recent', async (req, res) => {
  const limit = req.query.limit || 20;

  try {
    const [errors] = await db.query(
      `SELECT 
        e.id,
        e.message,
        e.error_type,
        e.priority,
        e.ai_resolution_status,
        e.timestamp,
        p.name as pod_name,
        n.name as namespace_name
       FROM errors e
       JOIN pods p ON e.pod_id = p.id
       JOIN namespaces n ON p.namespace_id = n.id
       ORDER BY 
         FIELD(e.priority, 'P0', 'P1', 'P2', 'P3'),
         e.timestamp DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    res.json(errors);
  } catch (error) {
    console.error('Error fetching recent errors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/errors/:id/ai-status
 * Update AI resolution status for an error
 */
app.patch('/api/errors/:id/ai-status', async (req, res) => {
  const { id } = req.params;
  const { status, steps } = req.body;

  try {
    const updates = ['ai_resolution_status = ?'];
    const params = [status];

    if (steps) {
      updates.push('ai_resolution_steps = ?');
      params.push(JSON.stringify(steps));
    }

    if (status === 'resolved') {
      updates.push('resolved_at = NOW()');
    }

    params.push(id);

    await db.query(
      `UPDATE errors SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true, message: 'AI status updated' });
  } catch (error) {
    console.error('Error updating AI status:', error);
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
