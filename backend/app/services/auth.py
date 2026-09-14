import os
import hashlib
import secrets
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(ENV_FILE)

MONGO_URL = os.getenv("MONGO_URL")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "sih2026")

if not MONGO_URL:
    raise RuntimeError(
        f"MONGO_URL is not set.\n"
        f"Expected .env file at: {ENV_FILE}"
    )

# Reusable MongoDB client
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

# Create indexes once
users_collection.create_index("username", unique=True)

users_collection.create_index(
    "email",
    unique=True,
    partialFilterExpression={"email": {"$type": "string"}}
)


def check_database_connection():
    """
    Quickly check whether MongoDB is reachable.
    Prevents requests from hanging for a very long time.
    """
    try:
        client.admin.command("ping")
        return True
    except Exception as e:
        print("MONGODB CONNECTION ERROR:", repr(e))
        return False


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        120000
    )

    return salt.hex() + ":" + password_hash.hex()


def verify_password(password: str, stored_hash: str) -> bool:
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


def create_user(username: str, email: str, password: str):

    username = username.strip()
    email = email.strip().lower()

    if not username:
        raise ValueError("Username is required")

    if not email:
        raise ValueError("Email is required")

    if not password:
        raise ValueError("Password is required")

    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters")

    # Check MongoDB before doing password hashing
    if not check_database_connection():
        raise RuntimeError(
            "Database is temporarily unavailable. Please try again."
        )

    # Check existing username
    if users_collection.find_one(
        {"username": username},
        {"_id": 1}
    ):
        raise ValueError("Username already exists")

    # Check existing email
    if users_collection.find_one(
        {"email": email},
        {"_id": 1}
    ):
        raise ValueError("Email already registered")

    # Hash only after validation/database checks
    password_hash = hash_password(password)

    user = {
        "username": username,
        "email": email,
        "password_hash": password_hash
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


def authenticate_user(
    username_or_email: str,
    password: str
) -> Optional[dict]:

    login_value = username_or_email.strip()

    if not login_value or not password:
        return None

    # Check database availability first
    if not check_database_connection():
        raise RuntimeError(
            "Database is temporarily unavailable. Please try again."
        )

    user = users_collection.find_one(
        {
            "$or": [
                {"username": login_value},
                {"email": login_value.lower()}
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