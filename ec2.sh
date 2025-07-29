sudo apt-get update
sudo apt install curl

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && source ~/.bashrc && nvm list-remote && nvm install v22.16.0

git clone https://github.com/DhruvArvindSingh/Govt-billing-solution-MVP

cd Govt-billing-solution-MVP

npm install --legacy-peer-deps

npm i -g @ionic/cli

npm i -g pm2

npm run build
