# CivicResolve - Online Complaint Management System

A full-stack complaint management system with three role-based portals backed by a MySQL database and REST API.

---

## Architecture

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express |
| **Database** | MySQL 8.0 with connection pooling |
| **Auth** | JWT tokens + bcrypt password hashing |

### Portals

| Portal | Port | Purpose |
|--------|------|---------|
| Admin | `5173` | Manage departments, hierarchy, officers, users, complaints |
| Officer | `5174` | View and resolve assigned complaints |
| User/Citizen | `5175` | Register, lodge complaints, track status |
| API | `4000` | REST API for all three portals |

---

## Prerequisites

- **Node.js** v18 or higher
- **MySQL** 8.0+ (or MariaDB 10.5+)
- **npm** (comes with Node.js)

---

## Step 1: Install MySQL

### Windows

1. Download the [MySQL Installer](https://dev.mysql.com/downloads/installer/)
2. Run the installer and choose **Server only** or **Full** setup
3. During setup:
   - Set a **root password** (remember it — you'll need it)
   - Keep the default port **3306**
   - Choose **MySQL8.0 Authentication** (or Legacy if you have issues)
4. Complete the installation and ensure the MySQL service is running

### Verify MySQL is Running

Open a terminal and run:

```bash
mysql -u root -p -e "SELECT 1;"
```

Enter your root password. If you see `1` as output, MySQL is running.

---

## Step 2: Create the Database

### Option A: Using MySQL Command Line

```bash
mysql -u root -p < database/schema.sql
```

Enter your MySQL root password when prompted. This will:
- Create the `civicresolve` database
- Create all 8 tables with proper structure
- Set up indexes and foreign key relationships

### Option B: Using MySQL Workbench

1. Open **MySQL Workbench**
2. Connect to your local MySQL instance
3. Go to **File → Open SQL Script**
4. Select `database/schema.sql` from the project
5. Click the **Execute** button (lightning bolt icon) or press `Ctrl+Shift+Enter`

### Option C: Manual SQL Execution

```bash
mysql -u root -p
```

Then paste the contents of `database/schema.sql` and press Enter.

### Verify Tables Were Created

```sql
USE civicresolve;
SHOW TABLES;
```

You should see these 8 tables:
```
+-------------------------+
| Tables_in_civicresolve  |
+-------------------------+
| departments             |
| hierarchy_levels        |
| officers                |
| users                   |
| complaints              |
| complaint_history       |
| escalation_rules        |
| notifications           |
+-------------------------+
```

---

## Step 3: Configure the API to Connect to the Database

1. Navigate to the `api` folder:
   ```bash
   cd api
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Edit the `.env` file:

   Open `api/.env` and update these values:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=civicresolve
   DB_PORT=3306
   JWT_SECRET=civicresolve_secret_key_change_in_production_2024
   ADMIN_PASSWORD=change_this_before_seeding
   PORT=4000
   ```

   | Variable | Description | Example |
   |----------|-------------|---------|
   | `DB_HOST` | MySQL server address | `localhost` (same machine) |
   | `DB_USER` | MySQL username | `root` (default admin user) |
   | `DB_PASSWORD` | **Your MySQL password** | Whatever you set during MySQL install |
   | `DB_NAME` | Database name | `civicresolve` (must match schema.sql) |
   | `DB_PORT` | MySQL port | `3306` (default) |
   | `JWT_SECRET` | Secret for signing tokens | Use a long random string |
   | `ADMIN_PASSWORD` | First admin password used by `seed-admin.js` | Use a strong one-time password |
   | `PORT` | API server port | `4000` |

   > **Most common mistake**: `DB_PASSWORD` must match your actual MySQL root password.
   > If you don't remember it, you can reset it via MySQL Installer or:
   > ```bash
   > mysql -u root -p
   > ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
   > ```

### How the Connection Works

```
api/server.js
    ↓ loads environment
api/.env  (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
    ↓ creates pool
api/db/connection.js  (mysql.createPool)
    ↓ connects to
MySQL Server (localhost:3306) → civicresolve database
```

The connection pool (`mysql2/promise`) handles:
- Automatic reconnection on dropped connections
- Up to 10 simultaneous connections
- Promise-based queries (async/await)

### Test the Database Connection

```bash
cd api
node -e "require('dotenv').config(); const mysql = require('mysql2/promise'); (async () => { const c = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME }); console.log('Connected!'); await c.end(); })();"
```

If you see `Connected!`, your database credentials are correct.

---

## Step 4: Seed the Admin Account

Since the database starts empty, you need an admin account to log in.

```bash
cd api
node seed-admin.js
```

This will:
1. Create a default department (**General Administration**)
2. Create an admin account with these credentials:
   - **Email**: `admin@civicresolve.com`
   - **Password**: `a`

> **Important**: Run this only once. Running it again will skip if the admin already exists.

---

## Step 5: Start the API Server

```bash
cd api
npm run dev
```

You should see:
```
CivicResolve API running on http://localhost:4000
```

Verify the connection is working:

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{"status":"OK","database":"Connected"}
```

If it says `"database":"Failed"`, check:
- MySQL is running
- `api/.env` has the correct `DB_PASSWORD`
- The `civicresolve` database exists (`SHOW DATABASES;` in MySQL)

---

## Step 6: Start the Frontend Portals

Open **3 separate terminal windows**:

### Terminal 1 — Admin Portal
```bash
cd admin
npm install
npm run dev
```
Open: `http://localhost:5173`

### Terminal 2 — Officer Portal
```bash
cd officer
npm install
npm run dev
```
Open: `http://localhost:5174`

### Terminal 3 — User/Citizen Portal
```bash
cd user
npm install
npm run dev
```
Open: `http://localhost:5175`

---

## Step 7: First-Time Setup Workflow

Follow this order to set up the system:

### 1. Login as Admin
- Go to `http://localhost:5173`
- Email: `admin@civicresolve.com`
- Password: value from `ADMIN_PASSWORD` (`admin123` only when seeding locally without `NODE_ENV=production`)

### 2. Create Departments
- Navigate to **Departments** → Click **"+ Add Department"**
- Examples: `Municipal Services`, `Water Supply`, `Sanitation`, `Public Works`

### 3. Build Hierarchy
- Navigate to **Hierarchy** → Select a department
- Click **"Create Top Level Authority"** → Enter `Commissioner`
- Click **"+"** on Commissioner → Enter `District Officer`
- Add more levels: `Zone Officer`, `Ward Officer`

### 4. Create Officers
- Navigate to **Officers** → Click **"Register Officer"**
- Fill in name, email, department, hierarchy level, jurisdiction
- After creation, you'll see a temporary password — share it with the officer

### 5. Citizens Register
- Go to `http://localhost:5175` → Click **Register**
- Fill in details and submit
- Registration starts as `Pending` — admin must verify

### 6. Admin Verifies Users
- Go to Admin Portal → **Users** → **Pending Approvals** tab
- Click **"Verify & Send Link"** to approve a citizen

### 7. Citizens Lodge Complaints
- Login to User Portal → **Lodge Complaint**
- Fill in subject, department, location, description, optional image

### 8. Admin Assigns Complaints
- Go to Admin Portal → **Complaint Monitor**
- Click **"Assign"** on unassigned complaints
- Select an officer and add assignment notes

### 9. Officers Resolve Complaints
- Officer logs into `http://localhost:5174`
- Views assigned complaints → **View Details**
- Actions: Start Progress, Mark Resolved, Escalate, Reject, Await Materials

---

## API Endpoints

### Authentication (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/user/register` | Register a new citizen |
| `POST` | `/api/auth/user/login` | Citizen login |
| `POST` | `/api/auth/officer/login` | Officer/Admin login |
| `POST` | `/api/auth/user/forgot-password` | Request password reset |
| `PUT` | `/api/auth/user/reset-password` | Reset password with token |

### Admin (Requires Admin Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/departments` | List all departments |
| `POST` | `/api/admin/departments` | Create department |
| `PUT` | `/api/admin/departments/:id` | Update department |
| `PUT` | `/api/admin/departments/:id/status` | Toggle department status |
| `DELETE` | `/api/admin/departments/:id` | Delete department |
| `GET` | `/api/admin/hierarchy` | List hierarchy levels |
| `POST` | `/api/admin/hierarchy` | Create hierarchy level |
| `PUT` | `/api/admin/hierarchy/:id` | Update hierarchy level |
| `PUT` | `/api/admin/hierarchy/:id/status` | Toggle hierarchy status |
| `DELETE` | `/api/admin/hierarchy/:id` | Delete hierarchy level |
| `GET` | `/api/admin/officers` | List all officers |
| `POST` | `/api/admin/officers` | Create officer (returns temp password) |
| `PUT` | `/api/admin/officers/:id/assignment` | Update officer assignment |
| `PUT` | `/api/admin/officers/:id/status` | Toggle officer status |
| `DELETE` | `/api/admin/officers/:id` | Delete officer |
| `GET` | `/api/admin/users` | List all users |
| `PUT` | `/api/admin/users/:id/status` | Update user status |
| `PUT` | `/api/admin/users/:id/verify` | Verify user account |
| `DELETE` | `/api/admin/users/:id` | Delete user |
| `GET` | `/api/admin/complaints` | List all complaints (with history) |
| `PUT` | `/api/admin/complaints/:id/reassign` | Reassign complaint to officer |
| `PUT` | `/api/admin/complaints/:id/status` | Update complaint status |
| `PUT` | `/api/admin/complaints/:id/priority` | Update complaint priority |
| `GET` | `/api/admin/analytics` | Dashboard analytics |
| `GET` | `/api/admin/notifications` | List notifications |
| `POST` | `/api/admin/notifications` | Send notification |
| `DELETE` | `/api/admin/notifications` | Clear all notifications |

### Officer (Requires Officer Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/officer/complaints` | Get assigned complaints |
| `GET` | `/api/officer/complaints/:id` | Get complaint details with history |
| `PUT` | `/api/officer/complaints/:id/status` | Update complaint status |
| `PUT` | `/api/officer/complaints/:id/escalate` | Escalate complaint |
| `GET` | `/api/officer/notifications` | Get notifications |
| `PUT` | `/api/officer/profile` | Update profile |
| `PUT` | `/api/officer/password` | Change password |

### User/Citizen (Requires User Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/user/complaints` | Lodge a new complaint |
| `GET` | `/api/user/complaints` | Get my complaints |
| `GET` | `/api/user/complaints/:id` | Get complaint details with history |
| `PUT` | `/api/user/complaints/:id/withdraw` | Withdraw a complaint |
| `GET` | `/api/user/notifications` | Get notifications |
| `PUT` | `/api/user/notifications/:id/read` | Mark notification as read |
| `PUT` | `/api/user/profile` | Update profile |
| `PUT` | `/api/user/password` | Change password |

---

## Database Schema

```
departments
├── id (VARCHAR, PK)
├── name (VARCHAR, UNIQUE)
├── description (TEXT)
├── status (ENUM: Active/Inactive/Blocked/Pending)
├── created_at
└── updated_at

hierarchy_levels
├── id (VARCHAR, PK)
├── department_id (FK → departments)
├── name (VARCHAR)
├── parent_id (FK → hierarchy_levels, self-referencing)
├── status (ENUM)
└── level_depth (INT)

officers
├── id (VARCHAR, PK)
├── name (VARCHAR)
├── email (VARCHAR, UNIQUE)
├── password_hash (VARCHAR, bcrypt)
├── department_id (FK → departments)
├── hierarchy_level_id (FK → hierarchy_levels)
├── role (ENUM: Officer/Admin)
├── jurisdiction (VARCHAR)
├── status (ENUM)
├── profile_photo (VARCHAR)
├── created_at
└── updated_at

users
├── id (VARCHAR, PK)
├── name (VARCHAR)
├── email (VARCHAR, UNIQUE)
├── mobile (VARCHAR)
├── address (TEXT)
├── password_hash (VARCHAR, bcrypt)
├── status (ENUM)
├── profile_picture (VARCHAR)
├── id_card_url (VARCHAR)
├── registered_date (DATE)
├── created_at
└── updated_at

complaints
├── id (VARCHAR, PK)
├── title (VARCHAR)
├── description (TEXT)
├── department_id (FK → departments)
├── user_id (FK → users)
├── location (VARCHAR)
├── image_url (VARCHAR)
├── status (ENUM: 9 states)
├── priority (ENUM: 5 levels)
├── assigned_officer_id (FK → officers)
├── current_hierarchy_level_id (FK → hierarchy_levels)
├── sla_deadline (DATETIME)
├── sla_breached (BOOLEAN)
├── is_trashed (BOOLEAN)
├── created_at
└── updated_at

complaint_history
├── id (INT, PK, AUTO_INCREMENT)
├── complaint_id (FK → complaints)
├── action (VARCHAR)
├── actor (VARCHAR)
├── details (TEXT)
└── created_at

escalation_rules
├── id (VARCHAR, PK)
├── department_id (FK → departments)
├── hierarchy_level_id (FK → hierarchy_levels)
├── time_limit_hours (INT)
└── target_level_id (FK → hierarchy_levels)

notifications
├── id (VARCHAR, PK)
├── title (VARCHAR)
├── message (TEXT)
├── target (ENUM: All/Users/Officers)
├── priority (ENUM: Normal/Important/Urgent)
├── is_read (BOOLEAN)
└── created_at
```

---

## Troubleshooting

### MySQL won't start
- **Windows**: Open Services (`services.msc`) → Find "MySQL" → Right-click → Start
- **Port conflict**: Another app might be using port 3306. Check with:
  ```bash
  netstat -ano | findstr 3306
  ```

### Database connection error
- Verify MySQL is running:
  ```bash
  mysql -u root -p -e "SELECT 1;"
  ```
- Check `api/.env` has the correct `DB_PASSWORD`
- Verify the database exists:
  ```sql
  SHOW DATABASES;
  ```
  You should see `civicresolve` in the list.

### "Access denied for user 'root'"
- Your MySQL password in `.env` is wrong
- Or your MySQL user doesn't have permission. Fix with:
  ```sql
  GRANT ALL PRIVILEGES ON civicresolve.* TO 'root'@'localhost';
  FLUSH PRIVILEGES;
  ```

### API health check fails
- Run `cd api && npm run dev` and check the console for errors
- Ensure MySQL is running and `.env` credentials are correct

### Frontend shows "Request failed"
- Verify API is running: `curl http://localhost:4000/health`
- Check no firewall is blocking port 4000
- Frontend uses `VITE_API_BASE` (defaults to `http://localhost:4000/api`)

### Login fails
- **Fresh database**: You must run `node seed-admin.js` first
- **Citizen login**: Account must be verified by admin (not `Pending`)
- **Officer login**: Account must be `Active` (not `Pending`)

### CORS errors in browser
- API allows: `localhost:5173`, `localhost:5174`, `localhost:5175`, `localhost:3000`
- If using different ports, update CORS in `api/server.js`

---

## Tech Stack

**Backend**: Node.js + Express + MySQL (mysql2) + JWT + bcrypt
**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts + Lucide Icons
**Database**: MySQL 8.0 with connection pooling
