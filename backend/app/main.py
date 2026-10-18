from fastapi import FastAPI

from app.api import cross_stitch, health, limits

API_PREFIX = "/api/v1"

app = FastAPI(
    title="StitchLab API",
    description="Turns images into embroidery charts, starting with cross-stitch.",
    version="0.1.0",
)

app.include_router(health.router, prefix=API_PREFIX)
app.include_router(limits.router, prefix=API_PREFIX)
app.include_router(cross_stitch.router, prefix=API_PREFIX)
