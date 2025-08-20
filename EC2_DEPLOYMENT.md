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
sudo apt update

sudo apt install git

git clone https://github.com/DhruvArvindSingh/Govt-billing-solution-MVP.git

cd Govt-billing-solution-MVP

# Make it executable
chmod +x ec2.sh

# Add .env file and Put all the environment variables init

nano .env

# Run the setup script
./ec2.sh

# Nginx installation

sudo apt install nginx -y

sudo apt install certbot python3-certbot-nginx -y

# Update conf (Replace "your-domain.com" with your domain in the below command)


sudo bash -c 'cat > /etc/nginx/sites-available/your-domain.com <<EOF
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8101;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Additional proxy settings for better performance
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        proxy_temp_file_write_size 256k;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF'

# Create symbolic link to enable the site (Replace "your-domain.com" with your domain in the below command)
sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Obtain and install SSL certificate (Enter your email in this step)(Replace "your-domain.com" with your domain in the below command)
sudo certbot --nginx -d your-domain.com

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check SSL certificate status
sudo certbot certificates

# Test automatic renewal
sudo certbot renew --dry-run

# Check renewal timer status
sudo systemctl status certbot.timer

# Enable if not already enabled
sudo systemctl enable --now certbot.timer
```

### 2. What the ec2.sh Script Does

The automated script performs the following operations:

1. **System Updates**: Updates Ubuntu packages
2. **Dependencies Installation**: Installs Node.js, npm, git, build tools
4. **Project Setup**: Installs npm dependencies and builds the application
5. **PM2 Configuration**: Sets up process management

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
sudo apt upgrade && sudo apt install git

# Clone the repo
git clone https://github.com/DhruvArvindSingh/Govt-billing-solution-MVP.git

# Go into the directory
cd Govt-billing-solution-MVP

# Install necessary package
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && source ~/.bashrc && nvm list-remote && nvm install v22.16.0

sudo npm install -g @ionic/cli pm2 

npm i -D -E vite

npm install --legacy-peer-deps

# Add .env file and Put all the environment variables init

nano .env

# Build the project

npm run build

# Run the project in pm2

pm2 start "ionic serve --no-open --host 0.0.0.0 --port 8101" --name ionic-8101

# Nginx installation

sudo apt install nginx -y

sudo apt install certbot python3-certbot-nginx -y

# Update conf (Replace "your-domain.com" with your domain in the below command)


sudo bash -c 'cat > /etc/nginx/sites-available/your-domain.com <<EOF
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8101;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Additional proxy settings for better performance
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        proxy_temp_file_write_size 256k;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF'

# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Obtain and install SSL certificate (Enter your email in this step)(Replace "your-domain.com" with your domain in the below command)
sudo certbot --nginx -d your-domain.com

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check SSL certificate status
sudo certbot certificates

# Test automatic renewal
sudo certbot renew --dry-run

# Check renewal timer status
sudo systemctl status certbot.timer

# Enable if not already enabled
sudo systemctl enable --now certbot.timer

```
## Support and Resources

- **GitHub Repository**: https://github.com/DhruvArvindSingh/Govt-billing-solution-MVP
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Ubuntu Server Guide**: https://ubuntu.com/server/docs

## Conclusion

This deployment guide provides comprehensive instructions for setting up the Government Billing Solution MVP on EC2. The automated script handles most of the complexity, while the manual instructions provide flexibility for custom deployments.

For production deployments, ensure you follow all security recommendations and set up proper monitoring and backup strategies.
