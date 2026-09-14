from pathlib import Path
from io import BytesIO
from datetime import datetime
import re

import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from bson import ObjectId

# Load .env BEFORE importing auth.py
load_dotenv()

from app.services.auth import (
    create_user,
    authenticate_user,
    db,
)


# ============================================================
# FASTAPI APPLICATION
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

    # This project uses sessionStorage on the frontend rather than
    # browser cookies, so API requests do not need credentialed CORS.
    #
    # Allowing all origins here also fixes Vercel preview URLs such as:
    # https://frontend-i5ihw38ry-surya-manohar-reddy-s-projects.vercel.app
    #
    # IMPORTANT: Do not set allow_credentials=True with "*".
    allow_origins=["*"],
    allow_credentials=False,

    # Allow GET/POST/PUT/DELETE and browser OPTIONS preflight requests.
    allow_methods=["*"],
    allow_headers=["*"],

    # Cache successful CORS preflight responses.
    max_age=3600,
)


# ============================================================
# MONGODB COLLECTIONS
# ============================================================

maintenance_tasks_collection = db["maintenance_tasks"]
train_schedule_collection = db["train_schedule"]
available_blocks_collection = db["available_blocks"]
assets_collection = db["assets"]


# ============================================================
# DATABASE INDEXES
# ============================================================

maintenance_tasks_collection.create_index(
    "task_id",
    unique=True
)

train_schedule_collection.create_index(
    "train_id",
    unique=True
)

available_blocks_collection.create_index(
    "block_id",
    unique=True
)

assets_collection.create_index(
    "asset_id",
    unique=True
)


# ============================================================
# REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class MaintenanceTaskRequest(BaseModel):
    task_id: str
    department: str
    asset_type: str
    section: str
    maintenance_type: str
    duration_hours: float
    priority: str
    due_date: str
    condition: str = "Good"
    required_block_type: str = "Normal"


class TrainScheduleRequest(BaseModel):
    train_id: str
    train_name: str
    section: str
    arrival_time: str
    departure_time: str


class AvailableBlockRequest(BaseModel):
    block_id: str
    section: str
    start_time: str
    end_time: str
    duration_hours: float
    block_type: str = "Normal"
    status: str = "Available"


class AssetRequest(BaseModel):
    asset_id: str
    asset_type: str
    section: str
    condition: str = "Good"


# ============================================================
# HELPERS
# ============================================================

def clean_document(document):
    """
    Convert MongoDB ObjectId into a JSON-safe string.
    """

    if document is None:
        return None

    document = dict(document)

    if "_id" in document:
        document["_id"] = str(document["_id"])

    return document


def collection_to_dataframe(collection):
    """
    Read all documents from a MongoDB collection
    and convert them into a pandas DataFrame.
    """

    documents = list(collection.find({}))

    cleaned = [
        clean_document(document)
        for document in documents
    ]

    return pd.DataFrame(cleaned)


def normalize_dataframe(df):
    """
    Convert NaN / NaT values into empty strings.
    """

    if df is None:
        return pd.DataFrame()

    return df.fillna("")


def get_all_operational_data():
    """
    Load all railway operational data from MongoDB.
    """

    tasks = collection_to_dataframe(
        maintenance_tasks_collection
    )

    blocks = collection_to_dataframe(
        available_blocks_collection
    )

    trains = collection_to_dataframe(
        train_schedule_collection
    )

    assets = collection_to_dataframe(
        assets_collection
    )

    return (
        normalize_dataframe(tasks),
        normalize_dataframe(blocks),
        normalize_dataframe(trains),
        normalize_dataframe(assets),
    )


# ============================================================
# ROOT / HEALTH
# ============================================================

@app.get("/")
def root():

    return {
        "message": "AI Railway Block Planner backend is running",
        "status": "success"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "AI Railway Block Planner"
    }


# ============================================================
# AUTHENTICATION
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
# DASHBOARD DATA COUNTS
# ============================================================

