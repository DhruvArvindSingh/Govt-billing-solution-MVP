# EC2 Deployment Guide

This document provides instructions for deploying the application on an AWS or GCP VM instance. the VM's OS should Ubuntu or Debian

## 1. Initial Server Setup

These commands set up the basic environment required for the application.

### 1.1. Update Package Manager

It's good practice to update the package list before installing new software.
```bash
sudo apt update
```

### 1.2. Install git

If the VM is ran on the Google provider then the git is not preinstalled.In AWS, git comes preinstalled so ran the below command it you are using GCP

```bash
sudo apt install git
```

### 1.3. Install git

```bash
git clone --branch with_ligthhouse --single-branch  https://github.com/DhruvArvindSingh/Govt-billing-solution-MVP.git 
cd Govt-billing-solution-MVP
```

### 1.3. Install Node and Npm using Nvm 

Install npm/node version 22.16.0 via nvm 

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && source ~/.bashrc && nvm list-remote && nvm install v22.16.0
```

### 1.4. Configure Environment Variables

Copy the example environment file and edit it with your configuration:

```bash
cp .env.example .env
nano .env
```

Update the environment variables as needed for your deployment.

## 2.1 Setup Project

The `ec2.sh` script automates the project setup.

First, make the script executable:
```bash
chmod +x ec2.sh
```
Then, run the script. You might need `sudo` if you are not running as root.

This script will:
1.  Install pm2
2.  Install all the dependencies and ionic-cli
3.  Build the project
4.  Start Project at port 8101 using pm2

```bash
./ec2.sh
```
## 4. Nginx Deployment

Install all the dependencies

```bash
sudo apt update
sudo apt install nginx -y
```

Check if Nginx is running:

```bash
systemctl status nginx
```

Create nginx.conf in your-domain.com:

```bash
sudo nano /etc/nginx/sites-available/your-domain.com
```

**Note:** You need to change the `your-domain.com` in the below configuration to you own domain name which is pointing to your VM's external IP.

Paste this configuration

```bash
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8101;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable to config

```bash
sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
```

Test Nginx config:
```bash
sudo nginx -t
```

Reload Nginx:
```bash
sudo systemctl reload nginx
```

## 5. Setting SSL Certificate

Install Certbot and Nginx plugin:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

Get SSL Certificate

**Note:** You need to change the `your-domain.com` in the below configuration to you own domain name which is pointing to your VM's external IP.

```bash
sudo certbot --nginx -d your-domain.com
```

Auto-Renew SSL
```bash
sudo certbot renew --dry-run
```

