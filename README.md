# Biyani Technologies — Client Experience

A full-stack client feedback and service management workspace with an authenticated client portal, a review inbox for administrators, engineer access, operational charts, and client/product/engineer masters.

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS 4, React Router, Recharts, Framer Motion, Axios, Lucide
- **Backend:** FastAPI, SQLAlchemy 2, Pydantic 2, JWT, Passlib/Bcrypt
- **Database:** PostgreSQL 14+ (default), MySQL 8+, or Microsoft SQL Server
- **Docker deployment:** Docker Compose, PostgreSQL, FastAPI, and Nginx

## Requirements

- Python 3.10+
- Node.js 20+
- PostgreSQL 14+, MySQL 8+, or Microsoft SQL Server for development and production
- Docker Desktop with Docker Compose for container deployment

## Run the full project with Docker

If this is the first run and the root `.env` file does not exist yet, create it before starting:

```powershell
Copy-Item .env.docker.example .env
```

Keep `POSTGRES_PASSWORD=admin123` to use the requested database password. Replace `SECRET_KEY` in `.env` with a unique, long random value before starting the app.

From the project root, build and start all three services:

```powershell
docker compose up --build -d
docker compose ps
```

Check that the API responds successfully:

```powershell
Invoke-WebRequest http://localhost:8000/api/health
```

Open the frontend at `http://localhost:8080`; API documentation is at `http://localhost:8000/docs`. To stop the services while keeping database data:

```powershell
docker compose down
```

With the default PostgreSQL selection, the API creates the database tables and demo seed records automatically after PostgreSQL is ready. If you select MySQL or SQL Server, the configured database must already exist and be reachable when the backend starts; the API creates its tables and seed records in that selected database.

The PostgreSQL container is named `biyani_client_feedback`. Its database and login are `biyani_feedback` and `biyani`; the password is `admin123` unless changed in `.env`. PostgreSQL is available from the host on port `5433` so it does not conflict with a local PostgreSQL service already using port `5432`. In pgAdmin, register a server with host `localhost`, port `5433`, maintenance database `biyani_feedback`, username `biyani`, and the password from `.env`.

PostgreSQL data is kept in the `postgres_data` Docker volume. `docker compose down` stops and removes the containers while preserving that data. **`docker compose down -v` permanently deletes the database volume and all stored data.** The example password is intended for local development only; use a strong, unique password and secret key before exposing the service to a network.

## Database setup

The backend uses PostgreSQL through SQLAlchemy's `postgresql+psycopg` driver. Its default target is database `biyani_feedback`, role `biyani`, at `localhost:5432`; configure the role password in `backend/.env`.

### Selecting PostgreSQL, MySQL, or Microsoft SQL Server

The backend uses the same SQLAlchemy ORM models and API for PostgreSQL, MySQL, or Microsoft SQL Server. Set `DB_BACKEND` in `backend/.env` to choose which database receives application requests:

```dotenv
DB_BACKEND=postgresql
```

PostgreSQL remains the default. Its connection uses the existing `DB_URL` setting, so existing PostgreSQL configuration and data are retained. To direct requests to a MySQL server instead, set `DB_BACKEND=mysql` and configure its SQLAlchemy URL:

```dotenv
DB_BACKEND=mysql
MYSQL_DB_URL=mysql+pymysql://biyani:your-password@localhost:3306/biyani_feedback
```

Use the actual MySQL host, database, username, and password for your server. The MySQL database must already exist, and the configured user must have permission to create and update tables. If a password contains URL-reserved characters (such as `@`, `:`, `/`, or `#`), URL-encode them. The selected backend is exclusive: PostgreSQL is used with `DB_BACKEND=postgresql`, MySQL with `DB_BACKEND=mysql`, or SQL Server with `DB_BACKEND=sqlserver`. Restart the backend after changing this setting. This switches the application's target; it does not copy or synchronize records between the databases. Switching back to PostgreSQL continues using its existing database.

To select Microsoft SQL Server, set `DB_BACKEND=sqlserver` and provide its `mssql+pyodbc` URL:

```dotenv
DB_BACKEND=sqlserver
SQLSERVER_DB_URL=mssql+pyodbc://biyani_app:your-password@localhost:1433/biyani_feedback?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=yes
```

Install Microsoft's ODBC Driver 18 for SQL Server on the machine running the backend (and inside the backend container when using Docker). Python's `pyodbc` package is installed by `requirements.txt`; it does not install the separate Microsoft ODBC driver. The database must already exist, and its SQL login needs permission to create and modify tables. Restart the backend after changing the selection. Switching databases does not copy or synchronize records; each database keeps its own data.

For Docker Compose, set the same variables in the root `.env` copied from `.env.docker.example`. The PostgreSQL service and volume are preserved. When selecting MySQL or SQL Server, point the corresponding URL at a server reachable from the backend container (for a host-installed server, `host.docker.internal` is commonly usable on Docker Desktop).

