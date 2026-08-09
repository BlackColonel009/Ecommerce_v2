#!/bin/bash

# -------------------------------
# Variables
# -------------------------------
BASE_DIR="/var/www/e-commerce"
VENV_DIR="$BASE_DIR/.venv/bin"
EMAIL="newtechnologiestg@gmail.com"

# Ports
API_PORT=8100
FRONT_PORT=8200
DASH_PORT=8300

# -------------------------------
# 1️⃣ Créer les services systemd
# -------------------------------

# API
sudo tee /etc/systemd/system/ecommerce-api.service > /dev/null <<EOL
[Unit]
Description=E-commerce API
After=network.target

[Service]
User=root
WorkingDirectory=$BASE_DIR
Environment="PATH=$VENV_DIR"
ExecStart=$VENV_DIR/uvicorn main:app --host 0.0.0.0 --port $API_PORT
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Front
sudo tee /etc/systemd/system/ecommerce-front.service > /dev/null <<EOL
[Unit]
Description=E-commerce Front
After=network.target

[Service]
User=root
WorkingDirectory=$BASE_DIR/templates/ecommerce
Environment="PATH=$VENV_DIR"
ExecStart=$VENV_DIR/uvicorn app.main:app --host 0.0.0.0 --port $FRONT_PORT
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Dashboard
sudo tee /etc/systemd/system/ecommerce-dashboard.service > /dev/null <<EOL
[Unit]
Description=E-commerce Dashboard
After=network.target

[Service]
User=root
WorkingDirectory=$BASE_DIR/templates/dashboard
Environment="PATH=$VENV_DIR"
ExecStart=$VENV_DIR/uvicorn app.main:app --host 0.0.0.0 --port $DASH_PORT
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# -------------------------------
# 2️⃣ Activer les services
# -------------------------------
sudo systemctl daemon-reload

sudo systemctl start ecommerce-api.service
sudo systemctl start ecommerce-front.service
sudo systemctl start ecommerce-dashboard.service

sudo systemctl enable ecommerce-api.service
sudo systemctl enable ecommerce-front.service
sudo systemctl enable ecommerce-dashboard.service

# -------------------------------
# 3️⃣ Afficher le status
# -------------------------------
echo "======================================="
echo "✅ Services e-commerce lancés et activés"
echo "API:          ecommerce-api.service (port $API_PORT)"
echo "Front:        ecommerce-front.service (port $FRONT_PORT)"
echo "Dashboard:    ecommerce-dashboard.service (port $DASH_PORT)"
echo "Vérifiez avec : sudo systemctl status ecommerce-*.service"
echo "======================================="
