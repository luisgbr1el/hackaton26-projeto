from typing import List
from fastapi import APIRouter, HTTPException, status, Query
from app.db.sqlite import list_reports, get_report_by_id, delete_report
from app.schemas.reports import ReportSummary, ReportDetail

router = APIRouter(prefix="/reports", tags=["Relatórios"])


@router.get(
    "",
    response_model=List[ReportSummary],
    status_code=status.HTTP_200_OK,
    summary="Listar histórico de relatórios",
    description="Retorna a lista de relatórios de despacho gerados e gravados no SQLite.",
)
async def get_all_reports(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> List[ReportSummary]:
    records = list_reports(limit=limit, offset=offset)
    return [ReportSummary(**rec) for rec in records]


@router.get(
    "/{report_id}",
    response_model=ReportDetail,
    status_code=status.HTTP_200_OK,
    summary="Obter detalhes do relatório",
    description="Retorna o manifesto em Markdown e os dados GeoJSON salvos da rota.",
)
async def get_report(report_id: int) -> ReportDetail:
    record = get_report_by_id(report_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relatório com ID {report_id} não foi encontrado.",
        )
    return ReportDetail(**record)


@router.delete(
    "/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir relatório",
    description="Remove um relatório do histórico gravado no banco SQLite.",
)
async def remove_report(report_id: int) -> None:
    deleted = delete_report(report_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relatório com ID {report_id} não foi encontrado.",
        )
    return None
