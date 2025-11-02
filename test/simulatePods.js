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
   * Create a pod with a simple container that generates logs with errors
   * Randomly creates some pods that will fail intentionally
   */
  async createPod(podName) {
    // 30% chance to create a failing pod
    const shouldFail = Math.random() < 0.3;
    
    let podYaml;
    
    if (shouldFail) {
      // Create a pod that will crash randomly
      const crashType = Math.floor(Math.random() * 3);
      let crashCommand;
      
      if (crashType === 0) {
        // Pod that exits with error code after a few logs
        crashCommand = `
      echo "$(date) - [INFO] Starting application..."
      sleep 2
      echo "$(date) - [INFO] Initializing components..."
      sleep 3
      echo "$(date) - Error: Fatal error occurred!"
      echo "$(date) - CrashLoopBackOff: Application crashed"
      exit 1`;
      } else if (crashType === 1) {
        // Pod that runs for a bit then crashes in a loop
        crashCommand = `
      while true; do
        echo "$(date) - [INFO] Application started"
        sleep $((RANDOM % 10 + 5))
        echo "$(date) - Error: Unexpected error occurred"
        echo "$(date) - Failed: Service crashed"
        exit 137`;
      } else {
        // Pod that immediately fails
        crashCommand = `
      echo "$(date) - Error: Failed to initialize"
      echo "$(date) - FATAL: Cannot start application"
      exit 1`;
      }
      
      podYaml = `apiVersion: v1
kind: Pod
metadata:
  name: ${podName}
  namespace: ${this.namespace}
  labels:
    app: ${podName}
    status: failing
spec:
  restartPolicy: Always
  containers:
  - name: app
    image: busybox:latest
    command:
    - sh
    - -c
    - |${crashCommand}
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
`;
      console.log(`⚠️  Creating FAILING pod '${podName}' (will crash)...`);
    } else {
      // Create a normal running pod with occasional error logs
      podYaml = `apiVersion: v1
kind: Pod
metadata:
  name: ${podName}
  namespace: ${this.namespace}
  labels:
    app: ${podName}
    status: running
spec:
  containers:
  - name: app
    image: busybox:latest
    command:
    - sh
    - -c
    - |
      while true; do
        RAND=$((RANDOM % 100))
        if [ $RAND -lt 15 ]; then
          case $((RANDOM % 9)) in
            0) echo "$(date) - Error: failed to connect to database" ;;
            1) echo "$(date) - FATAL: connection timeout after 30s" ;;
            2) echo "$(date) - OOMKilled: container exceeded memory limit" ;;
            3) echo "$(date) - CrashLoopBackOff: container exited with code 1" ;;
            4) echo "$(date) - Failed to pull image: timeout" ;;
            5) echo "$(date) - Exception in thread main java.lang.NullPointerException" ;;
            6) echo "$(date) - Error: ECONNREFUSED - Connection refused" ;;
            7) echo "$(date) - Crash detected: segmentation fault" ;;
            8) echo "$(date) - Failed to start application: port already in use" ;;
          esac
        else
          case $((RANDOM % 9)) in
            0) echo "$(date) - [INFO] Application started successfully" ;;
            1) echo "$(date) - [INFO] Processing request" ;;
            2) echo "$(date) - [INFO] Database connection established" ;;
            3) echo "$(date) - [INFO] Health check passed" ;;
            4) echo "$(date) - [DEBUG] Cache hit for key" ;;
            5) echo "$(date) - [INFO] Request completed successfully" ;;
            6) echo "$(date) - [INFO] Scheduled task executed" ;;
            7) echo "$(date) - [DEBUG] Loading configuration" ;;
            8) echo "$(date) - [INFO] Service running normally" ;;
          esac
        fi
        sleep 3
      done
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
`;
      console.log(`✅ Creating RUNNING pod '${podName}' (will run normally)...`);
    }

    const yamlFile = path.join(__dirname, `${podName}.yaml`);
    
    try {
      await fs.writeFile(yamlFile, podYaml);
      await execPromise(`kubectl apply -f ${yamlFile}`);
      
      // Wait a bit for pod to start
      await this.sleep(2000);
      
      // Clean up yaml file
      await fs.unlink(yamlFile);
      
      console.log(`📦 Pod '${podName}' created${shouldFail ? ' (will show errors)' : ''}`);
      
      // Initialize pod state
      this.podStates[podName] = {
        errorProbability: shouldFail ? 1.0 : 0.15,
        consecutiveErrors: 0,
        shouldFail: shouldFail
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

    console.log('\n✅ Pods are now running and generating logs!');
    console.log('📊 The monitoring agent will detect errors in the pod logs.');
    console.log('🔍 Check logs with: kubectl logs <pod-name> -n ' + this.namespace);
    console.log('\n💡 To clean up: kubectl delete namespace ' + this.namespace);
    console.log('\nPress Ctrl+C to exit (pods will keep running).\n');

    // Keep script running
    process.on('SIGINT', () => {
      console.log('\n\n👋 Exiting simulator...');
      console.log('💡 Pods are still running. To clean up:');
      console.log(`   kubectl delete namespace ${this.namespace}`);
      process.exit(0);
    });

    // Just keep the process alive
    await new Promise(() => {});
  }
}

// Run simulation
const simulator = new K8sSimulator(NAMESPACE);
simulator.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
