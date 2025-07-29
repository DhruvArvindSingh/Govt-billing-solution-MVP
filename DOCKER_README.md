# Docker Setup for Government Billing Solution MVP

This document provides instructions for running the Government Billing Solution MVP using Docker and Docker Compose.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start the application
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

### 2. Access the Application

Once the container is running, you can access the application at:
- **URL**: http://localhost:8080

### 3. Stop the Application

```bash
# Stop the application
docker-compose down

# Stop and remove volumes (if needed)
docker-compose down -v
```

## Docker Commands

### Build Only
```bash
docker-compose build
```

### View Logs
```bash
# View logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs -f govt-billing-app
```

### Restart the Application
```bash
docker-compose restart
```

### Execute Commands in Container
```bash
# Access the container shell
docker-compose exec govt-billing-app sh

# Run npm commands
docker-compose exec govt-billing-app npm run build
```

## What the Setup Does

1. **Creates a Node.js 18 Alpine container** - Lightweight Linux environment
2. **Installs system dependencies** - bash, git, python3, make, g++, and Ionic CLI
3. **Installs npm dependencies** - Using `--legacy-peer-deps` flag for compatibility
4. **Builds the application** - Runs `npm run build`
5. **Starts with PM2** - Process manager for production deployment
6. **Serves on port 8080** - Accessible via http://localhost:8080

## Container Features

- **Health Check**: Monitors application health every 30 seconds
- **Auto Restart**: Container restarts automatically if it crashes
- **Volume Mounting**: Source code is mounted for development (optional)
- **Network Isolation**: Uses dedicated Docker network
- **Process Management**: PM2 handles application lifecycle

## Troubleshooting

### Container Won't Start
```bash
# Check container logs
docker-compose logs govt-billing-app

# Rebuild without cache
docker-compose build --no-cache
```

### Port Already in Use
```bash
# Check what's using port 8080
lsof -i :8080

# Or change port in docker-compose.yml
ports:
  - "8081:8080"  # Use port 8081 instead
```

### Permission Issues
```bash
# Fix file permissions
chmod +x ec2.sh
```

## Development Mode

For development with hot reload, you can modify the docker-compose.yml to use:

```yaml
command: ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
```

## Production Deployment

The current setup is optimized for production with:
- PM2 process management
- Health checks
- Auto-restart policies
- Optimized Docker layers

## Environment Variables

You can customize the deployment by setting environment variables in docker-compose.yml:

```yaml
environment:
  - NODE_ENV=production
  - PORT=8080
  - API_URL=your-api-url
```

## File Structure

```
.
├── Dockerfile              # Container definition
├── docker-compose.yml      # Service orchestration
├── .dockerignore           # Files to exclude from build
├── ec2.sh                  # Application startup script
└── DOCKER_README.md        # This file
