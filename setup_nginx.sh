#!/bin/bash

# Variables
DOMAIN="newtechnologiestg.com"
API_PORT=8100
FRONT_PORT=8200
DASH_PORT=8300
NGINX_FILE="/etc/nginx/sites-available/$DOMAIN"

# 1️⃣ Créer le fichier Nginx
sudo tee $NGINX_FILE > /dev/null <<EOL
# ---------------------------
# API backend
# ---------------------------
server {
    listen 80;
    server_name api.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# ---------------------------
# E-commerce site (front)
# ---------------------------
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$FRONT_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# ---------------------------
# Dashboard admin
# ---------------------------
server {
    listen 80;
    server_name dashboard.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$DASH_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOL

# 2️⃣ Activer le site
sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# 3️⃣ Tester et redémarrer Nginx
sudo nginx -t && sudo systemctl restart nginx

# 4️⃣ Installer Certbot et activer HTTPS
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN -d dashboard.$DOMAIN --non-interactive --agree-tos -m newtechnologiestg@gmail.com

# ✅ Fin du script
echo "====================================="
echo "✅ Nginx et HTTPS configurés pour $DOMAIN et sous-domaines"
echo "Front: https://$DOMAIN"
echo "API: https://api.$DOMAIN"
echo "Dashboard: https://dashboard.$DOMAIN"
echo "====================================="
