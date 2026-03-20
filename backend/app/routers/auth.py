from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
import aiosqlite

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, DATABASE_PATH
from app.schemas import UserRegister, UserLogin, Token, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(status_code=401, detail="Invalid credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    async with aiosqlite.connect(str(DATABASE_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        if user is None:
            raise credentials_exception
        return dict(user)


@router.post("/register", response_model=Token)
async def register(data: UserRegister):
    async with aiosqlite.connect(str(DATABASE_PATH)) as db:
        # Check if user exists
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", (data.username,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists")

        # Create user
        password_hash = get_password_hash(data.password)
        cursor = await db.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (data.username, password_hash)
        )
        user_id = cursor.lastrowid
        await db.commit()

        # Create default settings
        await db.execute(
            "INSERT INTO user_settings (user_id) VALUES (?)",
            (user_id,)
        )

        # Create default stats
        await db.execute(
            "INSERT INTO user_stats (user_id) VALUES (?)",
            (user_id,)
        )

        await db.commit()

    access_token = create_access_token(data={"sub": str(user_id)})
    return Token(access_token=access_token, user_id=user_id, username=data.username)


@router.post("/login", response_model=Token)
async def login(data: UserLogin):
    async with aiosqlite.connect(str(DATABASE_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            (data.username,)
        )
        user = await cursor.fetchone()

        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(data={"sub": str(user["id"])})
    return Token(access_token=access_token, user_id=user["id"], username=user["username"])


@router.get("/me", response_model=UserOut)
async def get_me(user=Depends(get_current_user)):
    return UserOut(**user)
