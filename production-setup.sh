#!/bin/bash

echo "=== Setting up Production Environment ==="

# Install dependencies
npm install --legacy-peer-deps

# Install global packages
npm i -g @ionic/cli
npm i -g pm2

# Build the project for production
echo "Building project for production..."
npm run build

# Stop any existing PM2 processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Check if build directory exists
if [ -d "dist" ]; then
    echo "Using dist directory for production build"
    BUILD_DIR="dist"
elif [ -d "build" ]; then
    echo "Using build directory for production build"
    BUILD_DIR="build"
else
    echo "Error: No build directory found. Make sure 'npm run build' completed successfully."
    exit 1
fi

# Start the production server
echo "Starting production server on port 8101..."
pm2 serve $BUILD_DIR 8101 --name ionic-prod --spa

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system reboot
pm2 startup

echo "=== Production setup complete ==="
echo "Check status with: pm2 list"
echo "View logs with: pm2 logs ionic-prod"
echo "Test local connection: curl -I http://127.0.0.1:8101"



