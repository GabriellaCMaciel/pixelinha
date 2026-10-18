from dataclasses import asdict

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings

router = APIRouter(tags=["limits"])


@router.get("/limits")
def limits(settings: Settings = Depends(get_settings)) -> dict[str, int]:
    """Request limits, so the front-end uses the same numbers as the server."""
    return asdict(settings)
