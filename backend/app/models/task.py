from pydantic import BaseModel
from typing import Optional


class MaintenanceTask(BaseModel):
    task_id: str
    department: str
    asset_type: str
    section: str
    maintenance_type: str
    duration_hours: float
    priority: str
    due_date: str
    condition: Optional[str] = None