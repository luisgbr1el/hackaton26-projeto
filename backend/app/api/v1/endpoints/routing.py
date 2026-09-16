from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.services.routing_service import routing_service
from app.services.fleet_service import fleet_service, VehicleConfig
from app.schemas.routing import PreviewResponse, OptimizeResponse

router = APIRouter(prefix="/routing", tags=["Roteirização e Despacho"])


@router.get(
    "/fleet",
    response_model=List[VehicleConfig],
    status_code=status.HTTP_200_OK,
    summary="Listar frota oficial de veículos",
    description="Retorna a relação dos 5 veículos oficiais com suas cores, capacidades e perfis de operação.",
)
async def get_fleet() -> List[VehicleConfig]:
    return fleet_service.get_all_vehicles()


@router.post(
    "/preview",
    response_model=PreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Pré-visualização e Diagnóstico do CSV de Pedidos",
    description="Lê o arquivo CSV, separa pedidos de RETIRADA, quantifica tipos de entrega e diagnostica o lote antes da otimização.",
)
async def preview_csv(file: UploadFile = File(...)) -> PreviewResponse:
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo inválido. Por favor envie um arquivo com extensão .csv",
        )
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado está vazio.",
        )
    return routing_service.generate_preview(file.filename, content)


@router.post(
    "/optimize",
    response_model=OptimizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Otimização de Rotas (Google OR-Tools + Engenharia de Prompt)",
    description="Processa o CSV de pedidos, interpreta instruções do despachante, aloca os veículos oficiais, calcula as rotas e gera os manifestos LIFO.",
)
async def optimize_routes(
    file: UploadFile = File(...),
    user_prompt: Optional[str] = Form(None),
) -> OptimizeResponse:
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo inválido. Por favor envie um arquivo com extensão .csv",
        )
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado está vazio.",
        )
    return routing_service.optimize_routes(file.filename, content, user_prompt=user_prompt)
