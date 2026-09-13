from pydantic import BaseModel
from typing import Optional


class Asset(BaseModel):
    asset_id: str
    asset_type: str
    section: str
    condition: Optional[str] = None