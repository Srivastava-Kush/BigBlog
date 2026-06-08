"""
conftest.py — session-scoped fixtures for the ML service test suite.

Strategy
--------
main.py calls MongoClient at module-load time (line 25) and builds the
TF-IDF index during the FastAPI lifespan startup event.  To run tests
without a real MongoDB we:

1. Patch pymongo.MongoClient *before* main.py is imported by forcing it
   to return a MagicMock whose cursor returns an empty list.
2. Import main and the FastAPI app after the patch is in place.
3. Provide a TestClient factory so individual test modules can request an
   app client with an optionally pre-seeded index.
"""

import os
import sys
import importlib
from unittest.mock import MagicMock

import pytest

# ── Required env var — must be set before main.py is imported ────────────────
os.environ.setdefault("DB_LOCATION", "mongodb://localhost:27017/test_bigblog")


def _make_mock_mongo(blogs: list | None = None):
    """Return a MongoClient mock whose blogs collection find() yields `blogs`."""
    if blogs is None:
        blogs = []

    mock_instance = MagicMock()
    mock_db = MagicMock()
    mock_col = MagicMock()

    mock_instance.get_default_database.return_value = mock_db
    mock_db.__getitem__.return_value = mock_col
    mock_col.find.return_value = iter(blogs)

    return mock_instance


@pytest.fixture(scope="session")
def empty_index_client():
    """TestClient with an empty TF-IDF index (no published blogs)."""
    import pymongo

    original = pymongo.MongoClient
    pymongo.MongoClient = MagicMock(return_value=_make_mock_mongo([]))

    # Remove any previously cached import of main
    sys.modules.pop("main", None)

    import main as ml_main
    from fastapi.testclient import TestClient

    with TestClient(ml_main.app) as client:
        yield client

    pymongo.MongoClient = original
    sys.modules.pop("main", None)


@pytest.fixture(scope="session")
def seeded_index_client():
    """
    TestClient whose index is pre-seeded with three synthetic blogs that
    cover different topics, enabling ranking/relevance tests.
    """
    from datetime import datetime

    blogs = [
        {
            "_id": "id1",
            "blog_id": "python-intro-abc",
            "title": "Introduction to Python Programming",
            "des": "Learn Python from scratch with examples.",
            "tags": ["python", "programming", "beginner"],
            "content": [
                {
                    "blocks": [
                        {"type": "paragraph", "data": {"text": "Python is great for data science and automation."}}
                    ]
                }
            ],
            "banner": "",
            "activity": {"total_likes": 10, "total_comments": 2, "total_reads": 100},
            "publishedAt": datetime(2024, 1, 1),
        },
        {
            "_id": "id2",
            "blog_id": "react-hooks-guide-xyz",
            "title": "Mastering React Hooks",
            "des": "A deep-dive into useState, useEffect, and custom hooks.",
            "tags": ["react", "javascript", "frontend"],
            "content": [
                {
                    "blocks": [
                        {"type": "paragraph", "data": {"text": "React hooks changed the way we write components."}}
                    ]
                }
            ],
            "banner": "",
            "activity": {"total_likes": 30, "total_comments": 5, "total_reads": 300},
            "publishedAt": datetime(2024, 2, 1),
        },
        {
            "_id": "id3",
            "blog_id": "ml-tensorflow-guide",
            "title": "Machine Learning with TensorFlow",
            "des": "Build neural networks using TensorFlow and Keras.",
            "tags": ["machine-learning", "tensorflow", "python"],
            "content": [
                {
                    "blocks": [
                        {"type": "paragraph", "data": {"text": "Deep learning with neural networks."}}
                    ]
                }
            ],
            "banner": "",
            "activity": {"total_likes": 50, "total_comments": 8, "total_reads": 500},
            "publishedAt": datetime(2024, 3, 1),
        },
    ]

    import pymongo

    original = pymongo.MongoClient

    # Each call to MongoClient (once per request to /index-blog) should
    # return fresh iterators, so we use a side_effect factory.
    def mongo_factory(*args, **kwargs):
        return _make_mock_mongo(list(blogs))

    pymongo.MongoClient = MagicMock(side_effect=mongo_factory)

    sys.modules.pop("main", None)

    import main as ml_main
    from fastapi.testclient import TestClient

    with TestClient(ml_main.app) as client:
        yield client

    pymongo.MongoClient = original
    sys.modules.pop("main", None)