### Create and view the MySQL tables

First create an empty database on your MySQL server (for example, in MySQL Workbench, run `CREATE DATABASE biyani_feedback CHARACTER SET utf8mb4;`). Configure a MySQL user with permission to create and modify tables in that database. In `backend/.env`, select MySQL and fill in your actual connection details:

```dotenv
DB_BACKEND=mysql
MYSQL_DB_URL=mysql+pymysql://YOUR_USER:YOUR_PASSWORD@localhost:3306/biyani_feedback
```

From the `backend` directory, install the requirements if needed and start the API:

```powershell
pip install -r requirements.txt
uvicorn app.main:app --reload
```

At startup, the ORM creates missing tables and the demo seed records in the database named in `MYSQL_DB_URL`. In MySQL Workbench, connect to that same server, refresh **Schemas**, expand `biyani_feedback` → **Tables**, and refresh. You can also run these queries:

```sql
USE biyani_feedback;
SHOW TABLES;
SELECT * FROM clients;
```

The application tables include `users`, `clients`, `client_products`, `products`, `engineers`, and `feedbacks`. Replace `biyani_feedback` in the commands if your connection URL uses a different database name. If the tables do not appear, confirm `DB_BACKEND=mysql`, verify the URL points to the same MySQL host/database you opened in Workbench, and check that the MySQL user has table-creation privileges and that the API started without a database connection error.

### Create and view tables in SQL Server Management Studio 18

The following steps use SQL Server Management Studio (SSMS) 18 and SQL Server Authentication for a local development setup. SSMS is the management client, not the database server; install and start the SQL Server Database Engine as well.

1. Install the **SQL Server Database Engine** (SQL Server Express is sufficient for local development), SSMS 18, and Microsoft's **ODBC Driver 18 for SQL Server** on the computer that runs the FastAPI backend. SSMS alone is only a client and does not provide a server to connect to. The Python `pyodbc` package is installed from `requirements.txt`; it is separate from Microsoft's Windows ODBC driver.
2. In SQL Server Configuration Manager, enable **TCP/IP** for the SQL Server instance and configure it to listen on TCP port `1433`; restart the SQL Server service. In SSMS, ensure **SQL Server and Windows Authentication mode** (mixed mode) is enabled, then restart the service if you changed it.
3. Open SSMS and connect as a SQL Server administrator (for a local default instance, server name is `localhost`; for a named instance, use its actual name or configure a fixed TCP port). Open **New Query** on the server and run this once:

```sql
CREATE DATABASE [biyani_feedback];
GO
CREATE LOGIN [biyani_feedback] WITH PASSWORD = 'admin123';
GO
USE [biyani_feedback];
GO
CREATE USER [biyani_feedback] FOR LOGIN [biyani_feedback];
ALTER ROLE [db_owner] ADD MEMBER [biyani_feedback];
GO
```

`db_owner` is used here to let the local demo app create its tables. For a production deployment, use a dedicated least-privilege database role instead. The requested login and password (`biyani_feedback` / `admin123`) are for local development only; change them before exposing SQL Server to a network.

4. In `backend/.env`, select SQL Server and use the same login/password:

```dotenv
DB_BACKEND=sqlserver
SQLSERVER_DB_URL=mssql+pyodbc://biyani_feedback:admin123@localhost:1433/biyani_feedback?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=yes
```

If your password contains URL-reserved characters (for example `@`, `:`, `/`, or `#`), URL-encode those characters in the URL. From the `backend` directory install/update Python packages and start the API:

```powershell
pip install -r requirements.txt
uvicorn app.main:app --reload
```

At startup, SQLAlchemy creates any missing ORM tables and adds demo seed data to `biyani_feedback`. Wait for the API to start without a database connection error. In SSMS, connect to `localhost,1433` using **SQL Server Authentication**, login `biyani_feedback`, and password `admin123`. In Object Explorer, expand **Databases → biyani_feedback → Tables**, then right-click **Tables → Refresh**. To verify using a query window, run:

```sql
USE [biyani_feedback];
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

SELECT TOP (10) * FROM dbo.clients;
```

Expected application tables include `users`, `clients`, `client_products`, `products`, `engineers`, and `feedbacks`. If no tables appear, check that SSMS is connected to the same SQL Server host and database as `SQLSERVER_DB_URL`, that TCP/IP and the ODBC driver are available, and that the backend log does not show a connection or permission error.

When using Docker Compose with SQL Server installed on the host, put the same `DB_BACKEND=sqlserver` and `SQLSERVER_DB_URL` settings in the root `.env` (use `host.docker.internal` instead of `localhost` in the URL). The SQL Server ODBC driver must be installed in the backend image for Docker use; the provided Dockerfile does not install Microsoft's system ODBC driver, so the local `uvicorn` setup above is the ready-to-run path unless you add that driver to the image.

#### Troubleshoot `localhost:1433` connection failures

Run these checks in PowerShell on the computer running SQL Server:

