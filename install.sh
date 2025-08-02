#!/bin/bash

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing Docker..."
    sudo apt update
    sudo apt install -y docker.io
    sudo usermod -aG docker $USER
    echo "Docker installed successfully."
else
    echo "Docker is already installed."
fi

# Check if Docker Compose CLI plugin is installed
if ! docker compose version &> /dev/null; then
    echo "Docker Compose CLI plugin not found. Installing..."
    sudo apt-get update -y
    sudo apt-get install -y docker-compose-plugin
    echo "Docker Compose plugin installed successfully."
else
    echo "Docker Compose plugin is already installed."
fi

# Check if OpenSSL is installed
if ! command -v openssl &> /dev/null; then
    echo "OpenSSL not found. Installing OpenSSL..."
    sudo apt install -y openssl
    echo "OpenSSL installed successfully."
else
    echo "OpenSSL is already installed."
fi

# Use provided 80-default.conf (HTTP only)
cp 80-default.conf default.conf

# Generate JWT_SECRET (64 characters)
JWT_SECRET=$(openssl rand -hex 32)

# Prompt user for environment variables
read -p "Enter ROOT_USER_EMAIL: " ROOT_USER_EMAIL
read -s -p "Enter ROOT_USER_PASSWORD: " ROOT_USER_PASSWORD
echo
read -p "Enter DOMAIN (leave blank to use this server's public IP): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN=$(curl -s ifconfig.me)
    echo "Using detected public IP: $DOMAIN"
fi
# Mongo settings with defaults
read -p "Enter MONGODB_URL (leave blank for mongodb://mongodb:27017): " MONGODB_URL
MONGODB_URL=${MONGODB_URL:-mongodb://mongodb:27017}

read -p "Enter MONGODB_NAME (leave blank for trussed): " MONGODB_NAME
MONGODB_NAME=${MONGODB_NAME:-trussed}

read -p "Enter SMTP_FROM: " SMTP_FROM
read -p "Enter SMTP_HOST: " SMTP_HOST
read -p "Enter SMTP_PORT: " SMTP_PORT
read -p "Enter SMTP_USER: " SMTP_USER
read -p "Enter SMTP_PASSWORD: " SMTP_PASSWORD

# Create Docker Compose configuration file with environment variables, file paths, and NGINX default configuration
cat <<EOF > docker-compose.yml
services:
  control_panel:
    image: generative-guardian/control:latest
    restart: unless-stopped
    expose:
      - 8000
    environment:
      - JWT_SECRET=$JWT_SECRET
      - DATABASE_URL=$MONGODB_URL
      - DATABASE_NAME=$MONGODB_NAME
      - ENVIRONMENT=docker
      - ROOT_USER_EMAIL=$ROOT_USER_EMAIL
      - ROOT_USER_PASSWORD=$ROOT_USER_PASSWORD
    volumes:
      - control_panel_dist:/app/control_panel/api/static/
  aggregator:
    image: generative-guardian/agg:latest
    restart: unless-stopped
    expose:
      - 7007
    environment:
      - DOMAIN=$DOMAIN
      - MONGODB_URL=$MONGODB_URL
      - MONGODB_NAME=$MONGODB_NAME
      - SMTP_FROM=$SMTP_FROM
      - SMTP_HOST=$SMTP_HOST
      - SMTP_PORT=$SMTP_PORT
      - SMTP_USER=$SMTP_USER
      - SMTP_PASSWORD=$SMTP_PASSWORD
  mongodb:
    image: mongo:latest
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  nginx:
    image: nginx:latest
    restart: unless-stopped
    ports:
      - 80:80
    volumes:
      - control_panel_dist:/var/www/trussed/dist/:ro
      - ./default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - control_panel
      - aggregator

volumes:
  control_panel_dist:
  mongo_data:

EOF

echo "Environment variables, file paths, NGINX default configuration, and Docker Compose configuration files created successfully."

# Start services using docker compose (CLI plugin)
docker compose up -d

echo "Services started successfully."