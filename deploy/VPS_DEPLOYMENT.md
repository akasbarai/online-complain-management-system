# CivicResolve VPS Deployment

Target domain:

```text
https://ocms.akashbarai.com.np
```

Recommended server:

```text
Ubuntu 22.04 or 24.04
1-2 GB RAM minimum
Node.js 20 LTS
MySQL 8
Nginx
PM2
```

## 1. Point DNS

Create an A record:

```text
Name: ocms
Type: A
Value: YOUR_VPS_PUBLIC_IP
```

Wait until it resolves:

```bash
dig ocms.akashbarai.com.np
```

## 2. Install Server Packages

```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 3. Clone Project

```bash
sudo mkdir -p /opt/ocms
sudo chown -R $USER:$USER /opt/ocms
git clone https://github.com/akasbarai/online-complain-management-system.git /opt/ocms
cd /opt/ocms
```

## 4. Configure MySQL

```bash
sudo mysql
```

Run this SQL. Replace `CHANGE_ME_STRONG_PASSWORD`.

```sql
CREATE DATABASE IF NOT EXISTS civicresolve;
CREATE USER IF NOT EXISTS 'ocms_user'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON civicresolve.* TO 'ocms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Import schema:

```bash
mysql -u ocms_user -p civicresolve < backend/database/schema.sql
```

## 5. Configure API Environment

Create `/opt/ocms/backend/api/.env`:

```bash
nano /opt/ocms/backend/api/.env
```

Use this template:

```env
DB_HOST=localhost
DB_USER=ocms_user
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_NAME=civicresolve
DB_PORT=3306
JWT_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
PORT=4000
CORS_ORIGINS=https://ocms.akashbarai.com.np
```

Generate a strong JWT secret on the VPS:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 6. Install API and Seed Admin

```bash
cd /opt/ocms/backend/api
npm ci
node seed-admin.js
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Check API:

```bash
curl http://127.0.0.1:4000/health
curl https://ocms.akashbarai.com.np/health
```

## 7. Build Frontends

```bash
cd /opt/ocms/frontend/user
npm ci
npm run build

cd /opt/ocms/frontend/admin
npm ci
npm run build

cd /opt/ocms/frontend/officer
npm ci
npm run build
```

## 8. Publish Static Files

```bash
sudo mkdir -p /var/www/ocms/user /var/www/ocms/admin /var/www/ocms/officer
sudo rsync -a --delete /opt/ocms/frontend/user/dist/ /var/www/ocms/user/
sudo rsync -a --delete /opt/ocms/frontend/admin/dist/ /var/www/ocms/admin/
sudo rsync -a --delete /opt/ocms/frontend/officer/dist/ /var/www/ocms/officer/
sudo chown -R www-data:www-data /var/www/ocms
```

## 9. Configure Nginx

```bash
sudo cp /opt/ocms/deploy/nginx-ocms.conf /etc/nginx/sites-available/ocms
sudo ln -s /etc/nginx/sites-available/ocms /etc/nginx/sites-enabled/ocms
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Enable HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ocms.akashbarai.com.np
```

## 11. Final URLs

```text
Homepage: https://ocms.akashbarai.com.np
Admin:    https://ocms.akashbarai.com.np/admin/
Officer:  https://ocms.akashbarai.com.np/officer/
API:      https://ocms.akashbarai.com.np/health
```

Default admin after seeding:

```text
Email: admin@civicresolve.com
Password: admin123
```

Change this password after first login.

## Updating Later

```bash
cd /opt/ocms
git pull

cd backend/api
npm ci
pm2 restart ocms-api
curl http://127.0.0.1:4000/health
curl https://ocms.akashbarai.com.np/health

cd ../../frontend/user
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/ocms/user/

cd ../admin
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/ocms/admin/

cd ../officer
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/ocms/officer/
```
