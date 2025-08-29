curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && source ~/.bashrc && nvm list-remote && nvm install v22.16.0

npm install --legacy-peer-deps

npm i -g @ionic/cli

npm i -g pm2

npm i -D -E vite

npm run build

pm2 start "ionic serve --no-open --host 0.0.0.0 --port 8101" --name ionic-8101
    