# Government Billing Solution MVP - EC2 Deployment Guide

This guide provides comprehensive instructions for deploying the Government Billing Solution MVP on an Amazon EC2 Ubuntu instance.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [EC2 Instance Setup](#ec2-instance-setup)
3. [Automated Deployment](#automated-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Application Management](#application-management)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

## Prerequisites

### AWS Requirements
- AWS Account with EC2 access
- Key pair for SSH access
- Security group configured with appropriate ports

### Local Requirements
- SSH client (Terminal on macOS/Linux, PuTTY on Windows)
- Basic knowledge of Linux command line

## EC2 Instance Setup

### 1. Launch EC2 Instance

1. **Choose AMI**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
2. **Instance Type**: 
   - Minimum: t3.small (2 vCPU, 2 GB RAM)
   - Recommended: t3.medium (2 vCPU, 4 GB RAM)
   - Production: t3.large or higher
3. **Storage**: Minimum 20 GB GP3 SSD
4. **Security Group**: Configure the following inbound rules:
   ```
   SSH (22)     - Your IP address
   HTTP (80)    - 0.0.0.0/0 (if using Nginx)
   HTTPS (443)  - 0.0.0.0/0 (if using SSL)
   Custom (8080) - 0.0.0.0/0 (application port)
   Custom (3000) - 0.0.0.0/0 (development port, optional)
   ```

### 2. Connect to Instance

```bash
# Replace with your key file and instance IP
ssh -i your-key.pem ubuntu@your-ec2-ip-address
```

## Automated Deployment

The easiest way to deploy is using the automated setup script:

### 1. Download and Run Setup Script

```bash
# Download the setup script
wget https://raw.githubusercontent.com/DhruvArvindSingh/Govt-billing-solution-MVP/main/ec2.sh

# Make it executable
chmod +x ec2.sh

# Run the setup script
./ec2.sh
```

### 2. What the Script Does

The automated script performs the following operations:

1. **System Updates**: Updates Ubuntu packages
2. **Dependencies Installation**: Installs Node.js, npm, git, build tools
3. **Repository Cloning**: Clones the project from GitHub
4. **Project Setup**: Installs npm dependencies and builds the application
5. **PM2 Configuration**: Sets up process management
6. **Firewall Configuration**: Configures UFW firewall
7. **Optional Nginx Setup**: Configures reverse proxy (optional)
8. **Utility Scripts**: Creates management scripts

### 3. Script Features

- **Colored Output**: Easy-to-read status messages
- **Error Handling**: Exits on errors with clear messages
- **Security Checks**: Prevents running as root
- **Backup**: Backs up existing installations
- **Interactive Options**: Optional Nginx installation
- **Comprehensive Logging**: Detailed setup logs

## Manual Deployment

If you prefer manual deployment or need to customize the process:

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Dependencies

```bash
# Install essential packages
sudo apt install -y curl wget git build-essential software-properties-common

# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install global packages
sudo npm install -g @ionic/cli pm2 typescript
```

### 3. Clone Repository

```bash
# Create application directory
mkdir -p ~/govt-billing-solution
cd ~/govt-billing-solution

# Clone repository
git clone https://github.com/DhruvArvindSingh/Govt-billing-solution-MVP.git .
```

### 4. Install Project Dependencies

```bash
# Install npm dependencies
npm install --legacy-peer-deps

# Build application
npm run build
```

### 5. Configure Environment

```bash
# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=8080
VITE_API_URL=http://localhost:8080
VITE_APP_NAME=Government Billing Solution MVP
EOF
```

### 6. Set Up PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'govt-billing-app',
    script: 'npm',
    args: 'run serve',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## Post-Deployment Configuration

### 1. Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow necessary ports
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8080
```

### 2. Set Up Nginx (Optional)

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo tee /etc/nginx/sites-available/govt-billing << EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/govt-billing /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 3. SSL Certificate (Optional)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Application Management

### Using PM2 Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs govt-billing-app

# Restart application
pm2 restart govt-billing-app

# Stop application
pm2 stop govt-billing-app

# Monitor resources
pm2 monit
```

### Using Utility Scripts (if deployed with automated script)

```bash
# Start application
./start.sh

# Stop application
./stop.sh

# Restart application
./restart.sh

# Update application
./update.sh
```

### Manual Application Updates

```bash
# Navigate to application directory
cd ~/govt-billing-solution

# Pull latest changes
git pull origin main

# Install new dependencies
npm install --legacy-peer-deps

# Rebuild application
npm run build

# Restart PM2 process
pm2 restart govt-billing-app
```

## Troubleshooting

### Common Issues

#### 1. Application Not Starting

```bash
# Check PM2 logs
pm2 logs govt-billing-app

# Check if port is in use
sudo netstat -tulpn | grep :8080

# Restart PM2 daemon
pm2 kill
pm2 start ecosystem.config.js
```

#### 2. Build Failures

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### 3. Permission Issues

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ~/govt-billing-solution
```

#### 4. Memory Issues

```bash
# Check system resources
free -h
df -h

# Increase swap space if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Log Locations

- **PM2 Logs**: `~/.pm2/logs/`
- **Application Logs**: `~/govt-billing-solution/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `/var/log/syslog`

## Security Considerations

### 1. Server Security

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Configure automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 2. SSH Security

```bash
# Change default SSH port (optional)
sudo nano /etc/ssh/sshd_config
# Change Port 22 to Port 2222

# Disable password authentication
# PasswordAuthentication no

# Restart SSH service
sudo systemctl restart ssh
```

### 3. Application Security

- Use environment variables for sensitive data
- Implement proper input validation
- Set up regular backups
- Monitor application logs
- Use HTTPS in production

### 4. Firewall Configuration

```bash
# Review firewall rules
sudo ufw status verbose

# Allow only necessary ports
sudo ufw deny 3000  # Close development port in production
```

## Monitoring and Maintenance

### 1. Set Up Monitoring

```bash
# Install htop for system monitoring
sudo apt install -y htop

# Use PM2 monitoring
pm2 install pm2-server-monit
```

### 2. Backup Strategy

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz ~/govt-billing-solution

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/pm2_dump_$DATE.pm2

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x backup.sh
```

### 3. Log Rotation

```bash
# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## Performance Optimization

### 1. Node.js Optimization

```bash
# Set NODE_ENV to production
export NODE_ENV=production

# Optimize PM2 for production
pm2 start ecosystem.config.js --env production
```

### 2. Nginx Optimization

Add to Nginx configuration:

```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Support and Resources

- **GitHub Repository**: https://github.com/DhruvArvindSingh/Govt-billing-solution-MVP
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Ubuntu Server Guide**: https://ubuntu.com/server/docs

## Conclusion

This deployment guide provides comprehensive instructions for setting up the Government Billing Solution MVP on EC2. The automated script handles most of the complexity, while the manual instructions provide flexibility for custom deployments.

For production deployments, ensure you follow all security recommendations and set up proper monitoring and backup strategies.
