from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, examples=["Projeto Hackathon"])
    description: Optional[str] = Field(None, max_length=500, examples=["Descrição da tarefa ou recurso"])


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class ItemResponse(ItemBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
