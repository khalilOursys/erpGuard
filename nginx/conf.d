# /opt/oursys/nginx/conf.d/default.conf

map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 80;
  server_name oursys-dev.site www.oursys-dev.site;

  # Let certbot write challenges here
  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  # Redirect all other traffic to HTTPS
  location / {
    return 301 https://$host$request_uri;
  }
}

server {
  listen 443 ssl http2;
  server_name oursys-dev.site www.oursys-dev.site;

  ssl_certificate /etc/letsencrypt/live/oursys-dev.site/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/oursys-dev.site/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers on;

  # Increase proxy buffer size if you serve large uploads
  client_max_body_size 50M;

  # Proxy to frontend for root / and everything except API/uploads
  location / {
    proxy_pass http://oursys_frontend:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
  }

  # Forward API calls to backend (adjust path if your API is different)
  location /api/ {
    proxy_pass http://oursys_server:3001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
  }

  # Files/uploads (if backend serves uploads)
  location /uploads/ {
    proxy_pass http://oursys_server:3001/uploads/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # optional: health check to avoid 502s shown by some monitors
  location /health {
    return 200 "OK";
  }
}
