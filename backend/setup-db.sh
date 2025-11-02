#!/bin/bash

# Database Setup Script for Kubernetes Pod Monitoring System

echo "🗄️  Setting up MySQL Database..."
echo ""

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL not found. Please install MySQL first."
    exit 1
fi

echo "📋 This script will:"
echo "   1. Create the 'monitoring' database"
echo "   2. Create tables (namespaces, pods, errors)"
echo "   3. Create user 'monitor_user' (optional)"
echo ""

# Check if schema.sql exists
if [ ! -f "schema.sql" ]; then
    echo "❌ schema.sql not found. Please run this script from the backend directory."
    exit 1
fi

echo "🔐 You will be prompted for your MySQL root password."
echo ""

# Option 1: Create database and tables
echo "Creating database and tables..."
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS monitoring;
USE monitoring;
SOURCE schema.sql;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database and tables created successfully!"
    echo ""
    
    # Ask if user wants to create monitor_user
    read -p "Do you want to create a dedicated 'monitor_user'? (y/N): " create_user
    
    if [[ $create_user =~ ^[Yy]$ ]]; then
        echo ""
        echo "Creating monitor_user..."
        mysql -u root -p << EOF
CREATE USER IF NOT EXISTS 'monitor_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON monitoring.* TO 'monitor_user'@'localhost';
FLUSH PRIVILEGES;
EOF
        
        if [ $? -eq 0 ]; then
            echo "✅ User 'monitor_user' created successfully!"
            echo ""
            echo "📝 Update your .env file with:"
            echo "   DB_USER=monitor_user"
            echo "   DB_PASSWORD=StrongPassword123!"
        fi
    else
        echo ""
        echo "📝 Update your .env file to use root user:"
        echo "   DB_USER=root"
        echo "   DB_PASSWORD=your_root_password"
    fi
else
    echo ""
    echo "❌ Failed to create database. Please check your MySQL password."
    exit 1
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "   1. Update backend/.env with your database credentials"
echo "   2. Run: npm start"
echo ""
