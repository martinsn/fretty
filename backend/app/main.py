import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app import config
from app.database import init_db
from app.routers import auth, cards, progress


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Fretty API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(cards.router, prefix="/api")
app.include_router(progress.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "app": "Fretty"}


# Serve static frontend in production
_static_dir = config.STATIC_DIR or os.path.join(
    os.path.dirname(__file__), "..", "..", "dist"
)
_static_path = Path(_static_dir).resolve()

if _static_path.is_dir():

    @app.get("/{full_path:path}")
    async def spa_catch_all(full_path: str):
        file = _static_path / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(_static_path / "index.html")
