#!/bin/bash

# Exit on any error
set -e

echo "Starting Government Billing Solution MVP..."

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Build the application
echo "Building the application..."
npm run build

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install pm2 -g
fi

# Start the application with PM2
echo "Starting the application with PM2..."
pm2 start "ionic serve --host 0.0.0.0 --port 8080" --name "govt-billing-app"

# Keep PM2 running in foreground for Docker
echo "Application started successfully on port 8080"
pm2 logs
