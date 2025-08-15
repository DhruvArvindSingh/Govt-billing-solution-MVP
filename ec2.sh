sudo apt-get update
sudo apt install curl

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && source ~/.bashrc && nvm list-remote && nvm install v22.16.0

git clone https://github.com/DhruvArvindSingh/Govt-billing-solution-MVP

cd Govt-billing-solution-MVP

npm install --legacy-peer-deps

npm i -g @ionic/cli

npm i -g pm2

npm run build

pm2 start "ionic serve --no-open --host 0.0.0.0 --port 8101" --name ionic-8101

sudo apt install nginx -y

sudo apt install certbot python3-certbot-nginx -y

sudo mv ./nginx.conf /etc/nginx/sites-available/mvp.dsingh.fun

# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/mvp.dsingh.fun /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Obtain and install SSL certificate
sudo certbot --nginx -d mvp.dsingh.fun

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