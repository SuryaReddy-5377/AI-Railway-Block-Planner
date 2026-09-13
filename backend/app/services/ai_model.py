import pandas as pd
from sklearn.ensemble import RandomForestClassifier


# =========================================================
# AI MODEL
# =========================================================

_model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

_is_trained = False


FEATURE_NAMES = [
    "task_duration",
    "block_duration",
    "duration_difference",
    "section_match",
    "duration_match",
    "type_match",
    "block_available",
    "train_conflict_free",
    "priority"
]


# =========================================================
# TRAINING HELPERS
# =========================================================

def priority_number(priority):

    values = {
        "critical": 4,
        "high": 3,
        "medium": 2,
        "low": 1
    }

    return values.get(
        str(priority).strip().lower(),
        0
    )


def check_train_conflict(block, trains):

    block_start = pd.to_datetime(
        block.get("start_time")
    )

    block_end = pd.to_datetime(
        block.get("end_time")
    )

    block_section = str(
        block.get("section", "")
    ).strip()

    for _, train in trains.iterrows():

        train_section = str(
            train.get("section", "")
        ).strip()

        # Only trains in the same section matter
        if train_section != block_section:
            continue

        train_arrival = pd.to_datetime(
            train.get("arrival_time")
        )

        train_departure = pd.to_datetime(
            train.get("departure_time")
        )

        # Overlap means conflict
        if (
            block_start < train_departure
            and block_end > train_arrival
        ):
            return True

    return False


def create_features(task, block, trains):

    task_duration = float(
        task.get("duration_hours", 0)
    )

    block_duration = float(
        block.get("duration_hours", 0)
    )

    section_match = (
        str(task.get("section", "")).strip()
        ==
        str(block.get("section", "")).strip()
    )

    duration_match = (
        block_duration >= task_duration
    )

    required_type = str(
        task.get("required_block_type", "")
    ).strip().lower()

    block_type = str(
        block.get("block_type", "")
    ).strip().lower()

    type_match = (
        not required_type
        or required_type == block_type
    )

    block_available = (
        str(
            block.get("status", "")
        ).strip().lower()
        in ["available", "free", "open"]
    )

    train_conflict = check_train_conflict(
        block,
        trains
    )

    train_conflict_free = not train_conflict

    priority = priority_number(
        task.get("priority", "")
    )

    features = [
        task_duration,
        block_duration,
        block_duration - task_duration,
        int(section_match),
        int(duration_match),
        int(type_match),
        int(block_available),
        int(train_conflict_free),
        priority
    ]

    return features


# =========================================================
# TRAIN AI MODEL
# =========================================================

def train_model(tasks, blocks, trains):

    global _is_trained

    if not isinstance(tasks, pd.DataFrame):
        tasks = pd.DataFrame(tasks)

    if not isinstance(blocks, pd.DataFrame):
        blocks = pd.DataFrame(blocks)

    if not isinstance(trains, pd.DataFrame):
        trains = pd.DataFrame(trains)

    training_rows = []
    training_labels = []

    # Create examples using every task/block combination
    for _, task in tasks.iterrows():

        for _, block in blocks.iterrows():

            features = create_features(
                task,
                block,
                trains
            )

            section_match = (
                str(task.get("section", "")).strip()
                ==
                str(block.get("section", "")).strip()
            )

            task_duration = float(
                task.get("duration_hours", 0)
            )

            block_duration = float(
                block.get("duration_hours", 0)
            )

            duration_match = (
                block_duration >= task_duration
            )

            required_type = str(
                task.get("required_block_type", "")
            ).strip().lower()

            block_type = str(
                block.get("block_type", "")
            ).strip().lower()

            type_match = (
                not required_type
                or required_type == block_type
            )

            block_available = (
                str(
                    block.get("status", "")
                ).strip().lower()
                in ["available", "free", "open"]
            )

            train_conflict = check_train_conflict(
                block,
                trains
            )

            # Target label
            suitable = (
                section_match
                and duration_match
                and type_match
                and block_available
                and not train_conflict
            )

            training_rows.append(features)
            training_labels.append(
                int(suitable)
            )

    if not training_rows:
        raise ValueError(
            "No training examples could be created."
        )

    X = pd.DataFrame(
        training_rows,
        columns=FEATURE_NAMES
    )

    y = pd.Series(
        training_labels
    )

    # Make sure both classes exist
    if len(y.unique()) < 2:
        raise ValueError(
            "AI training requires both suitable and unsuitable examples."
        )

    _model.fit(
        X,
        y
    )

    _is_trained = True

    print("AI MODEL TRAINED SUCCESSFULLY")
    print("Training examples:", len(X))
    print("Features:", FEATURE_NAMES)

    return {
        "trained": True,
        "training_examples": len(X),
        "features": FEATURE_NAMES
    }


# =========================================================
# PREDICT BLOCK
# =========================================================

def predict_block(task, block, trains):

    if not _is_trained:
        raise RuntimeError(
            "AI model has not been trained yet."
        )

    features = create_features(
        task,
        block,
        trains
    )

    X = pd.DataFrame(
        [features],
        columns=FEATURE_NAMES
    )

    prediction = int(
        _model.predict(X)[0]
    )

    probabilities = _model.predict_proba(X)[0]

    confidence = round(
        float(max(probabilities)) * 100,
        2
    )

    return {
        "prediction": prediction,
        "confidence": confidence
    }