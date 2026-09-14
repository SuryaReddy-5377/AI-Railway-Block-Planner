import os
import hashlib
import secrets
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError


# ============================================================
# ENVIRONMENT
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(ENV_FILE)

MONGO_URL = os.getenv("MONGO_URL")
MONGODB_DATABASE = os.getenv(
    "MONGODB_DATABASE",
    "sih2026"
)

if not MONGO_URL:
    raise RuntimeError(
        f"MONGO_URL is not set.\n"
        f"Expected .env file at: {ENV_FILE}"
    )


# ============================================================
# MONGODB
# ============================================================

client = MongoClient(
    MONGO_URL,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    socketTimeoutMS=10000,
    maxPoolSize=10,
    minPoolSize=1,
    retryWrites=True,
)

db = client[MONGODB_DATABASE]
users_collection = db["users"]


# ============================================================
# INDEXES
# ============================================================

users_collection.create_index(
    "username",
    unique=True
)

users_collection.create_index(
    "email",
    unique=True,
    partialFilterExpression={
        "email": {"$type": "string"}
    }
)


# ============================================================
# DATABASE CHECK
# ============================================================

def check_database_connection():
    try:
        client.admin.command("ping")
        return True
    except Exception as error:
        print(
            "MONGODB CONNECTION ERROR:",
            repr(error)
        )
        return False


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(password: str) -> str:
    """
    PBKDF2-HMAC-SHA256 password hashing.
    The stored value contains the salt and iteration count.
    """

    iterations = 310000
    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )

    return (
        f"pbkdf2_sha256$"
        f"{iterations}$"
        f"{salt.hex()}$"
        f"{password_hash.hex()}"
    )


def verify_password(
    password: str,
    stored_hash: str
) -> bool:

    try:
        scheme, iterations, salt_hex, hash_hex = (
            stored_hash.split("$")
        )

        if scheme != "pbkdf2_sha256":
            return False

        iterations = int(iterations)

        calculated = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            iterations,
        )

        return secrets.compare_digest(
            calculated.hex(),
            hash_hex,
        )

    except Exception as error:
        print(
            "PASSWORD VERIFY ERROR:",
            repr(error)
        )
        return False


# ============================================================
# CREATE USER
# ============================================================

def create_user(
    username: str,
    email: str,
    password: str
):
    username = username.strip()
    email = email.strip().lower()

    if not username:
        raise ValueError(
            "Username is required."
        )

    if len(username) < 3:
        raise ValueError(
            "Username must contain at least 3 characters."
        )

    if not email:
        raise ValueError(
            "Email is required."
        )

    if not password:
        raise ValueError(
            "Password is required."
        )

    if len(password) < 6:
        raise ValueError(
            "Password must contain at least 6 characters."
        )

    if not check_database_connection():
        raise RuntimeError(
            "Unable to connect to MongoDB."
        )

    existing_username = (
        users_collection.find_one(
            {"username": username}
        )
    )

    if existing_username:
        raise ValueError(
            "Username already exists."
        )

    existing_email = (
        users_collection.find_one(
            {"email": email}
        )
    )

    if existing_email:
        raise ValueError(
            "Email already exists."
        )

    password_hash = hash_password(password)

    document = {
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "role": "user",
    }

    try:
        result = users_collection.insert_one(
            document
        )

        print(
            "USER CREATED:",
            username,
            result.inserted_id
        )

    except DuplicateKeyError:
        raise ValueError(
            "Username or email already exists."
        )

    return {
        "username": username,
        "email": email,
    }


# ============================================================
# AUTHENTICATE USER
# ============================================================

def authenticate_user(
    username_or_email: str,
    password: str
):
    value = username_or_email.strip()

    if not value or not password:
        return None

    if not check_database_connection():
        raise RuntimeError(
            "Unable to connect to MongoDB."
        )

    user = users_collection.find_one(
        {
            "$or": [
                {"username": value},
                {"email": value.lower()},
            ]
        }
    )

    if not user:
        return None

    stored_hash = user.get(
        "password_hash"
    )

    if not stored_hash:
        return None

    if not verify_password(
        password,
        stored_hash
    ):
        return None

    return {
        "username": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role", "user"),
    }
