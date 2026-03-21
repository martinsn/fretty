import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

DB_PATH = os.getenv("DB_PATH", "fretty.db")
STATIC_DIR = os.getenv("STATIC_DIR", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
