# PixeLinha: API

FastAPI service that turns an image into a cross-stitch chart (DMC threads,
symbols, stitch counts, size and skeins) and into a printable PDF.

The front-end lives in the same repository: <https://github.com/GabriellaCMaciel/pixelinha>.
`Dockerfile` builds the image; the port comes from the `PORT` variable (10000 by default).
`render.yaml` at the repository root deploys it to Render's free plan.

## Running

```bash
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload      # http://localhost:8000/docs
.venv/bin/python -m pytest
```

## Settings

All optional, set as environment variables (see `.env.example`).

| Variable | Meaning |
|---|---|
| `PIXELINHA_ALLOWED_ORIGINS` | Sites allowed to call the API from a browser, comma separated. Default: the local dev server. |
| `PIXELINHA_ALLOWED_ORIGIN_REGEX` | Pattern for extra allowed sites, such as Vercel preview addresses. |
| `PIXELINHA_MAX_*`, `PIXELINHA_MIN_*` | Upload, grid and color limits. See `app/core/config.py`. |

## Endpoints

`GET /api/v1/health`, `GET /api/v1/limits`, `POST /api/v1/cross-stitch/preview`
and `POST /api/v1/cross-stitch/pdf`. Interactive docs at `/docs`.
