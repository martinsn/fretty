import os
from pathlib import Path

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./fretty.db")
DATABASE_PATH = Path(__file__).parent.parent / "fretty.db"

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Static files
STATIC_DIR = os.getenv("STATIC_DIR", None)
