from pydantic import BaseModel


class TrainSchedule(BaseModel):
    train_id: str
    train_name: str
    section: str
    arrival_time: str
    departure_time: str