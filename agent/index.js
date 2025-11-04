#!/usr/bin/env node

const { exec } = require('child_process');
const axios = require('axios');
const util = require('util');
require('dotenv').config();

const execPromise = util.promisify(exec);

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const CHECK_INTERVAL = 300000; // 5 minutes

// Error patterns to detect
const ERROR_PATTERNS = [
  { pattern: /CrashLoopBackOff/i, type: 'CrashLoopBackOff' },
  { pattern: /OOMKilled/i, type: 'OOMKilled' },
  { pattern: /Error:/i, type: 'Error' },
  { pattern: /Failed/i, type: 'Failed' },
  { pattern: /FATAL/i, type: 'Fatal' },
  { pattern: /Crash/i, type: 'Crash' },
  { pattern: /Exception/i, type: 'Exception' }
];

class K8sMonitorAgent {
  constructor(namespace) {
    this.namespace = namespace;
    this.isRunning = false;
    console.log(`🔍 Monitoring agent initialized for namespace: ${this.namespace}`);
  }

  /**
   * Parse command line arguments
   */
  static parseArgs() {
    const args = process.argv.slice(2);
    let namespace = 'default';

    for (const arg of args) {
      if (arg.startsWith('--namespace=')) {
        namespace = arg.split('=')[1];
      } else if (arg.startsWith('-n=')) {
        namespace = arg.split('=')[1];
      }
    }

    return namespace;
  }

  /**
   * Check if kubectl is available
   */
  async checkKubectl() {
    try {
      await execPromise('kubectl version --client 2>&1');
      return true;
    } catch (error) {
      console.error('❌ kubectl not found. Please install kubectl to use this agent.');
      return false;
    }
  }

