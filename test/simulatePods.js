#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const execPromise = util.promisify(exec);

// Configuration
const NAMESPACE = process.argv[2] || 'jira-tracker';
const POD_NAMES = [
  `${NAMESPACE}-web-pod`,
  `${NAMESPACE}-api-pod`,
  `${NAMESPACE}-worker-pod`
];

// Error messages to randomly inject
const ERROR_MESSAGES = [
  'Error: failed to connect to database',
  'FATAL: connection timeout after 30s',
  'OOMKilled: container exceeded memory limit',
  'CrashLoopBackOff: container exited with code 1',
  'Failed to pull image: timeout',
  'Exception in thread "main" java.lang.NullPointerException',
  'Error: ECONNREFUSED - Connection refused',
  'Crash detected: segmentation fault',
  'Failed to start application: port already in use'
];

const OK_MESSAGES = [
  '[INFO] Application started successfully',
  '[INFO] Processing request',
  '[INFO] Database connection established',
  '[INFO] Health check passed',
  '[DEBUG] Cache hit for key',
  '[INFO] Request completed successfully',
  '[INFO] Scheduled task executed',
  '[DEBUG] Loading configuration',
  '[INFO] Service running normally'
];

class K8sSimulator {
  constructor(namespace) {
    this.namespace = namespace;
    this.logDir = path.join(__dirname, 'logs', namespace);
    this.podStates = {};
  }

  /**
   * Check if kubectl is available
   */
  async checkKubectl() {
    try {
      // Check kubectl availability
      const { stdout } = await execPromise('kubectl version --client 2>&1');
      console.log('✅ kubectl found and accessible');
      return true;
    } catch (error) {
      console.error('❌ kubectl not found or not accessible.');
      console.error('💡 Make sure kubectl is installed and in your PATH.');
      console.error('   Try running: kubectl version --client');
      console.error('   Error details:', error.message);
      return false;
    }
  }

  /**
   * Delete namespace if it exists
   */
  async deleteNamespace() {
    try {
      console.log(`🗑️  Checking if namespace '${this.namespace}' exists...`);
      await execPromise(`kubectl get namespace ${this.namespace}`);
      console.log(`🗑️  Deleting existing namespace '${this.namespace}'...`);
      await execPromise(`kubectl delete namespace ${this.namespace} --grace-period=0 --force`);
      
      // Wait for namespace to be fully deleted
      console.log('⏳ Waiting for namespace deletion...');
      await this.sleep(5000);
    } catch (error) {
      if (error.message.includes('NotFound') || error.message.includes('not found')) {
        console.log(`✅ Namespace '${this.namespace}' doesn't exist, continuing...`);
      }
    }
  }

  /**
   * Create namespace
   */
  async createNamespace() {
    try {
      console.log(`🔨 Creating namespace '${this.namespace}'...`);
      await execPromise(`kubectl create namespace ${this.namespace}`);
      console.log(`✅ Namespace '${this.namespace}' created`);
    } catch (error) {
      console.error(`❌ Error creating namespace:`, error.message);
      throw error;
    }
  }

  /**
   * Create a pod with a simple container that sleeps
   */
  async createPod(podName) {
    const podYaml = `
apiVersion: v1
kind: Pod
metadata:
  name: ${podName}
  namespace: ${this.namespace}
spec:
  containers:
  - name: app
    image: busybox:latest
    command: ['sh', '-c', 'while true; do echo "$(date) - [INFO] Application running"; sleep 5; done']
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
`;

    const yamlFile = path.join(__dirname, `${podName}.yaml`);
    
    try {
      await fs.writeFile(yamlFile, podYaml);
      console.log(`🔨 Creating pod '${podName}'...`);
      await execPromise(`kubectl apply -f ${yamlFile}`);
      
      // Wait a bit for pod to start
      await this.sleep(2000);
      
      // Clean up yaml file
      await fs.unlink(yamlFile);
      
      console.log(`✅ Pod '${podName}' created`);
      
      // Initialize pod state
      this.podStates[podName] = {
        errorProbability: 0.15, // 15% chance of error per log entry
        consecutiveErrors: 0
      };
    } catch (error) {
      console.error(`❌ Error creating pod ${podName}:`, error.message);
      // Try to clean up yaml file
      try {
        await fs.unlink(yamlFile);
      } catch {}
    }
  }

  /**
   * Create all test pods
   */
  async createAllPods() {
    for (const podName of POD_NAMES) {
      await this.createPod(podName);
    }
  }

  /**
   * Append logs to a pod by writing to it
   */
  async appendLogToPod(podName) {
    const state = this.podStates[podName];
    const shouldError = Math.random() < state.errorProbability;
    
    let message;
    let command;

    if (shouldError) {
      // Inject an error message
      message = ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)];
      state.consecutiveErrors++;
      
      // If too many consecutive errors, simulate pod crash
      if (state.consecutiveErrors >= 3) {
        console.log(`💥 Pod ${podName} simulating crash...`);
        try {
          // Delete and recreate pod to simulate crash
          await execPromise(`kubectl delete pod ${podName} -n ${this.namespace} --grace-period=0 --force`);
          await this.sleep(1000);
          await this.createPod(podName);
          state.consecutiveErrors = 0;
        } catch (error) {
          console.error(`Error simulating crash for ${podName}:`, error.message);
        }
        return;
      }
    } else {
      // Normal OK message
      message = OK_MESSAGES[Math.floor(Math.random() * OK_MESSAGES.length)];
      state.consecutiveErrors = 0;
    }

    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} - ${message}`;
    
    // We can't actually append to pod logs easily, but we can log it locally
    // In a real scenario, the application inside the pod would generate these logs
    console.log(`📝 [${podName}] ${shouldError ? '❌' : '✅'} ${message}`);
  }

  /**
   * Monitor and generate logs continuously
   */
  async startLogGeneration() {
    console.log('\n🚀 Starting log generation (press Ctrl+C to stop)...\n');

    const interval = setInterval(async () => {
      for (const podName of POD_NAMES) {
        if (this.podStates[podName]) {
          await this.appendLogToPod(podName);
        }
      }
    }, 3000); // Generate logs every 3 seconds

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Stopping simulation...');
      clearInterval(interval);
      console.log('\n💡 Namespace and pods are still running. To clean up:');
      console.log(`   kubectl delete namespace ${this.namespace}`);
      process.exit(0);
    });
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Display pod status
   */
  async displayPodStatus() {
    try {
      console.log('\n📊 Current Pod Status:');
      const { stdout } = await execPromise(`kubectl get pods -n ${this.namespace}`);
      console.log(stdout);
    } catch (error) {
      console.error('Error getting pod status:', error.message);
    }
  }

  /**
   * Main simulation flow
   */
  async run() {
    console.log('🎯 Kubernetes Pod Simulator');
    console.log('=' .repeat(50));
    console.log(`📦 Target Namespace: ${this.namespace}`);
    console.log(`🔢 Number of Pods: ${POD_NAMES.length}`);
    console.log('=' .repeat(50) + '\n');

    // Check kubectl
    const hasKubectl = await this.checkKubectl();
    if (!hasKubectl) {
      process.exit(1);
    }

    // Delete existing namespace
    await this.deleteNamespace();

    // Create namespace
    await this.createNamespace();

    // Create pods
    await this.createAllPods();

    // Wait for pods to be ready
    console.log('\n⏳ Waiting for pods to be ready...');
    await this.sleep(5000);

    // Display status
    await this.displayPodStatus();

    // Start log generation
    await this.startLogGeneration();
  }
}

// Run simulation
const simulator = new K8sSimulator(NAMESPACE);
simulator.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
