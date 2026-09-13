import pandas as pd

from app.services.ai_model import train_model, predict_block


# =========================================================
# LOAD DATASET
# =========================================================

DATASET = r"C:\SIH2026\data\raw\SIH26027_Stage_B1_Starter_Dataset.xlsx"

print("Using dataset:", DATASET)

workbook = pd.ExcelFile(DATASET)

tasks = pd.read_excel(
    DATASET,
    sheet_name="maintenance_tasks"
)

trains = pd.read_excel(
    DATASET,
    sheet_name="train_schedule"
)

blocks = pd.read_excel(
    DATASET,
    sheet_name="available_blocks"
)


# =========================================================
# TRAIN AI
# =========================================================

training_result = train_model(
    tasks,
    blocks,
    trains
)

print()
print("AI MODEL TRAINED SUCCESSFULLY")
print("Training examples:", training_result["training_examples"])
print("Features:", training_result["features"])


# =========================================================
# TEST AI PREDICTION
# =========================================================

task = tasks.iloc[0]
block = blocks.iloc[0]

prediction = predict_block(
    task,
    block,
    trains
)

print()
print("AI PREDICTION:")
print(prediction)