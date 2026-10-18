---
title: StitchLab API
emoji: 🌸
colorFrom: pink
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
short_description: Turns images into cross-stitch charts and printable PDFs.
---

# StitchLab: API

FastAPI service that turns an image into a cross-stitch chart (DMC threads,
symbols, stitch counts, size and skeins) and into a printable PDF.

The front-end lives in the same repository: <https://github.com/GabriellaCMaciel/stitchlab>.
The header above is the configuration Hugging Face Spaces reads when this folder
is deployed as a Docker Space.

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
| `STITCHLAB_ALLOWED_ORIGINS` | Sites allowed to call the API from a browser, comma separated. Default: the local dev server. |
| `STITCHLAB_ALLOWED_ORIGIN_REGEX` | Pattern for extra allowed sites, such as Vercel preview addresses. |
| `STITCHLAB_MAX_*`, `STITCHLAB_MIN_*` | Upload, grid and color limits. See `app/core/config.py`. |

## Endpoints

`GET /api/v1/health`, `GET /api/v1/limits`, `POST /api/v1/cross-stitch/preview`
and `POST /api/v1/cross-stitch/pdf`. Interactive docs at `/docs`.
