PRIORITY_POINTS = {
    "High": 40,
    "Medium": 25,
    "Low": 10
}

CONDITION_POINTS = {
    "Critical": 35,
    "Warning": 20,
    "Good": 5
}


def calculate_risk_score(task):
    """
    Calculate the risk score for one maintenance task.
    Score range: 0-100.
    """

    priority = task.get("priority", "Low")
    condition = task.get("condition", "Good")

    priority_score = PRIORITY_POINTS.get(priority, 10)
    condition_score = CONDITION_POINTS.get(condition, 5)

    # Initial prototype urgency value.
    # We will make this date-aware in the next iteration.
    urgency_score = 10

    risk_score = min(
        priority_score + condition_score + urgency_score,
        100
    )

    if risk_score >= 70:
        risk_level = "HIGH"
    elif risk_score >= 45:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        **task,
        "risk_score": risk_score,
        "risk_level": risk_level
    }


def calculate_priority(tasks):
    """
    Calculate risk information for all maintenance tasks.
    """

    return [
        calculate_risk_score(task)
        for task in tasks
    ]