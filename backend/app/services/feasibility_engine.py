import pandas as pd


def check_section(task, block):
    """Check whether task and block belong to the same section."""
    return str(task["section"]).strip() == str(block["section"]).strip()


def check_duration(task, block):
    """Check whether the block is long enough for the maintenance task."""
    return float(task["duration_hours"]) <= float(block["duration_hours"])


def check_block_type(task, block):
    """Check whether the block type matches the task requirement."""

    required_type = str(
        task.get("required_block_type", "")
    ).strip().lower()

    block_type = str(
        block.get("block_type", "")
    ).strip().lower()

    # If the task doesn't specify a block type,
    # don't reject the block for this reason.
    if not required_type:
        return True

    return required_type == block_type


def check_block_status(block):
    """Check whether the block is available for planning."""

    status = str(
        block.get("status", "")
    ).strip().lower()

    return status in ["available", "free", "open"]


def check_time_overlap(block, train_schedule):
    """
    Check whether a train is using the same section
    during the proposed maintenance block.
    """

    block_start = pd.to_datetime(block["start_time"])
    block_end = pd.to_datetime(block["end_time"])

    block_section = str(block["section"]).strip()

    for _, train in train_schedule.iterrows():

        train_section = str(train["section"]).strip()

        # Only trains on the same section matter.
        if train_section != block_section:
            continue

        train_arrival = pd.to_datetime(train["arrival_time"])
        train_departure = pd.to_datetime(train["departure_time"])

        # Check whether train movement overlaps the block.
        if (
            block_start < train_departure
            and block_end > train_arrival
        ):
            return False

    return True


def check_feasibility(task, block, train_schedule):
    """Check whether one maintenance task can use one block."""

    section_ok = check_section(task, block)

    duration_ok = check_duration(task, block)

    block_type_ok = check_block_type(task, block)

    status_ok = check_block_status(block)

    time_ok = False

    if section_ok and status_ok:
        time_ok = check_time_overlap(
            block,
            train_schedule
        )

    feasible = (
        section_ok
        and duration_ok
        and block_type_ok
        and status_ok
        and time_ok
    )

    reasons = []

    if not section_ok:
        reasons.append("Section mismatch")

    if not duration_ok:
        reasons.append("Insufficient block duration")

    if not block_type_ok:
        reasons.append("Block type mismatch")

    if not status_ok:
        reasons.append("Block is not available")

    if section_ok and status_ok and not time_ok:
        reasons.append("Train movement conflict")

    if feasible:
        reasons.append("All constraints satisfied")

    return {
        "task_id": task["task_id"],
        "block_id": block["block_id"],
        "feasible": feasible,
        "reason": "; ".join(reasons)
    }


def find_feasible_blocks(task, blocks, train_schedule):
    """Find all possible blocks for one maintenance task."""

    results = []

    for _, block in blocks.iterrows():

        result = check_feasibility(
            task,
            block,
            train_schedule
        )

        results.append(result)

    return results


def check_all_feasibility(tasks, blocks, train_schedule):
    """Check every task against every available block."""

    results = []

    for _, task in tasks.iterrows():

        task_results = find_feasible_blocks(
            task,
            blocks,
            train_schedule
        )

        results.extend(task_results)

    return results