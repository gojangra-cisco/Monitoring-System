#!/usr/bin/env node

const { exec } = require('child_process');
const axios = require('axios');
const util = require('util');
require('dotenv').config();

const execPromise = util.promisify(exec);

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 10000; // 10 seconds

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
        return [];
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
   * Check if a pod is in error state
   */
  isPodInError(pod) {
    const phase = pod.status.phase;
    
    // Check for common error states
    if (phase === 'Failed' || phase === 'Unknown') {
      return true;
    }

    // Check container statuses
    if (pod.status.containerStatuses) {
      for (const container of pod.status.containerStatuses) {
        const waiting = container.state.waiting;
        const terminated = container.state.terminated;

        if (waiting) {
          const errorReasons = ['CrashLoopBackOff', 'ImagePullBackOff', 'ErrImagePull'];
          if (errorReasons.includes(waiting.reason)) {
            return true;
          }
        }

        if (terminated && terminated.exitCode !== 0) {
          return true;
        }

        if (!container.ready && container.state.running) {
          // Container is running but not ready - might indicate issues
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Monitor pods in the namespace
   */
  async monitorPods() {
    try {
      const pods = await this.getPods();

      if (pods.length === 0) {
        console.log(`📭 No pods found in namespace '${this.namespace}'`);
        return;
      }

      const podData = [];

      for (const pod of pods) {
        const podName = pod.metadata.name;
        const isError = this.isPodInError(pod);
        const status = isError ? 'error' : 'running';

        let errors = [];

        // If pod is in error state, fetch and analyze logs
        if (isError) {
          console.log(`⚠️  Pod ${podName} is in error state, fetching logs...`);
          const logs = await this.getPodLogs(podName);
          errors = this.analyzeLogsForErrors(logs);
          
          // If no specific errors found in logs, add generic error
          if (errors.length === 0) {
            const phase = pod.status.phase;
            const containerStatus = pod.status.containerStatuses?.[0];
            const reason = containerStatus?.state?.waiting?.reason || 
                          containerStatus?.state?.terminated?.reason || 
                          phase;
            errors.push({
              message: `Pod in error state: ${reason}`,
              type: reason
            });
          }
        }

        podData.push({
          name: podName,
          status: status,
          errors: errors.length > 0 ? errors : undefined
        });

        const statusIcon = status === 'running' ? '✅' : '❌';
        console.log(`${statusIcon} ${podName}: ${status}${errors.length > 0 ? ` (${errors.length} errors)` : ''}`);
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