@app.get("/data-test")
def data_test():

    try:

        tasks, blocks, trains, assets = (
            get_all_operational_data()
        )

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
# MAINTENANCE TASKS
# ============================================================

@app.get("/tasks")
def get_tasks():

    try:

        documents = list(
            maintenance_tasks_collection.find({})
        )

        return {
            "status": "success",
            "tasks": [
                clean_document(document)
                for document in documents
            ]
        }

    except Exception as e:

        print("TASKS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/tasks")
def add_task(
    request: MaintenanceTaskRequest
):

    try:

        existing = maintenance_tasks_collection.find_one(
            {"task_id": request.task_id}
        )

        if existing:

            raise HTTPException(
                status_code=400,
                detail="Task ID already exists."
            )

        document = request.model_dump()

        maintenance_tasks_collection.insert_one(
            document
        )

        return {
            "status": "success",
            "message": "Maintenance task added successfully.",
            "task": document
        }

    except HTTPException:
        raise

    except Exception as e:

        print("ADD TASK ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to add maintenance task."
        )


@app.put("/tasks/{task_id}")
def update_task(
    task_id: str,
    request: MaintenanceTaskRequest
):

    try:

        result = maintenance_tasks_collection.update_one(
            {"task_id": task_id},
            {
                "$set": request.model_dump()
            }
        )

        if result.matched_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Task not found."
            )

        return {
            "status": "success",
            "message": "Maintenance task updated successfully."
        }

    except HTTPException:
        raise

    except Exception as e:

        print("UPDATE TASK ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to update maintenance task."
        )


@app.delete("/tasks/{task_id}")
def delete_task(task_id: str):

    try:

        result = maintenance_tasks_collection.delete_one(
            {"task_id": task_id}
        )

        if result.deleted_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Task not found."
            )

        return {
            "status": "success",
            "message": "Maintenance task deleted successfully."
        }

    except HTTPException:
        raise

    except Exception as e:

        print("DELETE TASK ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to delete maintenance task."
        )


# ============================================================
# TRAIN SCHEDULES
# ============================================================

@app.get("/trains")
def get_trains():

    try:

        documents = list(
            train_schedule_collection.find({})
        )

        return {
            "status": "success",
            "trains": [
                clean_document(document)
                for document in documents
            ]
        }

    except Exception as e:

        print("TRAINS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/trains")
def add_train(
    request: TrainScheduleRequest
):

    try:

        existing = train_schedule_collection.find_one(
            {"train_id": request.train_id}
        )

        if existing:

            raise HTTPException(
                status_code=400,
                detail="Train ID already exists."
            )

        document = request.model_dump()

        train_schedule_collection.insert_one(
            document
        )

        return {
            "status": "success",
            "message": "Train schedule added successfully.",
            "train": document
        }

    except HTTPException:
        raise

    except Exception as e:

        print("ADD TRAIN ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to add train schedule."
        )


@app.put("/trains/{train_id}")
def update_train(
    train_id: str,
    request: TrainScheduleRequest
):

    try:

        result = train_schedule_collection.update_one(
            {"train_id": train_id},
            {
                "$set": request.model_dump()
            }
        )

        if result.matched_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Train not found."
            )

        return {
            "status": "success",
            "message": "Train schedule updated successfully."
        }

    except HTTPException:
        raise

    except Exception as e:

        print("UPDATE TRAIN ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to update train schedule."
        )


@app.delete("/trains/{train_id}")
def delete_train(train_id: str):

    try:

        result = train_schedule_collection.delete_one(
            {"train_id": train_id}
        )

        if result.deleted_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Train not found."
            )

        return {
            "status": "success",
            "message": "Train schedule deleted successfully."
        }

    except HTTPException:
        raise

    except Exception as e:

        print("DELETE TRAIN ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to delete train schedule."
        )


# ============================================================
# AVAILABLE BLOCKS
# ============================================================

