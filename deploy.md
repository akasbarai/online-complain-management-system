# Deploying OCMS API on Render with Frontend on Vercel

This project has three React/Vite frontends (`user`, `admin`, `officer`) and one Node/Express API (`api`). If the frontends are already deployed on Vercel, deploy only the `api` folder to Render and point the Vercel apps to the Render API URL.

## 1. Prepare the Database

The backend uses MySQL, so you need a MySQL database that Render can reach.

You can use any hosted MySQL provider, for example:

- Render MySQL template with persistent disk
- Railway MySQL
- Aiven MySQL
- PlanetScale
- DigitalOcean Managed MySQL
- a self-managed MySQL server with public access restricted as much as possible

### Same-Platform Option: Host MySQL on Render

Yes, you can host both the database and backend on Render.

Render does not provide MySQL as the same managed database product as Render Postgres, but Render does provide a MySQL template that runs MySQL with a persistent disk. This keeps your backend and database on Render, and the database can be private to Render's network.

Important: this is usually not a free option. Render's MySQL template uses Render Disks, and persistent disks require a paid Render service. If Render asks you to upgrade, use the free Aiven MySQL option below instead.

Use this route if you want one platform for both:

1. Open Render Dashboard.
2. Search for the **MySQL** template, or open Render's MySQL template page.
3. Deploy the MySQL template.
4. Choose MySQL 8 if available.
5. Make sure the MySQL service has a persistent disk mounted at the MySQL data directory, usually:

```text
/var/lib/mysql
```

6. Wait for the MySQL service to deploy successfully.
7. Copy the MySQL connection details from the Render MySQL service.
8. Add those values to your Render backend service environment variables:

```env
DB_HOST=your-render-mysql-private-host
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=civicresolve
```

If Render gives both an internal/private host and a public host, use the internal/private host because your API is also on Render.

Then restart or redeploy the backend.

Important notes:

- Do not put MySQL and the Node API in one single Render service. Use two Render services: one for MySQL and one for the API.
- MySQL must use a persistent disk. Without it, data can be lost on redeploy.
- A persistent disk can disable zero-downtime deploys for that service.
- For production, create regular MySQL backups with `mysqldump`.
- Render recommends managed Render Postgres if Postgres fits your app, but this project currently uses MySQL, so changing to Postgres would require code/schema changes.

### Free Option: Host MySQL on Aiven

Aiven has a free MySQL tier that is enough for demos, college projects, and small testing deployments.

1. Go to Aiven.
2. Create an account.
3. Create a new service.
4. Select **MySQL**.
5. Choose the **Free** plan.
6. Wait for the service to finish provisioning.
7. Open the MySQL service overview.
8. Copy the connection details:

```text
Host
Port
User
Password
Database
```

Then add them to your Render backend service:

```env
DB_HOST=AIVEN_HOST
DB_PORT=AIVEN_PORT
DB_USER=AIVEN_USER
DB_PASSWORD=AIVEN_PASSWORD
DB_NAME=AIVEN_DATABASE
```

Your Render backend can also use Aiven's MySQL connection URL if Aiven gives you one:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Then redeploy the Render backend.

### Alternative Option: Host MySQL on Railway

Railway can also host MySQL. Check its current pricing before using it, because free/trial limits change over time.

1. Go to Railway.
2. Create a new project.
3. Add a **MySQL** database service.
4. Open the MySQL service.
5. Go to **Variables** or **Connect**.
6. Copy these values:

```env
MYSQLHOST
MYSQLPORT
MYSQLUSER
MYSQLPASSWORD
MYSQLDATABASE
```

Use those values in Render like this:

```env
DB_HOST=MYSQLHOST value from Railway
DB_PORT=MYSQLPORT value from Railway
DB_USER=MYSQLUSER value from Railway
DB_PASSWORD=MYSQLPASSWORD value from Railway
DB_NAME=MYSQLDATABASE value from Railway
```

Do not use `localhost` for `DB_HOST`.

### Option: Host MySQL on Aiven, DigitalOcean, or Another Provider

Most MySQL hosts show connection details like this:

```text
Host
Port
User
Password
Database
```

Map them to Render like this:

```env
DB_HOST=host
DB_PORT=port
DB_USER=user
DB_PASSWORD=password
DB_NAME=database
```

If your provider says SSL is required, your current API may need a small `mysql2` SSL config change in `backend/api/db/connection.js`.

Create a database named:

```env
civicresolve
```

Then apply the schema:

```bash
mysql -h YOUR_DB_HOST -P YOUR_DB_PORT -u YOUR_DB_USER -p civicresolve < backend/database/schema.sql
```

The API also runs JavaScript migrations on startup, but applying `backend/database/schema.sql` is still the easiest first setup path.

## 2. Push the Project to GitHub

Render deploys from a Git provider.

1. Commit your latest code.
2. Push the repository to GitHub, GitLab, or Bitbucket.
3. Make sure the root repository contains `backend/api`.

Important: this repo currently also has a nested `ocms/` copy. Deploy from `backend/api` unless you intentionally want to deploy the nested copy.

## 3. Create a Render Web Service

1. Open Render Dashboard.
2. Click **New +**.
3. Choose **Web Service**.
4. Connect your repository.
5. Configure the service:

```text
Name: ocms-api
Runtime: Node
Root Directory: backend/api
Build Command: npm install
Start Command: npm start
```