  /**
   * Check if namespace exists
   */
  async namespaceExists() {
    try {
      await execPromise(`kubectl get namespace ${this.namespace}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all pods in the namespace
   */
  async getPods() {
    try {
      const { stdout } = await execPromise(
        `kubectl get pods -n ${this.namespace} -o json`
      );
      const data = JSON.parse(stdout);
      return data.items || [];
    } catch (error) {
      if (error.message.includes('NotFound') || error.message.includes('not found')) {
        console.warn(`⚠️  Namespace '${this.namespace}' not found`);
        return null; // Return null to indicate namespace doesn't exist
      }
      throw error;
    }
  }

  /**
   * Get logs for a specific pod
   */
  async getPodLogs(podName) {
    try {
      const { stdout } = await execPromise(
        `kubectl logs ${podName} -n ${this.namespace} --tail=100 --since=1m`
      );
      return stdout;
    } catch (error) {
      console.error(`⚠️  Could not fetch logs for pod ${podName}:`, error.message);
      return '';
    }
  }

  /**
   * Analyze logs for error patterns
   */
  analyzeLogsForErrors(logs) {
    const errors = [];
    const lines = logs.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      for (const { pattern, type } of ERROR_PATTERNS) {
        if (pattern.test(line)) {
          errors.push({
            message: line.trim().substring(0, 500), // Limit message length
            type: type
          });
          break; // Only match first pattern per line
        }
      }
    }

    return errors;
  }

  /**
   * Get pod status (Running, Failed, CrashLoopBackOff, etc.)
   */
  getPodStatus(pod) {
    const phase = pod.status.phase;
    
    // Check container statuses for more specific status
    if (pod.status.containerStatuses && pod.status.containerStatuses.length > 0) {
      const container = pod.status.containerStatuses[0];
      
      // Check if waiting (CrashLoopBackOff, ImagePullBackOff, etc.)
      if (container.state.waiting) {
        return container.state.waiting.reason || phase;
      }
      
      // Check if terminated
      if (container.state.terminated) {
        return container.state.terminated.reason || 'Terminated';
      }
      
      // Running but not ready
      if (container.state.running && !container.ready) {
        return 'NotReady';
      }
    }
    
    return phase; // Running, Pending, Failed, etc.
  }

  /**
   * Check if a pod is in error state
   */
  isPodInError(status) {
    const errorStatuses = [
      'Failed', 'Unknown', 'CrashLoopBackOff', 
      'ImagePullBackOff', 'ErrImagePull', 
      'Error', 'OOMKilled', 'Terminated'
    ];
    return errorStatuses.includes(status);
  }

  /**
   * Monitor pods in the namespace
   */
  async monitorPods() {
    try {
      const pods = await this.getPods();

      // Check if namespace was deleted
      if (pods === null) {
        console.log(`🗑️  Namespace '${this.namespace}' was deleted. Notifying backend...`);
        await this.notifyNamespaceDeleted();
        return;
      }

      if (pods.length === 0) {
        console.log(`📭 No pods found in namespace '${this.namespace}'`);
        // Still send update to backend with empty pod list
        await this.sendToBackend([]);
        return;
      }

      const podData = [];

      for (const pod of pods) {
        const podName = pod.metadata.name;
        const podStatus = this.getPodStatus(pod);
        const isError = this.isPodInError(podStatus);

        let errors = [];

        // If pod is in error state or has interesting logs, fetch and analyze
        console.log(`🔍 Checking pod ${podName} (Status: ${podStatus})...`);
        const logs = await this.getPodLogs(podName);
        errors = this.analyzeLogsForErrors(logs);
        
        // If pod status indicates error but no log errors found, add status error
        if (isError && errors.length === 0) {
          errors.push({
            message: `Pod status: ${podStatus}`,
            type: podStatus
          });
        }

        podData.push({
          name: podName,
          status: podStatus, // Send actual K8s status
          errors: errors.length > 0 ? errors : undefined
        });

        const statusIcon = isError ? '❌' : '✅';
        console.log(`${statusIcon} ${podName}: ${podStatus}${errors.length > 0 ? ` (${errors.length} errors)` : ''}`);
      }

      // Send data to backend
      await this.sendToBackend(podData);

    } catch (error) {
      console.error('❌ Error monitoring pods:', error.message);
    }
  }

  /**
   * Send collected data to backend API
   */
  async sendToBackend(pods) {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/agent/update`, {
        namespace: this.namespace,
        pods: pods
      }, {
        timeout: 5000
      });

      if (response.data.success) {
        console.log(`📤 Data sent to backend successfully`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error(`❌ Cannot connect to backend at ${BACKEND_URL}`);
      } else {
        console.error('❌ Error sending data to backend:', error.message);
      }
    }
  }

  /**
   * Notify backend that namespace was deleted
   */
  async notifyNamespaceDeleted() {
    try {
      const response = await axios.delete(`${BACKEND_URL}/api/namespaces/${this.namespace}`, {
        timeout: 5000
      });

      if (response.data.success) {
        console.log(`✅ Backend notified of namespace deletion`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error(`❌ Cannot connect to backend at ${BACKEND_URL}`);
      } else {
        console.error('❌ Error notifying backend:', error.message);
      }
    }
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Agent is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Starting monitoring agent for namespace: ${this.namespace}`);
    console.log(`⏱️  Check interval: ${CHECK_INTERVAL / 1000} seconds`);
    console.log(`🔗 Backend URL: ${BACKEND_URL}`);
    console.log('---');

    // Run immediately
    this.monitorPods();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      console.log(`\n⏰ Running check at ${new Date().toISOString()}`);
      this.monitorPods();
    }, CHECK_INTERVAL);

    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) return;

    console.log('\n🛑 Stopping monitoring agent...');
    clearInterval(this.intervalId);
    this.isRunning = false;
    process.exit(0);
  }
}

// Main execution
async function main() {
  const namespace = K8sMonitorAgent.parseArgs();
  const agent = new K8sMonitorAgent(namespace);

  // Check if kubectl is available
  const hasKubectl = await agent.checkKubectl();
  if (!hasKubectl) {
    process.exit(1);
  }

  // Start monitoring
  agent.start();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = K8sMonitorAgent;