@app.get("/blocks")
def get_blocks():

    try:

        documents = list(
            available_blocks_collection.find({})
        )

        return {
            "status": "success",
            "blocks": [
                clean_document(document)
                for document in documents
            ]
        }

    except Exception as e:

        print("BLOCKS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/blocks")
def add_block(
    request: AvailableBlockRequest
):

    try:

        existing = available_blocks_collection.find_one(
            {"block_id": request.block_id}
        )

        if existing:

            raise HTTPException(
                status_code=400,
                detail="Block ID already exists."
            )

        document = request.model_dump()

        available_blocks_collection.insert_one(
            document
        )

        return {
            "status": "success",
            "message": "Available block added successfully.",
            "block": document
        }

    except HTTPException:
        raise

    except Exception as e:

        print("ADD BLOCK ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to add available block."
        )


@app.put("/blocks/{block_id}")
def update_block(
    block_id: str,
    request: AvailableBlockRequest
):

    try:

        result = available_blocks_collection.update_one(
            {"block_id": block_id},
            {
                "$set": request.model_dump()
            }
        )

        if result.matched_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Block not found."
            )

        return {
            "status": "success",
            "message": "Available block updated successfully."
        }

    except HTTPException:
        raise

    except Exception as e:

        print("UPDATE BLOCK ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to update available block."
        )


@app.delete("/blocks/{block_id}")
def delete_block(block_id: str):

    try:

        result = available_blocks_collection.delete_one(
            {"block_id": block_id}
        )

        if result.deleted_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Block not found."
            )

        return {
            "status": "success",
            "message": "Available block deleted successfully."
        }

    except HTTPException:
        raise

    except Exception as e:

        print("DELETE BLOCK ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to delete available block."
        )


# ============================================================
# ASSETS
# ============================================================

@app.get("/assets")
def get_assets():

    try:

        documents = list(
            assets_collection.find({})
        )

        return {
            "status": "success",
            "assets": [
                clean_document(document)
                for document in documents
            ]
        }

    except Exception as e:

        print("ASSETS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/assets")
def add_asset(
    request: AssetRequest
):

    try:

        existing = assets_collection.find_one(
            {"asset_id": request.asset_id}
        )

        if existing:

            raise HTTPException(
                status_code=400,
                detail="Asset ID already exists."
            )

        document = request.model_dump()

        assets_collection.insert_one(
            document
        )

        return {
            "status": "success",
            "message": "Asset added successfully.",
            "asset": document
        }

    except HTTPException:
        raise

    except Exception as e:

        print("ADD ASSET ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to add asset."
        )


@app.put("/assets/{asset_id}")
def update_asset(
    asset_id: str,
    request: AssetRequest
):

    try:

        result = assets_collection.update_one(
            {"asset_id": asset_id},
            {
                "$set": request.model_dump()
            }
        )

        if result.matched_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Asset not found."
            )

        return {
            "status": "success",
            "message": "Asset updated successfully."
        }

    except HTTPException:
        raise

    except Exception as e:

        print("UPDATE ASSET ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to update asset."
        )


@app.delete("/assets/{asset_id}")
def delete_asset(asset_id: str):

    try:

        result = assets_collection.delete_one(
            {"asset_id": asset_id}
        )

        if result.deleted_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Asset not found."
            )

        return {
            "status": "success",
            "message": "Asset deleted successfully."
        }

    except HTTPException:
        raise

    except Exception as e:

        print("DELETE ASSET ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to delete asset."
        )


# ============================================================
# EXCEL UPLOAD
# ============================================================