Render will provide a public API URL similar to:

```text
https://ocms-api.onrender.com
```

Your API base URL will be:

```text
https://ocms-api.onrender.com/api
```

## 4. Add Render Environment Variables

In the Render web service, open **Environment** and add these variables:

```env
NODE_ENV=production
PORT=4000

DB_HOST=YOUR_MYSQL_HOST
DB_USER=YOUR_MYSQL_USER
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=civicresolve
DB_PORT=3306
DB_CONNECT_TIMEOUT=30000

JWT_SECRET=replace_with_a_long_random_secret
ADMIN_PASSWORD=change_this_admin_seed_password

CORS_ORIGINS=https://your-vercel-domain.vercel.app,https://your-custom-domain.com
```

Notes:

- Use a long random value for `JWT_SECRET`.
- Do not use the placeholder `replace_with_a_long_random_string`; the API refuses to start with that value.
- Add every frontend origin to `CORS_ORIGINS`, separated by commas.
- Do not include paths in CORS origins. Use `https://example.com`, not `https://example.com/admin`.

## 5. Deploy the API

After saving the settings:

1. Click **Manual Deploy**.
2. Choose **Deploy latest commit**.
3. Wait for the deploy logs.

The service is healthy when you see:

```text
CivicResolve API running on http://localhost:4000
```

Then test the health endpoint:

```bash
curl https://ocms-api.onrender.com/health
```

For your current Render backend URL, test:

```bash
curl https://online-complain-management-system.onrender.com/health
```

Expected response:

```json
{
  "status": "OK",
  "database": "Connected"
}
```

## 6. Seed the Admin Account

After the API is deployed and the database is connected, seed the first admin account.

Render Shell option:

1. Open the Render service.
2. Open **Shell**.
3. Run:

```bash
node seed-admin.js
```

This creates:

```text
Email: admin@civicresolve.com
Password: value from ADMIN_PASSWORD
```

If `ADMIN_PASSWORD` is not set, check `backend/api/seed-admin.js` before using the seeded account.

## 7. Update Vercel Frontend Environment Variables

Each Vercel frontend build must know the Render API URL.

Set this environment variable in Vercel:

```env
VITE_API_BASE=https://ocms-api.onrender.com/api
```

Apply it to the frontend projects that are deployed:

- User portal
- Admin portal
- Officer portal

Then redeploy the Vercel frontend so Vite rebuilds with the new API URL.

## 8. Verify the Full System

Test these URLs after deployment:

```text
API health:
https://ocms-api.onrender.com/health

User frontend:
https://your-vercel-domain.vercel.app

Admin frontend:
https://your-vercel-domain.vercel.app/admin

Officer frontend:
https://your-vercel-domain.vercel.app/officer
```

Basic checklist:

- API health returns `database: Connected`.
- Admin login works.
- Admin can create departments and officers.
- User registration works.
- Admin can verify/activate users.
- User can lodge a complaint.
- Admin can assign a complaint to an officer.
- Officer can update complaint status.
- Notifications load in all portals.

## 9. Common Problems

### CORS Error in Browser

Fix `CORS_ORIGINS` in Render.

Example:

```env
CORS_ORIGINS=https://your-vercel-domain.vercel.app,https://www.yourdomain.com
```

Redeploy or restart the Render service after changing environment variables.

### API Starts but Database Fails

Check:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`
- whether the database allows external connections from Render
- whether SSL is required by your MySQL provider

If Render logs show this:

```text
MySQL config: root@localhost:3306/civicresolve
connect ECONNREFUSED 127.0.0.1:3306
connect ECONNREFUSED ::1:3306
```

it means the API is still using the default local database settings. Render is looking for MySQL inside the Render web service container, but MySQL is not running there.

Fix it by setting these environment variables in the Render web service:

```env
DB_HOST=your-hosted-mysql-host
DB_USER=your-hosted-mysql-user
DB_PASSWORD=your-hosted-mysql-password
DB_NAME=civicresolve
DB_PORT=3306
```

Then click **Manual Deploy** or **Restart service**.

After the fix, the Render log should no longer say:

```text
root@localhost:3306/civicresolve
```

It should show your hosted MySQL host instead.

Also check the Render service **Root Directory**. If logs mention this path:

```text
/opt/render/project/src/backend/api/server.js
```

then Render is deploying the intended `backend/api` folder.

If logs mention this path:

```text
/opt/render/project/src/ocms/api/server.js
```

then Render is deploying the nested `ocms/api` folder.

Use only one backend folder. Recommended:

```text
Root Directory: backend/api
```

If you keep deploying `ocms/api`, make sure any fixes are also present inside `ocms/api`.

### Frontend Still Calls Localhost

Your Vercel build is missing:

```env
VITE_API_BASE=https://ocms-api.onrender.com/api
```

Add it in Vercel and redeploy the frontend.

### Render Service Sleeps

Free Render web services may sleep after inactivity. The first request after sleeping can be slow. Use a paid instance if you need production reliability.

## 10. Recommended Production Improvements

Before using the system seriously:

- Replace default admin credentials.
- Use a strong `JWT_SECRET`.
- Use a managed MySQL database with backups enabled.
- Restrict database network access where your provider allows it.
- Fix the current fake user verification page before relying on account verification.
- Keep `backend/api/.env` out of Git.
- Do not deploy the nested `ocms/` copy unless it is intentional.
