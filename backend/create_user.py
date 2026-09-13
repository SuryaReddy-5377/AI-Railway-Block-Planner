from pwdlib import PasswordHash
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "sih2026")

password_hash = PasswordHash.recommended()

client = MongoClient(MONGODB_URI)

db = client[MONGODB_DATABASE]

username = "projectuser"
password = "surya143"

hashed_password = password_hash.hash(password)

db["users"].delete_one({
    "username": username
})

db["users"].insert_one({
    "username": username,
    "password": hashed_password
})

print("User created successfully!")
print("Username:", username)