@app.post("/upload-excel")
async def upload_excel(
    file: UploadFile = File(...)
):

    try:

        # ----------------------------------------------------
        # Check file type
        # ----------------------------------------------------

        filename = file.filename or ""

        if not filename.lower().endswith(
            (".xlsx", ".xls")
        ):

            raise HTTPException(
                status_code=400,
                detail="Please upload an Excel file (.xlsx or .xls)."
            )


        # ----------------------------------------------------
        # Read uploaded file
        # ----------------------------------------------------

        file_bytes = await file.read()

        workbook = pd.ExcelFile(
            BytesIO(file_bytes)
        )

        sheet_names = {
            sheet.lower().strip(): sheet
            for sheet in workbook.sheet_names
        }


        required_sheets = [
            "maintenance_tasks",
            "train_schedule",
            "available_blocks",
            "assets"
        ]


        missing_sheets = [
            sheet
            for sheet in required_sheets
            if sheet not in sheet_names
        ]


        if missing_sheets:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Excel file is missing required sheets: "
                    + ", ".join(missing_sheets)
                )
            )


        # ----------------------------------------------------
        # Read sheets
        # ----------------------------------------------------

        tasks_df = pd.read_excel(
            BytesIO(file_bytes),
            sheet_name=sheet_names["maintenance_tasks"]
        )

        trains_df = pd.read_excel(
            BytesIO(file_bytes),
            sheet_name=sheet_names["train_schedule"]
        )

        blocks_df = pd.read_excel(
            BytesIO(file_bytes),
            sheet_name=sheet_names["available_blocks"]
        )

        assets_df = pd.read_excel(
            BytesIO(file_bytes),
            sheet_name=sheet_names["assets"]
        )


        # ----------------------------------------------------
        # Normalize column names
        # ----------------------------------------------------

        tasks_df.columns = [
            str(column).strip()
            for column in tasks_df.columns
        ]

        trains_df.columns = [
            str(column).strip()
            for column in trains_df.columns
        ]

        blocks_df.columns = [
            str(column).strip()
            for column in blocks_df.columns
        ]

        assets_df.columns = [
            str(column).strip()
            for column in assets_df.columns
        ]


        # ----------------------------------------------------
        # Basic required columns
        # ----------------------------------------------------

        task_required = [
            "task_id",
            "department",
            "asset_type",
            "section",
            "maintenance_type",
            "duration_hours",
            "priority",
            "due_date"
        ]

        train_required = [
            "train_id",
            "section",
            "arrival_time",
            "departure_time"
        ]

        block_required = [
            "block_id",
            "section",
            "start_time",
            "end_time",
            "duration_hours"
        ]

        asset_required = [
            "asset_id",
            "asset_type",
            "section"
        ]


        for column in task_required:

            if column not in tasks_df.columns:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"maintenance_tasks sheet "
                        f"is missing column: {column}"
                    )
                )


        for column in train_required:

            if column not in trains_df.columns:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"train_schedule sheet "
                        f"is missing column: {column}"
                    )
                )


        for column in block_required:

            if column not in blocks_df.columns:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"available_blocks sheet "
                        f"is missing column: {column}"
                    )
                )


        for column in asset_required:

            if column not in assets_df.columns:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"assets sheet "
                        f"is missing column: {column}"
                    )
                )


        # ----------------------------------------------------
        # Convert NaN to empty values
        # ----------------------------------------------------

        tasks_df = tasks_df.fillna("")
        trains_df = trains_df.fillna("")
        blocks_df = blocks_df.fillna("")
        assets_df = assets_df.fillna("")

        # The starter SIH workbook uses train_type instead of train_name.
        # Keep both formats compatible by deriving train_name when needed.
        if "train_name" not in trains_df.columns:
            if "train_type" in trains_df.columns:
                trains_df["train_name"] = trains_df["train_type"].astype(str)
            else:
                trains_df["train_name"] = trains_df["train_id"].astype(str)


        # ----------------------------------------------------
        # Convert Excel rows to dictionaries
        # ----------------------------------------------------

        tasks = tasks_df.to_dict(
            orient="records"
        )

        trains = trains_df.to_dict(
            orient="records"
        )

        blocks = blocks_df.to_dict(
            orient="records"
        )

        assets = assets_df.to_dict(
            orient="records"
        )


        # ----------------------------------------------------
        # Add default values where necessary
        # ----------------------------------------------------

        for task in tasks:

            task.setdefault(
                "condition",
                "Good"
            )

            task.setdefault(
                "required_block_type",
                "Normal"
            )


        for block in blocks:

            block.setdefault(
                "block_type",
                "Normal"
            )

            block.setdefault(
                "status",
                "Available"
            )


        for asset in assets:

            asset.setdefault(
                "condition",
                "Good"
            )


        # ----------------------------------------------------
        # Prevent duplicate IDs inside uploaded workbook
        # ----------------------------------------------------

        task_ids = [
            str(task["task_id"])
            for task in tasks
        ]

        train_ids = [
            str(train["train_id"])
            for train in trains
        ]

        block_ids = [
            str(block["block_id"])
            for block in blocks
        ]

        asset_ids = [
            str(asset["asset_id"])
            for asset in assets
        ]


        if len(task_ids) != len(set(task_ids)):

            raise HTTPException(
                status_code=400,
                detail="Duplicate task_id found in Excel file."
            )


        if len(train_ids) != len(set(train_ids)):

            raise HTTPException(
                status_code=400,
                detail="Duplicate train_id found in Excel file."
            )


        if len(block_ids) != len(set(block_ids)):

            raise HTTPException(
                status_code=400,
                detail="Duplicate block_id found in Excel file."
            )


        if len(asset_ids) != len(set(asset_ids)):

            raise HTTPException(
                status_code=400,
                detail="Duplicate asset_id found in Excel file."
            )


        # ----------------------------------------------------
        # Replace operational data
        #
        # The uploaded workbook becomes the current dataset.
        # ----------------------------------------------------

        if tasks:

            maintenance_tasks_collection.delete_many({})

            maintenance_tasks_collection.insert_many(
                tasks
            )

        else:

            maintenance_tasks_collection.delete_many({})


        if trains:

            train_schedule_collection.delete_many({})

            train_schedule_collection.insert_many(
                trains
            )

        else:

            train_schedule_collection.delete_many({})


        if blocks:

            available_blocks_collection.delete_many({})

            available_blocks_collection.insert_many(
                blocks
            )

        else:

            available_blocks_collection.delete_many({})


        if assets:

            assets_collection.delete_many({})

            assets_collection.insert_many(
                assets
            )

        else:

            assets_collection.delete_many({})


        # ----------------------------------------------------
        # Return import summary
        # ----------------------------------------------------

        return {
            "status": "success",
            "message": "Excel data uploaded successfully.",
            "imported": {
                "maintenance_tasks": len(tasks),
                "train_schedule": len(trains),
                "available_blocks": len(blocks),
                "assets": len(assets)
            }
        }


    except HTTPException:
        raise

    except Exception as e:

        print(
            "EXCEL UPLOAD ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Excel upload failed. "
                f"{str(e)}"
            )
        )



