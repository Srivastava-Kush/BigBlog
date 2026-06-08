"""
Health endpoint tests — verifies the /health route contract.
"""

import pytest


def test_health_returns_200(empty_index_client):
    res = empty_index_client.get("/health")
    assert res.status_code == 200


def test_health_response_has_status_field(empty_index_client):
    res = empty_index_client.get("/health")
    assert res.json()["status"] == "ok"


def test_health_response_has_indexed_blogs_field(empty_index_client):
    res = empty_index_client.get("/health")
    data = res.json()
    assert "indexed_blogs" in data
    assert isinstance(data["indexed_blogs"], int)


def test_health_response_has_index_ready_field(empty_index_client):
    res = empty_index_client.get("/health")
    data = res.json()
    assert "index_ready" in data
    assert isinstance(data["index_ready"], bool)


def test_health_empty_index_reports_zero_blogs(empty_index_client):
    res = empty_index_client.get("/health")
    assert res.json()["indexed_blogs"] == 0


def test_health_empty_index_reports_not_ready(empty_index_client):
    res = empty_index_client.get("/health")
    assert res.json()["index_ready"] is False


def test_health_seeded_index_reports_blogs(seeded_index_client):
    res = seeded_index_client.get("/health")
    data = res.json()
    assert data["indexed_blogs"] == 3
    assert data["index_ready"] is True
