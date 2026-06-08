"""
Semantic search endpoint tests — /semantic-search and /index-blog.

Covers:
- Input validation (empty query, missing field)
- Response schema (fields, types)
- Empty-index 503 behaviour
- Ranking: a query about Python should rank the Python blog higher than
  the React blog.
- top_k limiting
"""

import pytest


# ── Input validation ──────────────────────────────────────────────────────────

def test_empty_query_returns_422_or_400(seeded_index_client):
    """FastAPI validates the Pydantic model — empty string is still a string,
    but the endpoint must reject it with 400 (our HTTPException) or 422."""
    res = seeded_index_client.post("/semantic-search", json={"query": "", "top_k": 10})
    assert res.status_code in (400, 422)


def test_whitespace_only_query_rejected(seeded_index_client):
    res = seeded_index_client.post("/semantic-search", json={"query": "   ", "top_k": 10})
    assert res.status_code in (400, 422)


def test_missing_query_field_returns_422(seeded_index_client):
    res = seeded_index_client.post("/semantic-search", json={"top_k": 5})
    assert res.status_code == 422


def test_empty_index_returns_503(empty_index_client):
    res = empty_index_client.post(
        "/semantic-search", json={"query": "python programming", "top_k": 5}
    )
    assert res.status_code == 503


# ── Response schema ───────────────────────────────────────────────────────────

def test_response_has_blogs_and_total_keys(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "python", "top_k": 10}
    )
    assert res.status_code == 200
    data = res.json()
    assert "blogs" in data
    assert "total" in data


def test_total_matches_length_of_blogs_list(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "python", "top_k": 10}
    )
    data = res.json()
    assert data["total"] == len(data["blogs"])


def test_blog_entry_has_required_fields(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "python", "top_k": 10}
    )
    blogs = res.json()["blogs"]
    assert len(blogs) > 0
    first = blogs[0]
    for field in ("blog_id", "title", "similarity_score", "relevance_pct"):
        assert field in first, f"Missing field: {field}"


def test_similarity_scores_are_between_0_and_1(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "machine learning", "top_k": 10}
    )
    for blog in res.json()["blogs"]:
        assert 0.0 <= blog["similarity_score"] <= 1.0


def test_relevance_pct_is_100x_similarity_score(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "react hooks", "top_k": 10}
    )
    for blog in res.json()["blogs"]:
        expected = round(blog["similarity_score"] * 100, 1)
        assert abs(blog["relevance_pct"] - expected) < 0.01


def test_results_are_sorted_by_descending_score(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "programming tutorial", "top_k": 10}
    )
    scores = [b["similarity_score"] for b in res.json()["blogs"]]
    assert scores == sorted(scores, reverse=True)


# ── Ranking behaviour ─────────────────────────────────────────────────────────

def test_python_query_returns_python_blog_first(seeded_index_client):
    """
    The Python blog document repeats the word 'python' many times (title,
    tags × 2, body).  A 'python programming' query should rank it highest.
    """
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "python programming", "top_k": 10}
    )
    blogs = res.json()["blogs"]
    assert len(blogs) > 0
    assert blogs[0]["blog_id"] == "python-intro-abc"


def test_react_query_returns_react_blog_first(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "react hooks javascript frontend", "top_k": 10}
    )
    blogs = res.json()["blogs"]
    assert len(blogs) > 0
    assert blogs[0]["blog_id"] == "react-hooks-guide-xyz"


def test_machine_learning_query_returns_ml_blog_first(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "machine learning tensorflow neural network", "top_k": 10}
    )
    blogs = res.json()["blogs"]
    assert len(blogs) > 0
    assert blogs[0]["blog_id"] == "ml-tensorflow-guide"


# ── top_k limiting ────────────────────────────────────────────────────────────

def test_top_k_limits_results(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "python react machine learning", "top_k": 2}
    )
    assert len(res.json()["blogs"]) <= 2


def test_top_k_zero_returns_empty_list(seeded_index_client):
    res = seeded_index_client.post(
        "/semantic-search", json={"query": "python", "top_k": 0}
    )
    assert res.status_code == 200
    assert res.json()["blogs"] == []


# ── /index-blog ───────────────────────────────────────────────────────────────

def test_index_blog_returns_ok_and_count(seeded_index_client):
    res = seeded_index_client.post("/index-blog", json={})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert isinstance(data["indexed"], int)
