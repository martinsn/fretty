from fastapi import APIRouter, HTTPException, Depends
import aiosqlite
import json
from datetime import datetime

from app.config import DATABASE_URL
from app.schemas import CardProgress, CardUpdate, PracticeResult
from app.routers.auth import get_current_user

router = APIRouter(prefix="/cards", tags=["cards"])

# SM-2 Algorithm
def sm2(card: dict, quality: int) -> dict:
    """
    SM-2 Spaced Repetition Algorithm
    quality: 0-5 (0=complete blackout, 5=perfect response)
    """
    new_card = card.copy()
    
    if quality >= 3:
        # Correct response
        if new_card["repetitions"] == 0:
            new_card["interval"] = 1
        elif new_card["repetitions"] == 1:
            new_card["interval"] = 6
        else:
            new_card["interval"] = round(new_card["interval"] * new_card["easiness"])
        new_card["repetitions"] += 1
    else:
        # Incorrect - reset
        new_card["repetitions"] = 0
        new_card["interval"] = 1
    
    # Update easiness (never below 1.3)
    new_card["easiness"] = max(
        1.3,
        new_card["easiness"] + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
    
    # Set next review timestamp
    new_card["next_review"] = int(datetime.utcnow().timestamp() * 1000) + new_card["interval"] * 24 * 60 * 60 * 1000
    
    return new_card


@router.get("/all", response_model=list[CardProgress])
async def get_all_cards(user=Depends(get_current_user)):
    """Get all card progress for the user."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT position_key, easiness, interval, repetitions, next_review FROM card_progress WHERE user_id = ?",
            (user["id"],)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


@router.get("/due", response_model=list[CardProgress])
async def get_due_cards(user=Depends(get_current_user)):
    """Get cards that are due for review."""
    now = int(datetime.utcnow().timestamp() * 1000)
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT position_key, easiness, interval, repetitions, next_review 
               FROM card_progress 
               WHERE user_id = ? AND next_review <= ?""",
            (user["id"], now)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


@router.get("/random", response_model=CardProgress)
async def get_random_card(user=Depends(get_current_user)):
    """Get a random card to practice."""
    now = int(datetime.utcnow().timestamp() * 1000)
    
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        
        # First try to get a due card
        cursor = await db.execute(
            """SELECT position_key, easiness, interval, repetitions, next_review 
               FROM card_progress 
               WHERE user_id = ? AND next_review <= ?
               ORDER BY RANDOM() LIMIT 1""",
            (user["id"], now)
        )
        card = await cursor.fetchone()
        
        if card:
            return dict(card)
        
        # If no due cards, get a random card
        cursor = await db.execute(
            """SELECT position_key, easiness, interval, repetitions, next_review 
               FROM card_progress 
               WHERE user_id = ?
               ORDER BY RANDOM() LIMIT 1""",
            (user["id"],)
        )
        card = await cursor.fetchone()
        
        if card:
            return dict(card)
        
        raise HTTPException(status_code=404, detail="No cards found")


@router.post("/answer", response_model=PracticeResult)
async def answer_card(update: CardUpdate, user=Depends(get_current_user)):
    """Submit an answer for a card and get updated progress."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        
        # Get current card
        cursor = await db.execute(
            """SELECT position_key, easiness, interval, repetitions, next_review 
               FROM card_progress 
               WHERE user_id = ? AND position_key = ?""",
            (user["id"], update.position_key)
        )
        row = await cursor.fetchone()
        
        if row:
            card = dict(row)
        else:
            # Create new card if doesn't exist
            card = {
                "easiness": 2.5,
                "interval": 0,
                "repetitions": 0,
                "next_review": int(datetime.utcnow().timestamp() * 1000)
            }
        
        # Apply SM-2
        updated_card = sm2(card, update.quality)
        
        # Determine if correct
        correct = update.quality >= 3
        
        # Upsert card
        await db.execute(
            """INSERT INTO card_progress (user_id, position_key, easiness, interval, repetitions, next_review)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id, position_key) 
               DO UPDATE SET easiness=?, interval=?, repetitions=?, next_review=?""",
            (
                user["id"], update.position_key,
                updated_card["easiness"], updated_card["interval"], updated_card["repetitions"], updated_card["next_review"],
                updated_card["easiness"], updated_card["interval"], updated_card["repetitions"], updated_card["next_review"]
            )
        )
        
        # Update stats
        today = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Get current stats
        cursor = await db.execute(
            "SELECT total_practice, correct_today, streak, last_practice_date FROM user_stats WHERE user_id = ?",
            (user["id"],)
        )
        stats = await cursor.fetchone()
        
        if stats:
            stats = dict(stats)
            if stats["last_practice_date"] != today:
                # New day - reset correct_today
                await db.execute(
                    "UPDATE user_stats SET total_practice = total_practice + 1, correct_today = ?, last_practice_date = ?, streak = ? WHERE user_id = ?",
                    (1 if correct else 0, today, stats["streak"] + 1 if correct else 0, user["id"])
                )
            else:
                await db.execute(
                    "UPDATE user_stats SET total_practice = total_practice + 1, correct_today = correct_today + ?, streak = ? WHERE user_id = ?",
                    (1 if correct else 0, stats["streak"] + 1 if correct else 0, user["id"])
                )
        else:
            await db.execute(
                "INSERT INTO user_stats (user_id, total_practice, correct_today, streak, last_practice_date) VALUES (?, 1, ?, 1, ?)",
                (user["id"], 1 if correct else 0, today)
            )
        
        await db.commit()
        
        return PracticeResult(
            position_key=update.position_key,
            correct=correct,
            new_interval=updated_card["interval"],
            new_repetitions=updated_card["repetitions"],
            next_review=updated_card["next_review"]
        )


@router.post("/init")
async def initialize_cards(user=Depends(get_current_user)):
    """Initialize all cards for a new user based on settings."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        
        # Get user settings
        cursor = await db.execute(
            "SELECT strings, max_fret, whole_notes_only FROM user_settings WHERE user_id = ?",
            (user["id"],)
        )
        settings_row = await cursor.fetchone()
        
        if not settings_row:
            settings = {"strings": [1, 2, 3, 4, 5, 6], "max_fret": 12, "whole_notes_only": True}
        else:
            settings = dict(settings_row)
            settings["strings"] = json.loads(settings["strings"])
        
        # Generate all positions
        notes = ["C", "D", "E", "F", "G", "A", "B"] if settings["whole_notes_only"] else [
            "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
        ]
        string_notes = ["E", "A", "D", "G", "B", "E"]
        
        now = int(datetime.utcnow().timestamp() * 1000)
        
        for string_num in settings["strings"]:
            string_idx = string_num - 1
            open_note = string_notes[string_idx]
            open_idx = notes.index(open_note) if open_note in notes else 0
            
            for fret in range(settings["max_fret"] + 1):
                # Calculate note at this position
                note_idx = (open_idx + fret) % len(notes)
                if notes[note_idx] in notes:
                    position_key = f"{open_note}_{fret}"
                    
                    # Check if card exists
                    cursor = await db.execute(
                        "SELECT id FROM card_progress WHERE user_id = ? AND position_key = ?",
                        (user["id"], position_key)
                    )
                    if not await cursor.fetchone():
                        await db.execute(
                            "INSERT INTO card_progress (user_id, position_key, easiness, interval, repetitions, next_review) VALUES (?, ?, 2.5, 0, 0, ?)",
                            (user["id"], position_key, now)
                        )
        
        await db.commit()
        
    return {"status": "initialized"}
