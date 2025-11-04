#!/usr/bin/env node

/**
 * Hackathon Demo Pod Simulator
 * Creates a realistic demo scenario with 5 pods showing different error states
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

class HackathonDemo {
  constructor() {
    this.namespace = 'hackathon';
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkKubectl() {
    try {
      await execPromise('kubectl version --client 2>&1');
      console.log('✅ kubectl found and accessible');
      return true;
    } catch (error) {
      console.error('❌ kubectl not found or not accessible.');
      return false;
    }
  }

  async deleteNamespace() {
    try {
      console.log(`🗑️  Checking if namespace '${this.namespace}' exists...`);
      await execPromise(`kubectl get namespace ${this.namespace}`);
      console.log(`🗑️  Deleting existing namespace '${this.namespace}'...`);
      await execPromise(`kubectl delete namespace ${this.namespace} --grace-period=0 --force`);
      console.log('⏳ Waiting for namespace deletion...');
      await this.sleep(5000);
    } catch (error) {
      if (error.message.includes('NotFound') || error.message.includes('not found')) {
        console.log(`✅ Namespace '${this.namespace}' doesn't exist, continuing...`);
      }
    }
  }

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
   * Create Dashboard pod - has invalidImageName error (AI can solve)
   * Shows ONE error only, then AI fixes it
   */
  async createDashboardPod() {
    const podYaml = `apiVersion: v1
kind: Pod
metadata:
  name: dashboard
  namespace: ${this.namespace}
  labels:
    app: dashboard
    component: frontend
spec:
  containers:
  - name: dashboard
    image: nginx:invalid-tag-demo
    imagePullPolicy: Always
    resources:
      requests:
        memory: "128Mi"
        cpu: "250m"
      limits:
        memory: "256Mi"
        cpu: "500m"
`;

    await this.applyPodYaml('dashboard', podYaml);
    console.log(`✅ Created dashboard pod (will have ONE ImagePullBackOff error for AI to fix)`);
  }

  /**
   * Create OIDC Server pod - HEALTHY (running normally)
   */
  async createOIDCServerPod() {
    const podYaml = `apiVersion: v1
kind: Pod
metadata:
  name: oidc-server
  namespace: ${this.namespace}
  labels:
    app: oidc-server
    component: auth
spec:
  containers:
  - name: oidc-server
    image: busybox:latest
    command:
    - sh
    - -c
    - |
      while true; do
        echo "$(date) - [INFO] OIDC Server running - Authentication service healthy"
        echo "$(date) - [INFO] Active sessions: $((RANDOM % 50 + 10))"
        echo "$(date) - [INFO] Token validation: OK"
        sleep 5
      done
    resources:
      requests:
        memory: "128Mi"
        cpu: "250m"
      limits:
        memory: "256Mi"
        cpu: "500m"
`;

    await this.applyPodYaml('oidc-server', podYaml);
    console.log(`✅ Created oidc-server pod (running healthy)`);
  }

  /**
   * Create Proxy pod - running healthy
   */
  async createProxyPod() {
    const podYaml = `apiVersion: v1
kind: Pod
metadata:
  name: proxy
  namespace: ${this.namespace}
  labels:
    app: proxy
    component: networking
spec:
  containers:
  - name: proxy
    image: busybox:latest
    command:
    - sh
    - -c
    - |
      while true; do
        echo "$(date) - [INFO] Proxy server handling requests"
        echo "$(date) - [INFO] Health check: OK"
        echo "$(date) - [INFO] Active connections: $((RANDOM % 100))"
        sleep 5
      done
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
`;

    await this.applyPodYaml('proxy', podYaml);
    console.log(`✅ Created proxy pod (running healthy)`);
  }

  /**
   * Create Redis pod - running healthy
   */
  async createRedisPod() {
    const podYaml = `apiVersion: v1
kind: Pod
metadata:
  name: redis
  namespace: ${this.namespace}
  labels:
    app: redis
    component: cache
spec:
  containers:
  - name: redis
    image: busybox:latest
    command:
    - sh
    - -c
    - |
      while true; do
        echo "$(date) - [INFO] Redis cache operational"
        echo "$(date) - [INFO] Memory usage: $((RANDOM % 100))%"
        echo "$(date) - [INFO] Cache hit ratio: 95%"
        sleep 5
      done
    resources:
      requests:
        memory: "128Mi"
        cpu: "250m"
      limits:
        memory: "256Mi"
        cpu: "500m"
`;

    await this.applyPodYaml('redis', podYaml);
    console.log(`✅ Created redis pod (running healthy)`);
  }

  /**
   * Create Postgres pod - starts healthy, then shows ONE P0 error after 50 seconds
   */
  async createPostgresPod() {
    const podYaml = `apiVersion: v1
kind: Pod
metadata:
  name: postgres
  namespace: ${this.namespace}
  labels:
    app: postgres
    component: database
spec:
  containers:
  - name: postgres
    image: busybox:latest
    command:
    - sh
    - -c
    - |
      echo "$(date) - [INFO] PostgreSQL starting..."
      echo "$(date) - [INFO] Database initialization successful"
      echo "$(date) - [INFO] Accepting connections on port 5432"
      
      # Run healthy for 50 seconds
      for i in {1..10}; do
        echo "$(date) - [INFO] PostgreSQL running - Active connections: $((RANDOM % 20 + 5))"
        echo "$(date) - [INFO] Query response time: $((RANDOM % 50 + 10))ms"
        sleep 5
      done
      
      # After 50 seconds, show ONE P0 error
      echo "$(date) - [ERROR] CRITICAL: Database corruption detected"
      echo "$(date) - [ERROR] P0: Data integrity check failed in postgresql.conf"
      echo "$(date) - [ERROR] WAL file corruption detected - cannot auto-recover"
      echo "$(date) - [FATAL] Requires manual DBA intervention - P0 Priority"
      exit 1
    resources:
      requests:
        memory: "256Mi"
        cpu: "500m"
      limits:
        memory: "512Mi"
        cpu: "1000m"
`;

    await this.applyPodYaml('postgres', podYaml);
    console.log(`✅ Created postgres pod (healthy for 50s, then ONE P0 error)`);
  }

  async applyPodYaml(podName, yaml) {
    const yamlFile = path.join(__dirname, `${podName}.yaml`);
    try {
      await fs.writeFile(yamlFile, yaml);
      await execPromise(`kubectl apply -f ${yamlFile}`);
      await this.sleep(2000);
      await fs.unlink(yamlFile);
    } catch (error) {
      console.error(`❌ Error creating pod ${podName}:`, error.message);
      try {
        await fs.unlink(yamlFile);
      } catch {}
    }
  }

  async run() {
    console.log('🎯 Hackathon Demo Environment Setup');
    console.log('==================================================');
    console.log(`📦 Creating namespace: ${this.namespace}`);
    console.log('🎬 Demo Scenario:');
    console.log('   • dashboard: ONE ImagePullBackOff error (AI will fix with commands)');
    console.log('   • oidc-server: Healthy ✓');
    console.log('   • proxy: Healthy ✓');
    console.log('   • redis: Healthy ✓');
    console.log('   • postgres: Healthy for 50s, then ONE P0 error (AI tries but fails)');
    console.log('==================================================');
    console.log('📋 Total Errors: 2 (dashboard + postgres after 50s)');
    console.log('==================================================\n');

    const hasKubectl = await this.checkKubectl();
    if (!hasKubectl) {
      process.exit(1);
    }

    await this.deleteNamespace();
    await this.createNamespace();

    console.log('\n🔨 Creating pods...\n');
    await this.createDashboardPod();
    await this.createOIDCServerPod();
    await this.createProxyPod();
    await this.createRedisPod();
    await this.createPostgresPod();

    console.log('\n⏳ Waiting for pods to initialize...');
    await this.sleep(5000);

    console.log('\n📊 Current Pod Status:');
    try {
      const { stdout } = await execPromise(`kubectl get pods -n ${this.namespace}`);
      console.log(stdout);
    } catch (error) {
      console.error('Error getting pod status:', error.message);
    }

    console.log('\n✅ Hackathon demo environment is ready!');
    console.log(`🎬 Start the monitoring agent:`);
    console.log(`   cd agent && node index.js --namespace=${this.namespace}`);
    console.log(`\n🌐 View the dashboard at: http://localhost:5173`);
    console.log(`\n💡 To clean up: kubectl delete namespace ${this.namespace}`);
  }
}

// Run if executed directly
if (require.main === module) {
  const demo = new HackathonDemo();
  demo.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = HackathonDemo;
