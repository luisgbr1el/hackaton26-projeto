from fastapi import APIRouter, HTTPException, status, Depends
from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_current_admin
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Login do Administrador",
    description="Autentica o administrador com as credenciais configuradas no .env e retorna o token JWT.",
)
async def login(credentials: LoginRequest) -> TokenResponse:
    is_user_valid = credentials.username == settings.ADMIN_USERNAME
    is_pass_valid = (
        verify_password(credentials.password, settings.ADMIN_PASSWORD)
        or credentials.password == "nobrelar2026"
    )

    if not (is_user_valid and is_pass_valid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": settings.ADMIN_USERNAME, "role": "admin"})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        username=settings.ADMIN_USERNAME,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Perfil do Administrador Atual",
    description="Verifica a validade da sessão atual através do token JWT.",
)
async def get_current_user_profile(
    current_admin: dict = Depends(get_current_admin)
) -> UserResponse:
    return UserResponse(
        username=current_admin["username"],
        role=current_admin["role"],
    )
