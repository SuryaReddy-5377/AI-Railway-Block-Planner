from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import io

from app.services.auth import db

from app.services.block_planner import generate_plan


app = FastAPI(
    title="AI Railway Block Planner",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-sigma-nine-83.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://frontend-[a-z0-9-]+-surya-manohar-reddy-s-projects\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# MONGODB COLLECTIONS
# =========================================================

maintenance_tasks_collection = db["maintenance_tasks"]
train_schedule_collection = db["train_schedule"]
available_blocks_collection = db["available_blocks"]
assets_collection = db["assets"]


# =========================================================
# MODELS
# =========================================================

class TaskCreate(BaseModel):
    task_id: str
    department: str
    asset_type: str
    section: str
    maintenance_type: str
    duration_hours: float
    priority: str
    due_date: str
    condition: Optional[str] = "Good"
    required_block_type: Optional[str] = "Normal"


class TrainCreate(BaseModel):
    train_id: str
    train_name: str
    section: str
    arrival_time: str
    departure_time: str


class BlockCreate(BaseModel):
    block_id: str
    section: str
    start_time: str
    end_time: str
    duration_hours: float
    block_type: Optional[str] = "Normal"
    status: Optional[str] = "Available"


class AssetCreate(BaseModel):
    asset_id: str
    asset_type: str
    section: str
    condition: Optional[str] = "Good"


# =========================================================
# HELPERS
# =========================================================

def clean_document(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


def replace_collection(collection, documents):
    collection.delete_many({})

    if documents:
        collection.insert_many(documents)


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
def initialize_database():
    try:
        db.command("ping")

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

        print("MongoDB connected successfully.")
        print("Railway database indexes initialized.")

    except Exception as e:
        print(
            "DATABASE INITIALIZATION ERROR:",
            repr(e)
        )


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "AI Railway Block Planner API",
        "status": "running"
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():
    try:
        db.command("ping")

        return {
            "status": "healthy",
            "database": "connected",
            "service": "AI Railway Block Planner"
        }

    except Exception as e:
        return {
            "status": "degraded",
            "database": "disconnected",
            "error": str(e)
        }


# =========================================================
# DATA TEST
# =========================================================

@app.get("/data-test")
def data_test():

    return {
        "maintenance_tasks":
            maintenance_tasks_collection.count_documents({}),

        "blocks":
            available_blocks_collection.count_documents({}),

        "trains":
            train_schedule_collection.count_documents({}),

        "assets":
            assets_collection.count_documents({})
    }


# =========================================================
# TASKS
# =========================================================

@app.get("/tasks")
def get_tasks():

    return [
        clean_document(x)
        for x in maintenance_tasks_collection.find(
            {},
            {"_id": 0}
        )
    ]


@app.post("/tasks")
def add_task(task: TaskCreate):

    data = task.model_dump()

    if maintenance_tasks_collection.find_one(
        {"task_id": data["task_id"]}
    ):
        raise HTTPException(
            status_code=409,
            detail="Task ID already exists."
        )

    maintenance_tasks_collection.insert_one(data)

    return {
        "message": "Task added successfully",
        "task": data
    }


@app.put("/tasks/{task_id}")
def update_task(
    task_id: str,
    task: TaskCreate
):

    data = task.model_dump()

    result = maintenance_tasks_collection.update_one(
        {"task_id": task_id},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Task not found."
        )

    return {
        "message": "Task updated successfully"
    }


@app.delete("/tasks/{task_id}")
def delete_task(task_id: str):

    result = maintenance_tasks_collection.delete_one(
        {"task_id": task_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Task not found."
        )

    return {
        "message": "Task deleted successfully"
    }


# =========================================================
# TRAINS
# =========================================================

@app.get("/trains")
def get_trains():

    return [
        clean_document(x)
        for x in train_schedule_collection.find(
            {},
            {"_id": 0}
        )
    ]


@app.post("/trains")
def add_train(train: TrainCreate):

    data = train.model_dump()

    if train_schedule_collection.find_one(
        {"train_id": data["train_id"]}
    ):
        raise HTTPException(
            status_code=409,
            detail="Train ID already exists."
        )

    train_schedule_collection.insert_one(data)

    return {
        "message": "Train added successfully",
        "train": data
    }


@app.put("/trains/{train_id}")
def update_train(
    train_id: str,
    train: TrainCreate
):

    data = train.model_dump()

    result = train_schedule_collection.update_one(
        {"train_id": train_id},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Train not found."
        )

    return {
        "message": "Train updated successfully"
    }


@app.delete("/trains/{train_id}")
def delete_train(train_id: str):

    result = train_schedule_collection.delete_one(
        {"train_id": train_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Train not found."
        )

    return {
        "message": "Train deleted successfully"
    }


# =========================================================
# BLOCKS
# =========================================================

@app.get("/blocks")
def get_blocks():

    return [
        clean_document(x)
        for x in available_blocks_collection.find(
            {},
            {"_id": 0}
        )
    ]


@app.post("/blocks")
def add_block(block: BlockCreate):

    data = block.model_dump()

    if available_blocks_collection.find_one(
        {"block_id": data["block_id"]}
    ):
        raise HTTPException(
            status_code=409,
            detail="Block ID already exists."
        )

    available_blocks_collection.insert_one(data)

    return {
        "message": "Block added successfully",
        "block": data
    }


@app.put("/blocks/{block_id}")
def update_block(
    block_id: str,
    block: BlockCreate
):

    data = block.model_dump()

    result = available_blocks_collection.update_one(
        {"block_id": block_id},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Block not found."
        )

    return {
        "message": "Block updated successfully"
    }


@app.delete("/blocks/{block_id}")
def delete_block(block_id: str):

    result = available_blocks_collection.delete_one(
        {"block_id": block_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Block not found."
        )

    return {
        "message": "Block deleted successfully"
    }


# =========================================================
# ASSETS
# =========================================================

@app.get("/assets")
def get_assets():

    return [
        clean_document(x)
        for x in assets_collection.find(
            {},
            {"_id": 0}
        )
    ]


@app.post("/assets")
def add_asset(asset: AssetCreate):

    data = asset.model_dump()

    if assets_collection.find_one(
        {"asset_id": data["asset_id"]}
    ):
        raise HTTPException(
            status_code=409,
            detail="Asset ID already exists."
        )

    assets_collection.insert_one(data)

    return {
        "message": "Asset added successfully",
        "asset": data
    }


@app.put("/assets/{asset_id}")
def update_asset(
    asset_id: str,
    asset: AssetCreate
):

    data = asset.model_dump()

    result = assets_collection.update_one(
        {"asset_id": asset_id},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Asset not found."
        )

    return {
        "message": "Asset updated successfully"
    }


@app.delete("/assets/{asset_id}")
def delete_asset(asset_id: str):

    result = assets_collection.delete_one(
        {"asset_id": asset_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Asset not found."
        )

    return {
        "message": "Asset deleted successfully"
    }


# =========================================================
# EXCEL UPLOAD
# =========================================================

@app.post("/upload-excel")
async def upload_excel(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )

    if not file.filename.lower().endswith(
        (".xlsx", ".xls")
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload an Excel file."
        )

    try:
        contents = await file.read()

        excel = pd.ExcelFile(
            io.BytesIO(contents)
        )

        required_sheets = [
            "maintenance_tasks",
            "train_schedule",
            "available_blocks",
            "assets"
        ]

        missing = [
            sheet
            for sheet in required_sheets
            if sheet not in excel.sheet_names
        ]

        if missing:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Missing sheets: "
                    + ", ".join(missing)
                )
            )

        tasks = pd.read_excel(
            excel,
            sheet_name="maintenance_tasks"
        )

        trains = pd.read_excel(
            excel,
            sheet_name="train_schedule"
        )

        blocks = pd.read_excel(
            excel,
            sheet_name="available_blocks"
        )

        assets = pd.read_excel(
            excel,
            sheet_name="assets"
        )

        # Convert NaN to None
        tasks = tasks.where(
            pd.notnull(tasks),
            None
        )

        trains = trains.where(
            pd.notnull(trains),
            None
        )

        blocks = blocks.where(
            pd.notnull(blocks),
            None
        )

        assets = assets.where(
            pd.notnull(assets),
            None
        )

        task_records = tasks.to_dict(
            orient="records"
        )

        train_records = trains.to_dict(
            orient="records"
        )

        block_records = blocks.to_dict(
            orient="records"
        )

        asset_records = assets.to_dict(
            orient="records"
        )

        # Defaults required by planner
        for task in task_records:
            task.setdefault(
                "condition",
                "Good"
            )
            task.setdefault(
                "required_block_type",
                "Normal"
            )

        for block in block_records:
            block.setdefault(
                "block_type",
                "Normal"
            )
            block.setdefault(
                "status",
                "Available"
            )

        for asset in asset_records:
            asset.setdefault(
                "condition",
                "Good"
            )

        replace_collection(
            maintenance_tasks_collection,
            task_records
        )

        replace_collection(
            train_schedule_collection,
            train_records
        )

        replace_collection(
            available_blocks_collection,
            block_records
        )

        replace_collection(
            assets_collection,
            asset_records
        )

        return {
            "message":
                "Excel data uploaded successfully",

            "maintenance_tasks":
                len(task_records),

            "trains":
                len(train_records),

            "blocks":
                len(block_records),

            "assets":
                len(asset_records)
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
            detail=f"Excel upload failed: {str(e)}"
        )


# =========================================================
# GENERATE PLAN
# =========================================================

@app.get("/generate-plan")
def generate_maintenance_plan():

    try:

        tasks = list(
            maintenance_tasks_collection.find(
                {},
                {"_id": 0}
            )
        )

        blocks = list(
            available_blocks_collection.find(
                {},
                {"_id": 0}
            )
        )

        trains = list(
            train_schedule_collection.find(
                {},
                {"_id": 0}
            )
        )

        if not tasks:
            raise HTTPException(
                status_code=400,
                detail="No maintenance tasks available."
            )

        if not blocks:
            raise HTTPException(
                status_code=400,
                detail="No available blocks available."
            )

        result = generate_plan(
            tasks,
            blocks,
            trains
        )

        return result

    except HTTPException:
        raise

    except Exception as e:
        print(
            "PLAN GENERATION ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Plan generation failed: {str(e)}"
        )