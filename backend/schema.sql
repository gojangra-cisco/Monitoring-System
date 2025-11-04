-- Kubernetes Pod Monitoring Database Schema

CREATE DATABASE IF NOT EXISTS monitoring;
USE monitoring;

-- Namespaces table
CREATE TABLE IF NOT EXISTS namespaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

-- Pods table
CREATE TABLE IF NOT EXISTS pods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    namespace_id INT NOT NULL,
    status ENUM('running', 'error', 'pending', 'unknown') DEFAULT 'unknown',
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (namespace_id) REFERENCES namespaces(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pod_namespace (name, namespace_id),
    INDEX idx_namespace_id (namespace_id),
    INDEX idx_status (status)
);

-- Errors table
CREATE TABLE IF NOT EXISTS errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pod_id INT NOT NULL,
    message TEXT NOT NULL,
    error_type VARCHAR(100),
    priority ENUM('P0', 'P1', 'P2', 'P3') DEFAULT 'P2',
    ai_resolution_status ENUM('not_started', 'analyzing', 'resolving', 'resolved', 'failed', 'manual_required') DEFAULT 'not_started',
    ai_resolution_steps JSON,
    resolved_at TIMESTAMP NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pod_id) REFERENCES pods(id) ON DELETE CASCADE,
    INDEX idx_pod_id (pod_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_priority (priority),
    INDEX idx_ai_status (ai_resolution_status)
);

-- Create user for monitoring application
-- Run these commands separately if needed:
-- CREATE USER IF NOT EXISTS 'monitor_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
-- GRANT ALL PRIVILEGES ON monitoring.* TO 'monitor_user'@'localhost';
-- FLUSH PRIVILEGES;
