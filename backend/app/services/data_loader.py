from pathlib import Path
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[3]

DATA_FILE = (
    BASE_DIR
    / "data"
    / "raw"
    / "SIH26027_Stage_B1_Starter_Dataset.xlsx"
)


def load_sheet(sheet_name: str):
    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}"
        )

    return pd.read_excel(
        DATA_FILE,
        sheet_name=sheet_name
    )


def load_all_data():
    return {
        "tasks": load_sheet("maintenance_tasks"),
        "blocks": load_sheet("available_blocks"),
        "trains": load_sheet("train_schedule"),
        "assets": load_sheet("assets")
    }