# ============================================================
# FAST AI-ASSISTED BLOCK OPTIMIZATION
# ============================================================

def _text(value):
    return str(value if value is not None else "").strip()


def _time_minutes(value):
    """
    Convert HH:MM (or a value containing HH:MM) to minutes.
    Returns None for invalid/empty values.
    """
    match = re.search(r"(\d{1,2}):(\d{2})", _text(value))
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2))

    if hour > 23 or minute > 59:
        return None

    return hour * 60 + minute


def _interval(value_start, value_end):
    start = _time_minutes(value_start)
    end = _time_minutes(value_end)

    if start is None or end is None:
        return None

    # Support an interval crossing midnight.
    if end <= start:
        end += 24 * 60

    return start, end


def _overlaps(first, second):
    if not first or not second:
        return False

    first_start, first_end = first
    second_start, second_end = second

    return first_start < second_end and second_start < first_end


def _priority_score(value):
    return {
        "critical": 100,
        "high": 80,
        "medium": 55,
        "low": 30,
    }.get(_text(value).lower(), 40)


def _condition_score(value):
    return {
        "critical": 100,
        "poor": 75,
        "fair": 45,
        "good": 20,
    }.get(_text(value).lower(), 20)


def _required_block_matches(task, block):
    required = _text(task.get("required_block_type", "Normal")).lower()
    block_type = _text(block.get("block_type", "Normal")).lower()

    # "Normal" means that the task does not require a
    # department-specific block type.
    if not required or required == "normal":
        return True

    if required == block_type:
        return True

    # Accept common railway naming variants.
    aliases = {
        "power": {"power", "ohe", "ohe block", "power block"},
        "traffic": {"traffic", "traffic block", "signal block"},
        "normal": {"normal", "track", "track block"},
    }

    if required in aliases and block_type in aliases[required]:
        return True

    asset_type = _text(task.get("asset_type")).lower()

    if required in {"power", "ohe", "ohe block"}:
        return asset_type in {"ohe", "traction", "overhead_equipment"} and (
            "ohe" in block_type or "power" in block_type
        )

    if required in {"traffic", "traffic block", "signal block"}:
        return asset_type in {"signal", "point_machine"} and (
            "signal" in block_type or "traffic" in block_type
        )

    if required in {"track", "track block"}:
        return asset_type in {"track", "bridge"} and "track" in block_type

    return False


