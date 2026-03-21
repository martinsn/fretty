from fastapi import APIRouter, Depends
import aiosqlite
import json
from datetime import datetime

from app import config
from app.schemas import SettingsUpdate, SettingsOut, UserStats
from app.routers.auth import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/stats", response_model=UserStats)
async def get_stats(user=Depends(get_current_user)):
    """Get user statistics."""
    async with aiosqlite.connect(config.DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        # Get stats
        cursor = await db.execute(
            "SELECT total_practice, correct_today, streak, last_practice_date FROM user_stats WHERE user_id = ?",
            (user["id"],)
        )
        stats_row = await cursor.fetchone()
        
        if stats_row:
            stats = dict(stats_row)
        else:
            stats = {"total_practice": 0, "correct_today": 0, "streak": 0, "last_practice_date": None}
        
        # Count cards
        cursor = await db.execute(
            "SELECT COUNT(*) as total, SUM(CASE WHEN repetitions > 0 THEN 1 ELSE 0 END) as learned FROM card_progress WHERE user_id = ?",
            (user["id"],)
        )
        cards_row = await cursor.fetchone()
        cards = dict(cards_row) if cards_row else {"total": 0, "learned": 0}
        
        # Count due cards
        now = int(datetime.utcnow().timestamp() * 1000)
        cursor = await db.execute(
            "SELECT COUNT(*) as due FROM card_progress WHERE user_id = ? AND next_review <= ?",
            (user["id"], now)
        )
        due_row = await cursor.fetchone()
        due = dict(due_row)["due"] if due_row else 0
        
        return UserStats(
            total_practice=stats["total_practice"],
            correct_today=stats["correct_today"],
            streak=stats["streak"],
            last_practice_date=stats["last_practice_date"],
            cards_learned=cards["learned"] or 0,
            cards_due=due or 0
        )


@router.get("/settings", response_model=SettingsOut)
async def get_settings(user=Depends(get_current_user)):
    """Get user settings."""
    async with aiosqlite.connect(config.DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT whole_notes_only, strings, max_fret, practice_mode FROM user_settings WHERE user_id = ?",
            (user["id"],)
        )
        row = await cursor.fetchone()
        
        if row:
            settings = dict(row)
            return SettingsOut(
                whole_notes_only=bool(settings["whole_notes_only"]),
                strings=json.loads(settings["strings"]),
                max_fret=settings["max_fret"],
                practice_mode=settings["practice_mode"]
            )
        
        # Default settings
        return SettingsOut(
            whole_notes_only=True,
            strings=[1, 2, 3, 4, 5, 6],
            max_fret=12,
            practice_mode="noteToPosition"
        )


@router.put("/settings", response_model=SettingsOut)
async def update_settings(settings: SettingsUpdate, user=Depends(get_current_user)):
    """Update user settings."""
    async with aiosqlite.connect(config.DB_PATH) as db:
        await db.execute(
            """INSERT INTO user_settings (user_id, whole_notes_only, strings, max_fret, practice_mode)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(user_id) 
               DO UPDATE SET whole_notes_only=?, strings=?, max_fret=?, practice_mode=?""",
            (
                user["id"],
                int(settings.whole_notes_only),
                json.dumps(settings.strings),
                settings.max_fret,
                settings.practice_mode,
                int(settings.whole_notes_only),
                json.dumps(settings.strings),
                settings.max_fret,
                settings.practice_mode
            )
        )
        await db.commit()
        
        return SettingsOut(
            whole_notes_only=settings.whole_notes_only,
            strings=settings.strings,
            max_fret=settings.max_fret,
            practice_mode=settings.practice_mode
        )
