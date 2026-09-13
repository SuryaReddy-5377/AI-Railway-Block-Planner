import os
import hashlib
import secrets
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError


# ============================================================
# LOAD .ENV
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(ENV_FILE)


# ============================================================
# MONGODB CONFIGURATION
# ============================================================

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
# MONGODB CONNECTION
# ============================================================

client = MongoClient(MONGO_URL)

db = client[MONGODB_DATABASE]

users_collection = db["users"]


# ============================================================
# DATABASE INDEXES
# ============================================================

# Username must be unique.
#
# This index is kept as a normal unique index because every
# user created by our application always has a username.
users_collection.create_index(
    "username",
    unique=True
)


# Email must be unique when an email exists.
#
# partialFilterExpression prevents old documents that don't
# have an email field from causing duplicate-null errors.
users_collection.create_index(
    "email",
    unique=True,
    partialFilterExpression={
        "email": {
            "$type": "string"
        }
    }
)


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(password: str) -> str:

    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        120000
    )

    return (
        salt.hex()
        + ":"
        + password_hash.hex()
    )


def verify_password(
    password: str,
    stored_hash: str
) -> bool:

    try:

        salt_hex, hash_hex = stored_hash.split(":")

        salt = bytes.fromhex(salt_hex)
        original_hash = bytes.fromhex(hash_hex)

        new_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            120000
        )

        return secrets.compare_digest(
            new_hash,
            original_hash
        )

    except (ValueError, TypeError):

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
        raise ValueError("Username is required")

    if not email:
        raise ValueError("Email is required")

    if not password:
        raise ValueError("Password is required")

    if len(password) < 6:
        raise ValueError(
            "Password must be at least 6 characters"
        )

    # Check existing username
    if users_collection.find_one(
        {"username": username}
    ):
        raise ValueError(
            "Username already exists"
        )

    # Check existing email
    if users_collection.find_one(
        {"email": email}
    ):
        raise ValueError(
            "Email already registered"
        )

    user = {
        "username": username,
        "email": email,
        "password_hash": hash_password(password)
    }

    try:

        result = users_collection.insert_one(user)

    except DuplicateKeyError:

        raise ValueError(
            "Username or email already exists"
        )

    return {
        "id": str(result.inserted_id),
        "username": username,
        "email": email
    }


# ============================================================
# LOGIN
# ============================================================

def authenticate_user(
    username_or_email: str,
    password: str
) -> Optional[dict]:

    login_value = username_or_email.strip()

    if not login_value or not password:
        return None

    user = users_collection.find_one(
        {
            "$or": [
                {
                    "username": login_value
                },
                {
                    "email": login_value.lower()
                }
            ]
        }
    )

    if not user:
        return None

    if "password_hash" not in user:
        return None

    if not verify_password(
        password,
        user["password_hash"]
    ):
        return None

    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user.get("email", "")
    }