def _task_due_score(task):
    """
    Small urgency component. Invalid/missing dates simply contribute 0.
    """
    due = _text(task.get("due_date"))

    if not due:
        return 0

    try:
        due_timestamp = pd.to_datetime(due, errors="coerce")
        if pd.isna(due_timestamp):
            return 0

        days = max((due_timestamp.to_pydatetime() - datetime.now()).total_seconds() / 86400, -30)

        if days <= 0:
            return 25
        if days <= 1:
            return 20
        if days <= 3:
            return 15
        if days <= 7:
            return 8

    except Exception:
        return 0

    return 0


def fast_generate_plan(tasks, blocks, trains, assets):
    """
    Lightweight optimization engine for the live dashboard.

    It uses:
      1. maintenance priority,
      2. asset condition,
      3. due-date urgency,
      4. section compatibility,
      5. required block type,
      6. duration capacity,
      7. train movement conflicts,
      8. block reuse prevention,
      9. minimum-waste block selection.

    This is intentionally deterministic so the web request completes
    quickly even when the dataset becomes larger.
    """

    if tasks is None or tasks.empty:
        return {
            "status": "success",
            "planned_tasks": 0,
            "unplanned_tasks": 0,
            "total_tasks": 0,
            "planning_efficiency": 0,
            "plan": [],
        }

    tasks_records = tasks.fillna("").to_dict(orient="records")
    blocks_records = (
        blocks.fillna("").to_dict(orient="records")
        if blocks is not None and not blocks.empty
        else []
    )
    train_records = (
        trains.fillna("").to_dict(orient="records")
        if trains is not None and not trains.empty
        else []
    )
    asset_records = (
        assets.fillna("").to_dict(orient="records")
        if assets is not None and not assets.empty
        else []
    )

    train_intervals = []

    for train in train_records:
        interval = _interval(
            train.get("arrival_time"),
            train.get("departure_time"),
        )

        if interval:
            train_intervals.append(
                (
                    _text(train.get("section")).upper(),
                    interval,
                )
            )

    assets_by_key = {}

    for asset in asset_records:
        key = (
            _text(asset.get("asset_type")).lower(),
            _text(asset.get("section")).upper(),
        )
        assets_by_key.setdefault(key, []).append(asset)

    # Highest operational importance first.
    ordered_tasks = sorted(
        tasks_records,
        key=lambda task: (
            -(
                _priority_score(task.get("priority"))
                + _condition_score(task.get("condition"))
                + _task_due_score(task)
            ),
            _text(task.get("due_date")),
            _text(task.get("task_id")),
        ),
    )

    candidate_blocks = []

    for block in blocks_records:
        status = _text(block.get("status", "Available")).lower()

        if status not in {"", "available"}:
            continue

        interval = _interval(
            block.get("start_time"),
            block.get("end_time"),
        )

        if not interval:
            continue

        try:
            duration = float(block.get("duration_hours") or 0)
        except (TypeError, ValueError):
            duration = 0

        if duration <= 0:
            duration = (interval[1] - interval[0]) / 60

        candidate_blocks.append(
            {
                **block,
                "_interval": interval,
                "_duration": duration,
            }
        )

    # Earlier windows are considered first only after task priority.
    candidate_blocks.sort(
        key=lambda block: (
            _text(block.get("section")).upper(),
            block["_interval"][0],
        )
    )

    used_blocks = set()
    plan_rows = []

    for task in ordered_tasks:
        task_id = _text(task.get("task_id"))
        task_section = _text(task.get("section")).upper()

        try:
            task_duration = float(task.get("duration_hours") or 0)
        except (TypeError, ValueError):
            task_duration = 0

        best = None

        for block in candidate_blocks:
            block_id = _text(block.get("block_id"))

            if not block_id or block_id in used_blocks:
                continue

            block_section = _text(block.get("section")).upper()

            if task_section and block_section and task_section != block_section:
                continue

            if task_duration <= 0 or block["_duration"] + 1e-9 < task_duration:
                continue

            if not _required_block_matches(task, block):
                continue

            # A maintenance block cannot overlap a scheduled train
            # movement in the same section.
            conflict = False

            for train_section, train_interval in train_intervals:
                if (
                    task_section
                    and train_section
                    and task_section == train_section
                    and _overlaps(block["_interval"], train_interval)
                ):
                    conflict = True
                    break

            if conflict:
                continue

            slack = max(block["_duration"] - task_duration, 0)

            # Prefer less wasted block time, then earlier windows.
            score = (
                (_priority_score(task.get("priority")) * 10)
                + (_condition_score(task.get("condition")) * 5)
                + (_task_due_score(task) * 3)
                - (slack * 4)
                - (block["_interval"][0] / 10000)
            )

            if best is None or score > best["_score"]:
                best = {
                    "block": block,
                    "_score": score,
                    "_slack": slack,
                }

        asset_key = (
            _text(task.get("asset_type")).lower(),
            task_section,
        )

        matching_assets = assets_by_key.get(asset_key, [])

        selected_asset = None

        if matching_assets:
            selected_asset = sorted(
                matching_assets,
                key=lambda asset: -_condition_score(
                    asset.get("condition")
                ),
            )[0]

        base_row = {
            "task_id": task_id,
            "department": task.get("department", ""),
            "asset_type": task.get("asset_type", ""),
            "section": task.get("section", ""),
            "maintenance_type": task.get("maintenance_type", ""),
            "duration_hours": task_duration,
            "priority": task.get("priority", ""),
            "due_date": task.get("due_date", ""),
            "condition": task.get("condition", ""),
            "asset_id": selected_asset.get("asset_id", "") if selected_asset else "",
            "asset_condition": selected_asset.get("condition", "") if selected_asset else "",
        }

        if best:
            block = best["block"]
            used_blocks.add(_text(block.get("block_id")))

            plan_rows.append(
                {
                    **base_row,
                    "recommended_block": block.get("block_id", ""),
                    "block_start": block.get("start_time", ""),
                    "block_end": block.get("end_time", ""),
                    "status": "PLANNED",
                    "reason": (
                        "Selected by priority-aware optimization after "
                        "section, block-type, duration and train-conflict checks."
                    ),
                }
            )
        else:
            plan_rows.append(
                {
                    **base_row,
                    "recommended_block": None,
                    "block_start": None,
                    "block_end": None,
                    "status": "UNPLANNED",
                    "reason": (
                        "No feasible unused maintenance block remained "
                        "after section, block-type, duration and train-conflict checks."
                    ),
                }
            )

    planned_count = sum(
        1 for row in plan_rows if row.get("status") == "PLANNED"
    )
    total_count = len(plan_rows)
    unplanned_count = total_count - planned_count

    return {
        "status": "success",
        "planned_tasks": planned_count,
        "unplanned_tasks": unplanned_count,
        "total_tasks": total_count,
        "planning_efficiency": (
            round((planned_count / total_count) * 100, 2)
            if total_count
            else 0
        ),
        "plan": plan_rows,
    }


