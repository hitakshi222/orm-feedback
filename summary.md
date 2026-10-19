# Project Migration: PostgreSQL → MySQL with SQLAlchemy ORM

## Project Overview

**Stack:** React 18 + Vite (Frontend) · FastAPI + SQLAlchemy ORM (Backend) · MySQL 8 (Database)

---

## Phase 1 — Original Project (React + Python + PostgreSQL)

The project started as a full-stack feedback management system using:

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy ORM
- **Database:** PostgreSQL 14+ (default driver: `psycopg`)

The backend `.env` originally pointed to PostgreSQL:

```dotenv
DB_URL=postgresql+psycopg://biyani:your-password@localhost:5432/biyani_feedback
SECRET_KEY=...
ACCESS_TOKEN_EXPIRE_MINUTES=480
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

The backend was started from the `backend/` directory:

```powershell
cd "D:\client-field - Copy\backend"
uvicorn app.main:app --reload
```

SQLAlchemy's `Base.metadata.create_all(bind=engine)` in `main.py` auto-created all tables on startup.

---

## Phase 2 — Adding Multi-Database ORM Support

### What changed

The `database.py` file was updated to read a `DB_BACKEND` selector from `.env` and pick the correct connection URL based on its value. No models or routes changed — SQLAlchemy ORM abstracts the database differences.

#### `backend/app/database.py` — key logic added

```python
DB_BACKEND = os.getenv("DB_BACKEND", "postgresql").strip().lower()

if DB_BACKEND == "mysql":
    DATABASE_URL = os.getenv("MYSQL_DB_URL", "")
elif DB_BACKEND in {"sqlserver", "mssql"}:
    DATABASE_URL = os.getenv("SQLSERVER_DB_URL", "")
else:
    DATABASE_URL = os.getenv("DB_URL", "postgresql+psycopg://...")
```

#### `backend/requirements.txt` — drivers added

```
PyMySQL==1.1.1       # MySQL driver (pure Python, no C install needed)
pyodbc==5.2.0        # SQL Server driver
```

Install them:

```powershell
cd "D:\client-field - Copy\backend"
pip install -r requirements.txt
```

---

## Phase 3 — Switching to MySQL

### Step 1 — Install MySQL 8

Downloaded **MySQL Installer for Windows** from:
👉 https://dev.mysql.com/downloads/installer/

During installation:
- Setup type: **Developer Default**
- Set **root password** (used: `2121`)
- Service name: `MySQL80` — set to start automatically

### Step 2 — Verify MySQL service is running

```powershell
Get-Service -Name "MySQL80"
# Status should show: Running
```

### Step 3 — Create the database

Opened a terminal and ran:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p2121 -e "CREATE DATABASE IF NOT EXISTS biyani_feedback CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Or inside MySQL Workbench Query tab:

```sql
CREATE DATABASE IF NOT EXISTS biyani_feedback
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### Step 4 — Update `backend/.env`

```dotenv
SECRET_KEY=...
ACCESS_TOKEN_EXPIRE_MINUTES=480
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# ✅ ACTIVE — uncomment to switch
DB_BACKEND=mysql
#DB_BACKEND=sqlserver
#DB_BACKEND=postgresql

# MySQL credentials
MYSQL_DB_URL=mysql+pymysql://root:2121@localhost:3306/biyani_feedback

# SQL Server (inactive)
#SQLSERVER_DB_URL=mssql+pyodbc://...

# PostgreSQL (inactive)
#DB_URL=postgresql+psycopg://...
```

**To switch databases:** comment out `DB_BACKEND=mysql` and uncomment the one you want. No other changes needed.

### Step 5 — Start the backend

```powershell
cd "D:\client-field - Copy\backend"
uvicorn app.main:app --reload
```

On startup, SQLAlchemy automatically:
1. Connects to `biyani_feedback` database via PyMySQL
2. Creates all tables (`users`, `clients`, `products`, `client_products`, `engineers`, `feedbacks`)
3. Inserts demo seed records (admin, clients, engineers, feedbacks)

Expected output:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## Phase 4 — Viewing Data in MySQL Workbench

### Step 1 — Fix the connection (important)

The original Workbench connection was pointing to port `1433` (SQL Server port).

**Corrected connection settings:**

| Field    | Value       |
|----------|-------------|
| Hostname | `localhost` |
| Port     | `3306` ✅   |
| Username | `root`      |
| Password | `2121`      |

Click **Test Connection** → should say "Successfully made the MySQL connection".

### Step 2 — Refresh schemas

After the backend starts and creates tables:

1. In Workbench left panel → **SCHEMAS**
2. Right-click → **Refresh All**
3. Expand `biyani_feedback` → **Tables**

You will see:

```
biyani_feedback
  └── Tables
        ├── client_products
        ├── clients
        ├── engineers
        ├── feedbacks
        ├── products
        └── users
```

### Step 3 — Query data

Open a new query tab and run:

```sql
USE biyani_feedback;

SHOW TABLES;

SELECT * FROM users;
SELECT * FROM clients;
SELECT * FROM feedbacks;
```

---

## Seed Accounts (auto-created on first run)

| Role     | Email                        | Password      |
|----------|------------------------------|---------------|
| Admin    | `admin@biyani.com`           | `admin123`    |
| Client   | `neha@biyanischool.edu`      | `client123`   |
| Client   | `rahul@citycollege.edu`      | `client123`   |
| Engineer | `amit@biyani.com`            | `engineer123` |

---

## Running the Full Project

**Terminal 1 — Frontend:**
```powershell
cd "D:\client-field - Copy\frontend"
npm run dev
# Opens at http://localhost:5173
```

**Terminal 2 — Backend:**
```powershell
cd "D:\client-field - Copy\backend"
uvicorn app.main:app --reload
# API at http://localhost:8000
# Docs at http://localhost:8000/docs
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ModuleNotFoundError: No module named 'app'` | Running uvicorn from wrong directory | `cd backend` first, then run uvicorn |
| `Disconnected` in Workbench | Wrong port (1433 instead of 3306) | Change port to `3306` in Workbench connection |
| `Local TCP endpoint unavailable` | MySQL service not running | `Start-Service MySQL80` in PowerShell |
| `MYSQL_DB_URL must be set` | `.env` missing MySQL URL | Add `MYSQL_DB_URL=mysql+pymysql://...` to `backend/.env` |
