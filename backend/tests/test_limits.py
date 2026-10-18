import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_limits_match_the_default_settings(client):
    response = client.get("/api/v1/limits")

    assert response.status_code == 200
    body = response.json()
    assert body["min_grid_width"] == 10
    assert body["max_grid_width"] == 300
    assert body["min_colors"] == 1
    assert body["max_colors"] == 40
    assert body["max_stitches"] == 90_000
    assert body["max_upload_bytes"] == 10 * 1024 * 1024


def test_limits_offer_the_fabric_counts(client):
    body = client.get("/api/v1/limits").json()

    assert body["fabric_counts"] == [11, 14, 16, 18, 20, 22]
    assert body["default_fabric_count"] == 14


def test_limits_follow_the_configured_settings(client):
    settings = Settings(max_grid_width=500, max_colors=20)
    app.dependency_overrides[get_settings] = lambda: settings

    body = client.get("/api/v1/limits").json()

    assert body["max_grid_width"] == 500
    assert body["max_colors"] == 20


def test_limits_expose_every_setting(client):
    body = client.get("/api/v1/limits").json()

    assert set(Settings.__dataclass_fields__) <= set(body)
