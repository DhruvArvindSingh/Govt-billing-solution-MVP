

npm install --legacy-peer-deps

npm i -g @ionic/cli

npm i -g pm2

npm i -D -E vite

npm run build

pm2 start "ionic serve --no-open --host 0.0.0.0 --port 8101" --name ionic-8101

sudo apt install nginx -y

sudo apt install certbot python3-certbot-nginx -y

sudo bash -c 'cat > /etc/nginx/sites-available/mvp.dsingh.fun <<EOF
server {
    listen 80;
    server_name mvp.dsingh.fun;
    
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
sudo ln -s /etc/nginx/sites-available/mvp.dsingh.fun /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Obtain and install SSL certificate
sudo certbot --nginx -d mvp.dsingh.fun \
  --non-interactive \
  --agree-tos \
  -m dsingh19072005@gmail.com

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