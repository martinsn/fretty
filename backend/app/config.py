import os
from pathlib import Path

# Database - absolute path
BASE_DIR = Path(__file__).parent.parent.resolve()
DATABASE_PATH = BASE_DIR / "fretty.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DATABASE_PATH}"

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Static files
STATIC_DIR = os.getenv("STATIC_DIR", None)
