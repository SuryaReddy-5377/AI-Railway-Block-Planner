import pandas as pd

from app.services.feasibility_engine import check_feasibility
from app.services.ai_model import train_model, predict_block


# =========================================================
# BLOCK SCORING
# =========================================================

def calculate_block_score(task, block):

    task_duration = float(
        task.get("duration_hours", 0)
    )

    block_duration = float(
        block.get("duration_hours", 0)
    )

    # Less unused time is better
    unused_time = max(
        block_duration - task_duration,
        0
    )

    score = 100 - unused_time

    # Matching block type gets bonus
    required_type = str(
        task.get("required_block_type", "")
    ).strip().lower()

    block_type = str(
        block.get("block_type", "")
    ).strip().lower()

    if (
        required_type
        and required_type == block_type
    ):
        score += 20

    return score


# =========================================================
# PRIORITY
# =========================================================

def priority_value(task):

    priority_order = {
        "critical": 4,
        "high": 3,
        "medium": 2,
        "low": 1
    }

    priority = str(
        task.get("priority", "")
    ).strip().lower()

    return priority_order.get(
        priority,
        0
    )


# =========================================================
# UNPLANNED EXPLANATION
# =========================================================

def create_unplanned_explanation(
    task,
    blocks,
    trains
):

    reasons = []

    for _, block in blocks.iterrows():

        result = check_feasibility(
            task,
            block,
            trains
        )

        if result["reason"]:

            reasons.append(
                f"{block.get('block_id')}: "
                f"{result['reason']}"
            )

    if reasons:

        return (
            "No feasible block found. "
            + " | ".join(reasons[:3])
        )

    return (
        "No feasible block available."
    )


# =========================================================
# MAIN PLANNER
# =========================================================

def generate_plan(
    tasks,
    blocks,
    trains
):

    # Convert to DataFrames
    if not isinstance(
        tasks,
        pd.DataFrame
    ):
        tasks = pd.DataFrame(tasks)

    if not isinstance(
        blocks,
        pd.DataFrame
    ):
        blocks = pd.DataFrame(blocks)

    if not isinstance(
        trains,
        pd.DataFrame
    ):
        trains = pd.DataFrame(trains)

    tasks = tasks.copy()
    blocks = blocks.copy()
    trains = trains.copy()

    # =====================================================
    # TRAIN AI
    # =====================================================

    ai_training = train_model(
        tasks,
        blocks,
        trains
    )

    # =====================================================
    # SORT BY PRIORITY
    # =====================================================

    tasks["_priority_value"] = tasks.apply(
        priority_value,
        axis=1
    )

    tasks = tasks.sort_values(
        by="_priority_value",
        ascending=False
    )

    results = []

    # Keep track of used blocks
    used_blocks = set()

    # =====================================================
    # PROCESS TASKS
    # =====================================================

    for _, task in tasks.iterrows():

        feasible_blocks = []

        # -------------------------------------------------
        # CHECK EACH BLOCK
        # -------------------------------------------------

        for _, block in blocks.iterrows():

            block_id = block.get(
                "block_id",
                ""
            )

            # Block can only be used once
            if block_id in used_blocks:
                continue

            # First perform rule-based feasibility
            feasibility = check_feasibility(
                task,
                block,
                trains
            )

            if not feasibility["feasible"]:
                continue

            # -------------------------------------------------
            # AI PREDICTION
            # -------------------------------------------------

            ai_result = predict_block(
                task,
                block,
                trains
            )

            # AI prediction:
            # 1 = suitable
            # 0 = unsuitable

            if ai_result["prediction"] != 1:
                continue

            # -------------------------------------------------
            # CALCULATE SCORE
            # -------------------------------------------------

            score = calculate_block_score(
                task,
                block
            )

            feasible_blocks.append({

                "block": block,

                "score": score,

                "reason": feasibility["reason"],

                "ai_confidence":
                    ai_result["confidence"]

            })

        # =====================================================
        # TASK CAN BE PLANNED
        # =====================================================

        if feasible_blocks:

            # Highest score first
            feasible_blocks.sort(
                key=lambda x: x["score"],
                reverse=True
            )

            selected = feasible_blocks[0]

            block = selected["block"]

            block_id = block.get(
                "block_id",
                ""
            )

            used_blocks.add(
                block_id
            )

            results.append({

                "task_id": task.get(
                    "task_id",
                    ""
                ),

                "priority": task.get(
                    "priority",
                    ""
                ),

                "section": task.get(
                    "section",
                    ""
                ),

                "duration_hours": float(
                    task.get(
                        "duration_hours",
                        0
                    )
                ),

                "recommended_block":
                    block_id,

                "block_start":
                    block.get(
                        "start_time",
                        ""
                    ),

                "block_end":
                    block.get(
                        "end_time",
                        ""
                    ),

                "status":
                    "PLANNED",

                "reason":
                    selected["reason"],

                "score":
                    round(
                        selected["score"],
                        2
                    ),

                "ai_confidence":
                    selected["ai_confidence"]

            })

        # =====================================================
        # TASK CANNOT BE PLANNED
        # =====================================================

        else:

            results.append({

                "task_id": task.get(
                    "task_id",
                    ""
                ),

                "priority": task.get(
                    "priority",
                    ""
                ),

                "section": task.get(
                    "section",
                    ""
                ),

                "duration_hours": float(
                    task.get(
                        "duration_hours",
                        0
                    )
                ),

                "recommended_block":
                    None,

                "block_start":
                    None,

                "block_end":
                    None,

                "status":
                    "UNPLANNED",

                "reason":
                    create_unplanned_explanation(
                        task,
                        blocks,
                        trains
                    ),

                "score":
                    0,

                "ai_confidence":
                    0

            })

    # =====================================================
    # SUMMARY
    # =====================================================

    planned = sum(
        1
        for item in results
        if item["status"] == "PLANNED"
    )

    unplanned = sum(
        1
        for item in results
        if item["status"] == "UNPLANNED"
    )

    total = len(results)

    efficiency = (
        (planned / total) * 100
        if total
        else 0
    )

    return {

        "status":
            "success",

        "trained":
            ai_training["trained"],

        "training_examples":
            ai_training["training_examples"],

        "planned_tasks":
            planned,

        "unplanned_tasks":
            unplanned,

        "total_tasks":
            total,

        "planning_efficiency":
            round(
                efficiency,
                2
            ),

        "plan":
            results
    }