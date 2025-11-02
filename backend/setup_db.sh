#!/bin/bash
echo "🔧 Setting up database for Kubernetes Pod Monitor"
echo ""

# Create database and import schema
mysql -u root << 'SQL'
CREATE DATABASE IF NOT EXISTS monitoring;
USE monitoring;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS errors;
DROP TABLE IF EXISTS pods;
DROP TABLE IF EXISTS namespaces;

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
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pod_id) REFERENCES pods(id) ON DELETE CASCADE,
    INDEX idx_pod_id (pod_id),
    INDEX idx_timestamp (timestamp)
);

SELECT '✅ Database and tables created successfully!' as Status;
SQL

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "📝 Database: monitoring"
    echo "📝 Tables: namespaces, pods, errors"
    echo ""
    echo "🚀 You can now start the backend:"
    echo "   npm start"
else
    echo ""
    echo "❌ Error setting up database"
    echo "💡 You may need to enter your MySQL password"
fi
