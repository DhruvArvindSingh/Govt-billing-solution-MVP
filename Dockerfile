# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    bash \
    git \
    python3 \
    make \
    g++ \
    curl \
    && npm install -g @ionic/cli

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Make ec2.sh executable
RUN chmod +x ec2.sh

# Expose port 8080 (as used in ec2.sh)
EXPOSE 8080

# Run the ec2.sh script
CMD ["./docker.sh"]
