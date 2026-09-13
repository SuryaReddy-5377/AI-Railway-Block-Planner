from pydantic import BaseModel


class AvailableBlock(BaseModel):
    block_id: str
    section: str
    block_start: str
    block_end: str
    block_duration_hours: float