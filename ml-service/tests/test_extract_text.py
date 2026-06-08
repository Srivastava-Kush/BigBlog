"""
Unit tests for extract_text_from_editorjs() and build_document().

These are pure-function tests — no network, no database, no HTTP calls.
They verify that the text extraction correctly handles every EditorJS
block type the application produces.
"""

import sys
import os

import pytest

# ── Import the functions under test ───────────────────────────────────────────
# We import directly from main.py to test the actual implementations.
# Since MongoClient is called at module level, patch it before importing.

from unittest.mock import MagicMock
import pymongo

_original = pymongo.MongoClient
pymongo.MongoClient = MagicMock(return_value=MagicMock())
os.environ.setdefault("DB_LOCATION", "mongodb://localhost:27017/test")

sys.modules.pop("main", None)
import main
from main import extract_text_from_editorjs, build_document

pymongo.MongoClient = _original


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_content(*blocks):
    """Wrap blocks in the EditorJS document envelope that MongoDB stores."""
    return [{"blocks": list(blocks)}]


def para(text):
    return {"type": "paragraph", "data": {"text": text}}


def header(text):
    return {"type": "header", "data": {"text": text}}


def quote(text, caption=""):
    return {"type": "quote", "data": {"text": text, "caption": caption}}


def code_block(code):
    return {"type": "code", "data": {"code": code}}


def list_block(*items):
    return {"type": "list", "data": {"items": list(items)}}


def image_block(caption=""):
    return {"type": "image", "data": {"url": "https://example.com/img.jpg", "caption": caption}}


def link_block(title="", description=""):
    return {"type": "linkTool", "data": {"meta": {"title": title, "description": description}}}


# ── Empty / edge cases ────────────────────────────────────────────────────────

def test_returns_empty_string_for_none():
    assert extract_text_from_editorjs(None) == ""


def test_returns_empty_string_for_empty_list():
    assert extract_text_from_editorjs([]) == ""


def test_returns_empty_string_for_list_with_no_blocks_key():
    assert extract_text_from_editorjs([{"type": "not-editorjs"}]) == ""


def test_returns_empty_string_when_blocks_is_empty():
    result = extract_text_from_editorjs([{"blocks": []}])
    assert result == ""


def test_skips_non_dict_blocks_gracefully():
    content = [{"blocks": [42, "string", None, para("valid")]}]
    result = extract_text_from_editorjs(content)
    assert "valid" in result


# ── Paragraph ─────────────────────────────────────────────────────────────────

def test_extracts_paragraph_text():
    result = extract_text_from_editorjs(make_content(para("Hello world")))
    assert "Hello world" in result


def test_strips_html_tags_from_paragraph():
    result = extract_text_from_editorjs(
        make_content(para("<b>Bold</b> and <i>italic</i>"))
    )
    assert "Bold" in result
    assert "italic" in result
    assert "<b>" not in result


# ── Header ────────────────────────────────────────────────────────────────────

def test_extracts_header_text():
    result = extract_text_from_editorjs(make_content(header("Section Title")))
    assert "Section Title" in result


# ── Quote ─────────────────────────────────────────────────────────────────────

def test_extracts_quote_text():
    result = extract_text_from_editorjs(make_content(quote("Famous words")))
    assert "Famous words" in result


def test_extracts_quote_caption():
    result = extract_text_from_editorjs(make_content(quote("Quote", "— Author")))
    assert "Author" in result


# ── List ──────────────────────────────────────────────────────────────────────

def test_extracts_string_list_items():
    result = extract_text_from_editorjs(make_content(list_block("item one", "item two")))
    assert "item one" in result
    assert "item two" in result


def test_extracts_dict_list_items():
    block = {"type": "list", "data": {"items": [{"content": "nested item"}]}}
    result = extract_text_from_editorjs([{"blocks": [block]}])
    assert "nested item" in result


# ── Code ──────────────────────────────────────────────────────────────────────

def test_extracts_code_block_text():
    result = extract_text_from_editorjs(
        make_content(code_block("def hello(): print('hi')"))
    )
    assert "def hello" in result


# ── Image ─────────────────────────────────────────────────────────────────────

def test_extracts_image_caption():
    result = extract_text_from_editorjs(
        make_content(image_block("A beautiful sunset"))
    )
    assert "A beautiful sunset" in result


def test_image_without_caption_returns_empty_for_that_block():
    result = extract_text_from_editorjs(make_content(image_block("")))
    # No error; result may be empty or whitespace
    assert result.strip() == ""


# ── Link tool ─────────────────────────────────────────────────────────────────

def test_extracts_link_title_and_description():
    result = extract_text_from_editorjs(
        make_content(link_block("Great Article", "A must-read piece"))
    )
    assert "Great Article" in result
    assert "A must-read piece" in result


# ── Multiple blocks ───────────────────────────────────────────────────────────

def test_combines_multiple_block_types():
    content = make_content(
        header("My Post"),
        para("Introduction paragraph"),
        list_block("point one", "point two"),
        code_block("x = 1"),
    )
    result = extract_text_from_editorjs(content)
    assert "My Post" in result
    assert "Introduction paragraph" in result
    assert "point one" in result
    assert "x = 1" in result


# ── build_document ────────────────────────────────────────────────────────────

def test_build_document_repeats_title_three_times():
    blog = {"title": "UniqueTitle", "des": "", "tags": [], "content": []}
    doc = build_document(blog)
    assert doc.count("UniqueTitle") == 3


def test_build_document_repeats_tags_twice():
    blog = {"title": "", "des": "", "tags": ["python"], "content": []}
    doc = build_document(blog)
    assert doc.count("python") == 2


def test_build_document_includes_description():
    blog = {"title": "", "des": "A test description", "tags": [], "content": []}
    doc = build_document(blog)
    assert "A test description" in doc


def test_build_document_includes_body_text():
    blog = {
        "title": "",
        "des": "",
        "tags": [],
        "content": make_content(para("Body content here")),
    }
    doc = build_document(blog)
    assert "Body content here" in doc


def test_build_document_handles_missing_fields_gracefully():
    doc = build_document({})
    assert isinstance(doc, str)
