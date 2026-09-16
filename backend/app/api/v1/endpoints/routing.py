from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, status
from app.services.routing_service import routing_service
from app.services.fleet_service import fleet_service, VehicleConfig
from app.schemas.routing import PreviewResponse, OptimizeResponse, DispatchSummaryResponse

router = APIRouter(prefix="/routing", tags=["Roteirização e Despacho"])


@router.get(
    "/fleet",
    response_model=List[VehicleConfig],
    status_code=status.HTTP_200_OK,
    summary="Listar frota oficial de veículos",
    description="Retorna a relação dos 5 veículos oficiais com suas cores, capacidades, dados de combustível e perfis de operação.",
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
    summary="Otimização de Rotas (Google OR-Tools + Resumo Comparativo de Estratégias)",
    description=(
        "Processa o CSV de pedidos e calcula automaticamente as 5 opções estratégicas de rota "
        "(recomendada, menor custo, menor tempo, menor peso e menor volume). Retorna um resumo executivo "
        "enxuto de cada estratégia para decisão do usuário, persistindo os cálculos detalhados no SQLite."
    ),
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
    return routing_service.optimize_routes(
        file.filename,
        content,
        user_prompt=user_prompt,
    )


@router.get(
    "/summary/{report_id}",
    response_model=DispatchSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Resumo Consolidado de Despacho e Carregamento (Dados JSON para PDF)",
    description=(
        "Retorna os dados consolidados em formato JSON prontos para geração e renderização do PDF no frontend: "
        "valor total, peso total, volume total, distância total, ocupação segura (%), caminhão selecionado, "
        "rota definida (recomendada, menor custo, menor tempo, menor peso, menor volume), "
        "métricas de consumo/abastecimento de combustível e tabela com a ordem física de carregamento LIFO "
        "(do fundo à porta do baú)."
    ),
)
async def get_dispatch_summary(
    report_id: int,
    strategy: Optional[str] = Query("recomendada"),
) -> DispatchSummaryResponse:
    return routing_service.get_dispatch_summary(
        report_id=report_id,
        strategy=strategy or "recomendada",
    )

