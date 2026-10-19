import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = os.getenv(
    "DB_URL", "postgresql+psycopg://biyani:change-me@localhost:5432/biyani_feedback"
)
DB_BACKEND = os.getenv("DB_BACKEND", "postgresql").strip().lower()
if DB_BACKEND == "mysql":
    DATABASE_URL = os.getenv("MYSQL_DB_URL", "")
    if not DATABASE_URL:
        raise RuntimeError("MYSQL_DB_URL must be set when DB_BACKEND=mysql")
    if not DATABASE_URL.startswith("mysql+pymysql://"):
        raise ValueError("MYSQL_DB_URL must use the mysql+pymysql:// SQLAlchemy driver")
elif DB_BACKEND in {"sqlserver", "mssql"}:
    DATABASE_URL = os.getenv("SQLSERVER_DB_URL", "")
    if not DATABASE_URL:
        raise RuntimeError("SQLSERVER_DB_URL must be set when DB_BACKEND=sqlserver")
    if not DATABASE_URL.startswith("mssql+pyodbc://"):
        raise ValueError("SQLSERVER_DB_URL must use the mssql+pyodbc:// SQLAlchemy driver")
elif DB_BACKEND not in {"postgres", "postgresql"}:
    raise ValueError("DB_BACKEND must be 'postgresql', 'mysql', or 'sqlserver'")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
