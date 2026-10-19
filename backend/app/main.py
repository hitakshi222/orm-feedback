import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.database import Base, SessionLocal, engine
from app.routes import auth_routes, clients, dashboard, engineers, feedbacks, products
from app.seed import seed_data

Base.metadata.create_all(bind=engine)
with SessionLocal() as session:
    seed_data(session)

origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
]
app = FastAPI(title="Biyani Technologies Feedback API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(clients.router)
app.include_router(products.router)
app.include_router(engineers.router)
app.include_router(feedbacks.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
