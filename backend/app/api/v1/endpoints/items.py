from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.item import ItemCreate, ItemResponse, ItemUpdate
from app.services.item_service import item_service

router = APIRouter(prefix="/items", tags=["Items"])


@router.get(
    "",
    response_model=List[ItemResponse],
    status_code=status.HTTP_200_OK,
    summary="List all items",
)
async def list_items() -> List[ItemResponse]:
    return item_service.get_all()


@router.get(
    "/{item_id}",
    response_model=ItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Get item by ID",
)
async def get_item(item_id: int) -> ItemResponse:
    item = item_service.get_by_id(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with id {item_id} not found",
        )
    return item


@router.post(
    "",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new item",
)
async def create_item(item_in: ItemCreate) -> ItemResponse:
    return item_service.create(item_in)


@router.put(
    "/{item_id}",
    response_model=ItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an existing item",
)
async def update_item(item_id: int, item_in: ItemUpdate) -> ItemResponse:
    item = item_service.update(item_id, item_in)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with id {item_id} not found",
        )
    return item


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an item",
)
async def delete_item(item_id: int) -> None:
    deleted = item_service.delete(item_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with id {item_id} not found",
        )
    return None
