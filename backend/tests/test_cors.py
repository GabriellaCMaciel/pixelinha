import pytest
from fastapi.testclient import TestClient

from app.core.config import DEFAULT_ALLOWED_ORIGINS, load_cors
from app.main import app

LIMITS = "/api/v1/limits"
PDF = "/api/v1/cross-stitch/pdf"


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_only_local_development_is_allowed_by_default():
    assert load_cors({}).origins == DEFAULT_ALLOWED_ORIGINS
    assert load_cors({}).origin_regex is None


def test_reads_a_comma_separated_list_of_sites():
    cors = load_cors(
        {"STITCHLAB_ALLOWED_ORIGINS": " https://stitchlab.vercel.app/ , https://stitchlab.dev ,"}
    )

    assert cors.origins == ("https://stitchlab.vercel.app", "https://stitchlab.dev")


def test_an_empty_setting_falls_back_to_the_defaults():
    assert load_cors({"STITCHLAB_ALLOWED_ORIGINS": "  "}).origins == DEFAULT_ALLOWED_ORIGINS


def test_reads_an_optional_pattern():
    cors = load_cors({"STITCHLAB_ALLOWED_ORIGIN_REGEX": r"https://stitchlab-.*\.vercel\.app"})

    assert cors.origin_regex == r"https://stitchlab-.*\.vercel\.app"


def test_an_allowed_site_can_read_the_response(client):
    response = client.get(LIMITS, headers={"Origin": "http://localhost:5173"})

    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_another_site_gets_no_permission(client):
    response = client.get(LIMITS, headers={"Origin": "https://evil.example.com"})

    assert "access-control-allow-origin" not in response.headers


def test_the_browser_may_upload_to_the_pdf_route(client):
    response = client.options(
        PDF,
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert "POST" in response.headers["access-control-allow-methods"]


def test_the_pdf_file_name_is_readable_by_the_page(client):
    response = client.get(LIMITS, headers={"Origin": "http://localhost:5173"})

    assert "Content-Disposition" in response.headers["access-control-expose-headers"]
