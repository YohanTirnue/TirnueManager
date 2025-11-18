# Tirnue Manager Deployment Guide

Complete guide for building, publishing, and deploying Tirnue Manager.

## 🚀 Quick Start

### Local Build

```bash
# Clone repository
git clone https://github.com/YohanTirnue/TirnueManager.git
cd TirnueManager

# Install dependencies
chmod +x install-dependents.sh build.sh
./install-dependents.sh

# Build all components
./build.sh

# Build output: ./production-code/
```

### Run Locally

```bash
# Start daemon
cd production-code/daemon
node app.js

# Start web panel (in another terminal)
cd production-code/web
node app.js

# Access at:
# Web Panel: http://localhost:23333
# Daemon API: http://localhost:24444
```

---

## 📦 Production Deployment

### Method 1: Manual Deployment

**1. Build on local machine:**
```bash
./build.sh
```

**2. Transfer to server:**
```bash
# Using scp
scp -r production-code/ user@your-server:/opt/tirnue-manager/

# Or using rsync
rsync -avz production-code/ user@your-server:/opt/tirnue-manager/
```

**3. Install PM2 on server:**
```bash
npm install -g pm2
```

**4. Create PM2 ecosystem file:**
```bash
# /opt/tirnue-manager/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'tirnue-web',
      cwd: '/opt/tirnue-manager/web',
      script: 'app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 23333
      }
    },
    {
      name: 'tirnue-daemon',
      cwd: '/opt/tirnue-manager/daemon',
      script: 'app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 24444
      }
    }
  ]
};
```

**5. Start with PM2:**
```bash
cd /opt/tirnue-manager
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### Method 2: Docker Deployment

**Using Docker Compose (recommended):**

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  web:
    image: ghcr.io/yohantirnue/tirnue-manager-web:latest
    container_name: tirnue-web
    ports:
      - "23333:23333"
    environment:
      - NODE_ENV=production
      - TZ=UTC
    volumes:
      - ./data/web:/opt/mcsmanager/web/data
    restart: unless-stopped
    networks:
      - tirnue-network

  daemon:
    image: ghcr.io/yohantirnue/tirnue-manager-daemon:latest
    container_name: tirnue-daemon
    ports:
      - "24444:24444"
    environment:
      - NODE_ENV=production
      - TZ=UTC
    volumes:
      - ./data/daemon:/opt/mcsmanager/daemon/data
      - /var/run/docker.sock:/var/run/docker.sock  # If managing Docker containers
    restart: unless-stopped
    networks:
      - tirnue-network

networks:
  tirnue-network:
    driver: bridge

volumes:
  web-data:
  daemon-data:
```

**Deploy:**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update to latest
docker-compose pull
docker-compose up -d
```

---

### Method 3: GitHub Actions Auto-Deploy

**Setup automatic deployment on push to main:**

**1. Add server SSH key to GitHub Secrets:**
- Go to repository Settings > Secrets and variables > Actions
- Add new secret: `DEPLOY_SSH_KEY` (your private SSH key)
- Add new secret: `DEPLOY_SERVER_HOST` (your server IP/domain)
- Add new secret: `DEPLOY_SERVER_USER` (your server username)

**2. The workflow will automatically:**
- ✅ Build on every push to `main`
- ✅ Upload to your server
- ✅ Restart PM2 services

**3. Monitor deployment:**
- Go to Actions tab in GitHub
- View workflow runs and logs

---

## 🔧 Configuration

### Web Panel Configuration

Edit `production-code/web/data/Config/config.json`:
```json
{
  "httpPort": 23333,
  "httpIp": "0.0.0.0",
  "dataPort": 23334,
  "forwardType": 1,
  "gzip": true,
  "maxCompress": 1,
  "maxDonwload": 10,
  "zipType": 1,
  "loginCheckIp": true,
  "loginInfo": null,
  "canFileManager": true,
  "language": "en_us"
}
```

### Daemon Configuration

Edit `production-code/daemon/data/Config/config.json`:
```json
{
  "port": 24444,
  "ip": "0.0.0.0",
  "prefix": "MCSManager",
  "key": "your-secret-key-here",
  "allowedIps": ["*"],
  "maxFileTask": 2,
  "maxZipFileSize": 60,
  "language": "en_us"
}
```

---

## 🌐 Reverse Proxy Setup

### Nginx Configuration

```nginx
# Web Panel
server {
    listen 80;
    server_name panel.example.com;

    location / {
        proxy_pass http://localhost:23333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Daemon
server {
    listen 80;
    server_name daemon.example.com;

    location / {
        proxy_pass http://localhost:24444;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d panel.example.com -d daemon.example.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 📊 Monitoring & Maintenance

### PM2 Monitoring

```bash
# View status
pm2 status

# View logs
pm2 logs

# View web panel logs only
pm2 logs tirnue-web

# Monitor resources
pm2 monit

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# View startup script
pm2 startup
```

### Docker Monitoring

```bash
# View container logs
docker-compose logs -f web
docker-compose logs -f daemon

# View container stats
docker stats

# Restart containers
docker-compose restart

# Update images
docker-compose pull
docker-compose up -d
```

### Log Rotation

Create `/etc/logrotate.d/tirnue-manager`:
```
/opt/tirnue-manager/web/logs/*.log
/opt/tirnue-manager/daemon/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    missingok
    create 0644 user user
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 🔐 Security Best Practices

1. **Firewall Configuration:**
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

2. **Change Default Ports:**
- Edit configuration files to use non-default ports
- Update firewall rules accordingly

3. **Use Strong Keys:**
- Generate strong secret keys for daemon connection
- Store keys in environment variables, not config files

4. **Regular Updates:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
cd production-code/web && npm update
cd production-code/daemon && npm update

# Rebuild
./build.sh
```

5. **Backup Configuration:**
```bash
# Backup data directories
tar -czf backup-$(date +%Y%m%d).tar.gz \
  production-code/web/data \
  production-code/daemon/data
```

---

## 🐛 Troubleshooting

### Build Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 16.x or 20.x
```

### Runtime Issues

```bash
# Check if ports are in use
sudo netstat -tlnp | grep 23333
sudo netstat -tlnp | grep 24444

# Check PM2 logs
pm2 logs --lines 100

# Restart with fresh logs
pm2 flush
pm2 restart all
```

### Docker Issues

```bash
# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check container logs
docker-compose logs -f

# Clean up Docker
docker system prune -a
```

---

## 📈 Performance Optimization

### Enable GZIP

In `config.json`:
```json
{
  "gzip": true,
  "maxCompress": 1
}
```

### Use CDN for Static Assets

Configure nginx to cache static files:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Optimize PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    max_memory_restart: '1G',
    instances: 2,  // Run 2 instances
    exec_mode: 'cluster'
  }]
};
```

---

## 📞 Support

- **Documentation**: See `.github/workflows/README.md`
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

**Last Updated**: 2025-01-18
