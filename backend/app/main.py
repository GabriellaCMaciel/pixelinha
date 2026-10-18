from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import cross_stitch, health, limits
from app.core.config import load_cors

API_PREFIX = "/api/v1"

app = FastAPI(
    title="PixeLinha API",
    description="Turns images into embroidery charts, starting with cross-stitch.",
    version="0.1.0",
)

cors = load_cors()
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(cors.origins),
    allow_origin_regex=cors.origin_regex,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    # The browser needs this to read the PDF file name.
    expose_headers=["Content-Disposition"],
)

app.include_router(health.router, prefix=API_PREFIX)
app.include_router(limits.router, prefix=API_PREFIX)
app.include_router(cross_stitch.router, prefix=API_PREFIX)
