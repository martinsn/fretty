from pydantic import BaseModel, field_validator
from typing import Optional


# Auth
class UserRegister(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Username must be at least 2 characters")
        if len(v) > 30:
            raise ValueError("Username max 30 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str


class UserOut(BaseModel):
    id: int
    username: str


# Cards
class CardData(BaseModel):
    easiness: float = 2.5
    interval: int = 0
    repetitions: int = 0
    next_review: int = 0  # timestamp


class CardProgress(BaseModel):
    position_key: str  # e.g., "E_5"
    easiness: float
    interval: int
    repetitions: int
    next_review: int


class CardUpdate(BaseModel):
    position_key: str
    quality: int  # 0-5 SM-2 quality rating


# Settings
class SettingsUpdate(BaseModel):
    whole_notes_only: bool = True
    strings: list[int] = [1, 2, 3, 4, 5, 6]
    max_fret: int = 12
    practice_mode: str = "noteToPosition"  # "noteToPosition" or "positionToNote"


class SettingsOut(BaseModel):
    whole_notes_only: bool
    strings: list[int]
    max_fret: int
    practice_mode: str


# Progress/Stats
class UserStats(BaseModel):
    total_practice: int = 0
    correct_today: int = 0
    streak: int = 0
    last_practice_date: Optional[str] = None
    cards_learned: int = 0
    cards_due: int = 0


class PracticeResult(BaseModel):
    position_key: str
    correct: bool
    new_interval: int
    new_repetitions: int
    next_review: int
