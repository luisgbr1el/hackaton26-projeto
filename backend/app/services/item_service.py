from datetime import datetime, timezone
from typing import List, Optional
from app.schemas.item import ItemCreate, ItemResponse, ItemUpdate


class ItemService:
    def __init__(self):
        self._items: List[ItemResponse] = [
            ItemResponse(
                id=1,
                title="Configuração Inicial",
                description="FastAPI Backend e React + Vite Frontend configurados com sucesso!",
                created_at=datetime.now(timezone.utc),
            ),
            ItemResponse(
                id=2,
                title="Conectar API ao Frontend",
                description="Consumindo dados do FastAPI no React usando Axios e TypeScript.",
                created_at=datetime.now(timezone.utc),
            ),
        ]
        self._next_id = 3

    def get_all(self) -> List[ItemResponse]:
        return self._items

    def get_by_id(self, item_id: int) -> Optional[ItemResponse]:
        return next((item for item in self._items if item.id == item_id), None)

    def create(self, item_in: ItemCreate) -> ItemResponse:
        new_item = ItemResponse(
            id=self._next_id,
            title=item_in.title,
            description=item_in.description,
            created_at=datetime.now(timezone.utc),
        )
        self._next_id += 1
        self._items.append(new_item)
        return new_item

    def update(self, item_id: int, item_in: ItemUpdate) -> Optional[ItemResponse]:
        item = self.get_by_id(item_id)
        if not item:
            return None
        
        updated_data = item.model_dump()
        if item_in.title is not None:
            updated_data["title"] = item_in.title
        if item_in.description is not None:
            updated_data["description"] = item_in.description
        
        updated_item = ItemResponse(**updated_data)
        index = self._items.index(item)
        self._items[index] = updated_item
        return updated_item

    def delete(self, item_id: int) -> bool:
        item = self.get_by_id(item_id)
        if not item:
            return False
        self._items.remove(item)
        return True


item_service = ItemService()
