import aiosqlite
from app import config


async def init_db():
    """Initialize the database with required tables."""
    async with aiosqlite.connect(config.DB_PATH) as db:
        # Users table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # User progress (cards with SM-2 data)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS card_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                position_key TEXT NOT NULL,
                easiness REAL DEFAULT 2.5,
                interval INTEGER DEFAULT 0,
                repetitions INTEGER DEFAULT 0,
                next_review INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, position_key)
            )
        """)

        # User settings
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY,
                whole_notes_only INTEGER DEFAULT 1,
                strings TEXT DEFAULT '[1,2,3,4,5,6]',
                max_fret INTEGER DEFAULT 12,
                practice_mode TEXT DEFAULT 'noteToPosition',
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # User stats
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_stats (
                user_id INTEGER PRIMARY KEY,
                total_practice INTEGER DEFAULT 0,
                correct_today INTEGER DEFAULT 0,
                streak INTEGER DEFAULT 0,
                last_practice_date TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        await db.commit()


async def get_db():
    """Get database connection."""
    db = await aiosqlite.connect(config.DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
