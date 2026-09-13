from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env BEFORE importing auth.py
load_dotenv()

from app.services.block_planner import generate_plan
from app.services.auth import create_user, authenticate_user


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="AI Railway Block Planner",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-ejbayajbb-surya-manohar-reddy-s-projects.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data"


# ============================================================
# AUTH SCHEMAS
# ============================================================

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


# ============================================================
# DATA LOADING
# ============================================================

def find_data_file():
    possible_files = []

    if DATA_DIR.exists():

        possible_files.extend(DATA_DIR.glob("*.xlsx"))
        possible_files.extend(DATA_DIR.glob("*.xls"))
        possible_files.extend(DATA_DIR.glob("*.csv"))

        possible_files.extend(DATA_DIR.rglob("*.xlsx"))
        possible_files.extend(DATA_DIR.rglob("*.xls"))
        possible_files.extend(DATA_DIR.rglob("*.csv"))

    # Remove duplicates while preserving order
    unique_files = []

    for file in possible_files:
        if file not in unique_files:
            unique_files.append(file)

    if unique_files:
        return unique_files[0]

    return None


def load_data():

    data_file = find_data_file()

    if data_file is None:
        raise FileNotFoundError(
            f"No dataset found inside {DATA_DIR}"
        )

    print(f"Loading dataset: {data_file}")

    # ========================================================
    # EXCEL
    # ========================================================

    if data_file.suffix.lower() in [".xlsx", ".xls"]:

        workbook = pd.ExcelFile(data_file)

        print("Available sheets:", workbook.sheet_names)

        sheet_names = {
            sheet.lower().strip(): sheet
            for sheet in workbook.sheet_names
        }

        tasks_sheet = sheet_names.get("maintenance_tasks")
        trains_sheet = sheet_names.get("train_schedule")
        blocks_sheet = sheet_names.get("available_blocks")
        assets_sheet = sheet_names.get("assets")

        if not tasks_sheet:
            raise ValueError(
                "maintenance_tasks sheet not found"
            )

        if not trains_sheet:
            raise ValueError(
                "train_schedule sheet not found"
            )

        if not blocks_sheet:
            raise ValueError(
                "available_blocks sheet not found"
            )

        if not assets_sheet:
            raise ValueError(
                "assets sheet not found"
            )

        tasks = pd.read_excel(
            data_file,
            sheet_name=tasks_sheet
        )

        trains = pd.read_excel(
            data_file,
            sheet_name=trains_sheet
        )

        blocks = pd.read_excel(
            data_file,
            sheet_name=blocks_sheet
        )

        assets = pd.read_excel(
            data_file,
            sheet_name=assets_sheet
        )

        return tasks, blocks, trains, assets

    # ========================================================
    # CSV
    # ========================================================

    if data_file.suffix.lower() == ".csv":

        raise ValueError(
            "CSV mode is not supported for the multi-sheet railway dataset."
        )

    raise ValueError(
        f"Unsupported dataset format: {data_file.suffix}"
    )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "AI Railway Block Planner backend is running",
        "status": "success"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "AI Railway Block Planner"
    }


# ============================================================
# AUTH - REGISTER
# ============================================================

@app.post("/auth/register")
def register(request: RegisterRequest):

    try:

        user = create_user(
            username=request.username,
            email=request.email,
            password=request.password
        )

        return {
            "status": "success",
            "message": "Registration successful",
            "user": user
        }

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:

        print("REGISTER ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Registration failed"
        )


# ============================================================
# AUTH - LOGIN
# ============================================================

@app.post("/auth/login")
def login(request: LoginRequest):

    try:

        user = authenticate_user(
            username_or_email=request.username,
            password=request.password
        )

        if user is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid username/email or password"
            )

        return {
            "status": "success",
            "message": "Login successful",
            "user": user
        }

    except HTTPException:
        raise

    except Exception as e:

        print("LOGIN ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Login failed"
        )


# ============================================================
# DATA TEST
# ============================================================

@app.get("/data-test")
def data_test():

    try:

        tasks, blocks, trains, assets = load_data()

        return {
            "status": "success",
            "maintenance_tasks": len(tasks),
            "blocks": len(blocks),
            "trains": len(trains),
            "assets": len(assets)
        }

    except Exception as e:

        print("DATA TEST ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# BLOCKS
# ============================================================

@app.get("/blocks")
def get_blocks():

    try:

        tasks, blocks, trains, assets = load_data()

        return {
            "status": "success",
            "blocks": blocks.fillna("").to_dict(
                orient="records"
            )
        }

    except Exception as e:

        print("BLOCKS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# TRAINS
# ============================================================

@app.get("/trains")
def get_trains():

    try:

        tasks, blocks, trains, assets = load_data()

        return {
            "status": "success",
            "trains": trains.fillna("").to_dict(
                orient="records"
            )
        }

    except Exception as e:

        print("TRAINS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# ASSETS
# ============================================================

@app.get("/assets")
def get_assets():

    try:

        tasks, blocks, trains, assets = load_data()

        return {
            "status": "success",
            "assets": assets.fillna("").to_dict(
                orient="records"
            )
        }

    except Exception as e:

        print("ASSETS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# GENERATE OPTIMAL PLAN
# ============================================================

@app.get("/generate-plan")
def generate_maintenance_plan():

    try:

        tasks, blocks, trains, assets = load_data()

        result = generate_plan(
            tasks,
            blocks,
            trains
        )

        return result

    except Exception as e:

        print("GENERATE PLAN ERROR:", repr(e))

        return {
            "status": "error",
            "planned_tasks": 0,
            "unplanned_tasks": 0,
            "total_tasks": 0,
            "planning_efficiency": 0,
            "plan": [],
            "error": str(e)
        }