# ============================================================
# AI DECISION CONFIDENCE
# ============================================================

def add_ai_confidence(result, tasks, blocks):
    """
    Add a transparent decision-confidence indicator to each
    planned task. This is derived from the same planning
    evidence used by the block planner (section, duration,
    block type and successful conflict-free assignment).

    It is intentionally presented as a planning confidence
    indicator, not as a calibrated probability.
    """

    rows = result.get("plan", []) if isinstance(result, dict) else []

    if not isinstance(rows, list):
        return result

    task_map = {}
    block_map = {}

    if tasks is not None and not tasks.empty and "task_id" in tasks.columns:
        for _, row in tasks.iterrows():
            task_map[str(row.get("task_id", ""))] = row.to_dict()

    if blocks is not None and not blocks.empty and "block_id" in blocks.columns:
        for _, row in blocks.iterrows():
            block_map[str(row.get("block_id", ""))] = row.to_dict()

    planned_rows = []

    for item in rows:
        if not isinstance(item, dict):
            planned_rows.append(item)
            continue

        status = str(item.get("status", "")).upper()

        if status != "PLANNED":
            item["ai_confidence"] = None
            planned_rows.append(item)
            continue

        task = task_map.get(str(item.get("task_id", "")), {})
        block_id = str(item.get("recommended_block", ""))
        block = block_map.get(block_id, {})

        confidence = 60

        # Section compatibility
        task_section = str(task.get("section", "")).strip().upper()
        block_section = str(block.get("section", item.get("section", ""))).strip().upper()
        if task_section and block_section and task_section == block_section:
            confidence += 15

        # Required block type compatibility
        task_type = str(task.get("required_block_type", "")).strip().lower()
        block_type = str(block.get("block_type", "")).strip().lower()
        if task_type and block_type and task_type == block_type:
            confidence += 10

        # Duration fit: the more spare time the selected block has,
        # the stronger the decision confidence, capped at 10 points.
        try:
            task_duration = float(task.get("duration_hours", item.get("duration_hours", 0)) or 0)
            block_duration = float(block.get("duration_hours", 0) or 0)
            if task_duration > 0 and block_duration >= task_duration:
                slack_ratio = min((block_duration - task_duration) / task_duration, 1.0)
                confidence += round(5 + 5 * slack_ratio)
        except (TypeError, ValueError):
            pass

        # Successful PLANNED assignment means the planner's conflict
        # checks accepted this block.
        confidence += 15

        item["ai_confidence"] = max(0, min(99, int(confidence)))
        planned_rows.append(item)

    result["plan"] = planned_rows

    planned_confidences = [
        row.get("ai_confidence")
        for row in planned_rows
        if isinstance(row, dict)
        and row.get("ai_confidence") is not None
    ]

    result["average_ai_confidence"] = (
        round(sum(planned_confidences) / len(planned_confidences))
        if planned_confidences
        else 0
    )

    return result


# ============================================================
# AI PLAN GENERATION
# ============================================================

@app.get("/generate-plan")
def generate_maintenance_plan():

    try:

        tasks, blocks, trains, assets = (
            get_all_operational_data()
        )


        if tasks.empty:

            return {
                "status": "success",
                "planned_tasks": 0,
                "unplanned_tasks": 0,
                "total_tasks": 0,
                "planning_efficiency": 0,
                "plan": []
            }


        result = fast_generate_plan(
            tasks,
            blocks,
            trains,
            assets
        )

        result = add_ai_confidence(
            result,
            tasks,
            blocks
        )

        return result


    except Exception as e:

        print(
            "GENERATE PLAN ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "planned_tasks": 0,
            "unplanned_tasks": 0,
            "total_tasks": 0,
            "planning_efficiency": 0,
            "plan": [],
            "error": str(e)
        }