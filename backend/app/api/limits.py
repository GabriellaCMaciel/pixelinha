from dataclasses import asdict

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.services.estimate import DEFAULT_FABRIC_COUNT, FABRIC_COUNTS

router = APIRouter(tags=["limits"])


@router.get("/limits")
def limits(settings: Settings = Depends(get_settings)) -> dict[str, object]:
    """Request limits and fabric choices, so the front-end matches the server."""
    return {
        **asdict(settings),
        "fabric_counts": list(FABRIC_COUNTS),
        "default_fabric_count": DEFAULT_FABRIC_COUNT,
    }