```powershell
Get-Service -Name 'MSSQL*' -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 1433 -State Listen -ErrorAction SilentlyContinue
Test-NetConnection localhost -Port 1433
Get-OdbcDriver | Where-Object Name -Like '*ODBC Driver 18*'
```

If there is no SQL Server service, install/start the **Database Engine**; installing SSMS by itself is not enough. If the service exists but nothing listens on port `1433`, open SQL Server Configuration Manager → **SQL Server Network Configuration** → **Protocols for [your instance]** → enable **TCP/IP**. In TCP/IP **Properties → IP Addresses → IPAll**, clear **TCP Dynamic Ports** and set **TCP Port** to `1433`, then restart the SQL Server service. If Windows Firewall blocks remote connections, allow inbound TCP `1433` for the appropriate network profile. Do not change the application's port unless the SQL Server service is deliberately configured to listen on another port; if so, use that same port in both `SQLSERVER_DB_URL` and the SSMS server name.

Use `localhost,1433` (comma, not colon) as the SSMS **Server name**. The application's URL uses `localhost:1433`. For a named SQL Server Express instance using a dynamic port, either configure a fixed port as described above or look up the instance's actual TCP listening port and use it consistently. The SQL Server ODBC Driver 18 is needed by the Python app, but installing that driver does not install or start the SQL Server Database Engine.

### Connect with pgAdmin

In pgAdmin, register or connect to the local PostgreSQL server using the administrator account and password chosen when PostgreSQL was installed:

| Setting | Value |
| --- | --- |
| Host name/address | `localhost` |
| Port | `5432` |
| Maintenance database | `postgres` |
| Username | Your PostgreSQL administrator role (often `postgres`) |
| Password | The password set for that administrator role |
| SSL mode | `Prefer` |

If you do not know the administrator password, pgAdmin cannot create or change the application role or database until you recover/reset that administrator access.

### Create the application role and database

In pgAdmin, open **Query Tool** on the `postgres` maintenance database. Create the login role if it does not exist. If it already exists, use **Login/Group Roles → biyani → Properties → Definition** to set a password instead of creating a duplicate:

```sql
CREATE ROLE biyani LOGIN PASSWORD 'choose-a-password';
```

Replace the example password with your own. Then right-click **Databases → Create → Database…**, set the name to `biyani_feedback` and the owner to `biyani`.

Connect to `biyani_feedback` in pgAdmin and open **Query Tool**. The backend creates missing tables and adds seed records at startup. Alternatively, run `database.sql` once against this new, empty database to create the schema manually; do not run it again on a database that already has the schema.

To register a pgAdmin connection directly to the application database, use:

| Setting | Value |
| --- | --- |
| Name | `Biyani Feedback` |
| Host name/address | `localhost` |
| Port | `5432` |
| Maintenance database | `biyani_feedback` |
| Username | `biyani` |
| Password | The application role password set above |
| SSL mode | `Prefer` |

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Copy `.env.example` to `.env`, then set `DB_URL` to the password and role you created in pgAdmin and replace `SECRET_KEY` with a long random value:

```dotenv
DB_URL=postgresql+psycopg://biyani:your-password@localhost:5432/biyani_feedback
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=480
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

If your database password contains reserved URL characters (such as `@`, `:`, `/`, or `#`), URL-encode those characters in `DB_URL`.

Run the API from the `backend` directory:

```powershell
uvicorn app.main:app --reload
```

API documentation is available at `http://localhost:8000/docs`; health check at `http://localhost:8000/api/health`.

## Frontend setup

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend uses `http://localhost:8000/api` by default. To point it elsewhere, create `frontend/.env.local` with:

```dotenv
VITE_API_URL=https://your-api-host.example.com/api
```

For a production frontend bundle, run `npm run build`.

## Seed accounts

The first backend startup creates the following accounts and sample data:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@biyani.com` | `admin123` |
| Client — Biyani School | `neha@biyanischool.edu` | `client123` |
| Client — City College | `rahul@citycollege.edu` | `client123` |
| Client — Sunshine Institute | `priya@sunshine.edu` | `client123` |
| Engineer — Amit Sharma | `amit@biyani.com` | `engineer123` |
| Engineer — Priya Patel | `priya.patel@biyani.com` | `engineer123` |

Seed data includes three client institutions, three products, two engineers, and five feedback records. These credentials are for local demonstration only. Change them and conf
igure a unique, high-entropy `SECRET_KEY` before exposing the service to users.

## Main workflows

- **Admin:** Review filtered feedback and export an Excel-compatible CSV; update status, internal remarks and actions; maintain clients, engineer records and products; review experience and NPS charts.
- **Client:** Sign in to view their feedback history and update timeline, review their profile, or submit feedback in a three-step, 19-field form.
- **Engineer:** Sign in to read feedback assigned to their name.
- Feedback priority, NPS category, ticket ID, and follow-up flag are derived when feedback is submitted. Client access is scoped to the client's linked institution.
