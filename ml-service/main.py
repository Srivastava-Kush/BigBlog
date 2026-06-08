import os
import re
import logging
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DB_URI = os.getenv("DB_LOCATION")
if not DB_URI:
    raise RuntimeError("DB_LOCATION not set in .env")

client = MongoClient(DB_URI)
db = client.get_default_database()
blogs_col = db["blogs"]

# ── In-memory TF-IDF index ────────────────────────────────────────────────────

vectorizer: Optional[TfidfVectorizer] = None
tfidf_matrix = None          # shape (n_blogs, n_features)
indexed_blogs: list[dict] = []   # metadata kept in same order as matrix rows


def extract_text_from_editorjs(content) -> str:
    """Pull plain text out of an EditorJS content structure.

    The Blog schema stores `content` as an array.  The first element is
    typically the EditorJS document object: { blocks: [...] }.
    Each block has a `type` and `data` dict.
    """
    if not content:
        return ""

    # content is stored as a Python list (Mongoose `type: []`).
    # Walk the list looking for the EditorJS document object, which is a dict
    # with a "blocks" key.  Older / test documents may have mixed types
    # (ints, strings, etc.) in the array — skip those silently.
    doc = None
    items_to_check = content if isinstance(content, list) else [content]
    for item in items_to_check:
        if isinstance(item, dict) and "blocks" in item:
            doc = item
            break

    if doc is None:
        return ""

    raw_blocks = doc.get("blocks", [])
    if not isinstance(raw_blocks, list):
        return ""

    parts: list[str] = []

    for block in raw_blocks:
        # Guard: skip anything that isn't a plain dict (ints, strings, None …)
        if not isinstance(block, dict):
            continue

        btype = block.get("type", "")
        data = block.get("data")
        if not isinstance(data, dict):
            data = {}

        if btype in ("paragraph", "header", "quote", "warning", "checklist"):
            text = data.get("text") or ""
            if not isinstance(text, str):
                text = str(text)
            # EditorJS stores inline HTML in text; strip tags
            text = re.sub(r"<[^>]+>", " ", text)
            parts.append(text)
            if btype == "quote":
                caption = data.get("caption") or ""
                if caption:
                    parts.append(re.sub(r"<[^>]+>", " ", str(caption)))

        elif btype == "list":
            items = data.get("items")
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, str):
                        parts.append(re.sub(r"<[^>]+>", " ", item))
                    elif isinstance(item, dict):
                        parts.append(re.sub(r"<[^>]+>", " ", str(item.get("content") or "")))

        elif btype == "code":
            code = data.get("code") or ""
            parts.append(str(code))

        elif btype == "image":
            caption = data.get("caption") or ""
            if caption:
                parts.append(str(caption))

        elif btype == "linkTool":
            link_data = data.get("meta") or {}
            if isinstance(link_data, dict):
                parts.append(str(link_data.get("title") or ""))
                parts.append(str(link_data.get("description") or ""))

    return " ".join(filter(None, parts))


def build_document(blog: dict) -> str:
    """Combine all searchable fields into a single string for TF-IDF."""
    title = str(blog.get("title") or "")
    des   = str(blog.get("des")   or "")

    raw_tags = blog.get("tags") or []
    tags = " ".join(str(t) for t in raw_tags if t) if isinstance(raw_tags, list) else ""

    body = extract_text_from_editorjs(blog.get("content"))

    # Weight title/tags by repeating them — gives them higher TF scores
    return f"{title} {title} {title} {tags} {tags} {des} {body}"


def build_index():
    """Fetch all published blogs from MongoDB and (re)build the TF-IDF matrix."""
    global vectorizer, tfidf_matrix, indexed_blogs

    log.info("Building TF-IDF index…")
    cursor = blogs_col.find(
        {"draft": False},
        {
            "blog_id": 1,
            "title": 1,
            "des": 1,
            "tags": 1,
            "content": 1,
            "banner": 1,
            "activity": 1,
            "publishedAt": 1,
            "author": 1,
        },
    )
    blogs = list(cursor)

    if not blogs:
        log.warning("No published blogs found — index is empty.")
        indexed_blogs = []
        tfidf_matrix = None
        vectorizer = None
        return

    documents = [build_document(b) for b in blogs]

    vectorizer = TfidfVectorizer(
        strip_accents="unicode",
        lowercase=True,
        ngram_range=(1, 2),
        max_df=0.95,
        min_df=1,
        sublinear_tf=True,
    )
    tfidf_matrix = vectorizer.fit_transform(documents)

    # Keep only the fields the Node.js /search-blogs route normally returns
    indexed_blogs = [
        {
            "blog_id": str(b.get("blog_id", "")),
            "title": b.get("title", ""),
            "des": b.get("des", ""),
            "tags": b.get("tags", []),
            "banner": b.get("banner", ""),
            "activity": b.get("activity", {}),
            "publishedAt": b.get("publishedAt").isoformat() if b.get("publishedAt") else None,
            "_blog_mongo_id": str(b.get("_id", "")),
        }
        for b in blogs
    ]

    log.info(f"Index built: {len(indexed_blogs)} blogs, {tfidf_matrix.shape[1]} features.")


# ── Startup / shutdown ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    build_index()
    yield
    client.close()


app = FastAPI(title="BigBlog ML Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / response models ─────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    top_k: int = 20


class IndexBlogRequest(BaseModel):
    blog_id: Optional[str] = None  # if None, rebuild the whole index


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/semantic-search")
def semantic_search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if vectorizer is None or tfidf_matrix is None or not indexed_blogs:
        raise HTTPException(status_code=503, detail="Index is empty — no published blogs yet.")

    query_vec = vectorizer.transform([req.query])
    scores = cosine_similarity(query_vec, tfidf_matrix).flatten()

    # Sort descending by score, take top_k non-zero results
    top_indices = np.argsort(scores)[::-1][: req.top_k]

    results = []
    for idx in top_indices:
        score = float(scores[idx])
        if score < 0.001:
            break
        blog = dict(indexed_blogs[idx])
        blog["similarity_score"] = round(score, 4)
        blog["relevance_pct"] = round(score * 100, 1)
        results.append(blog)

    return {"blogs": results, "total": len(results)}


@app.post("/index-blog")
def index_blog(req: IndexBlogRequest):
    """Rebuild the full TF-IDF index.

    Called by Node.js after a blog is published or updated.
    A full rebuild is simple and correct; for large corpora a partial
    update would be faster, but TFIDF global IDF scores must be recomputed
    whenever the corpus changes anyway.
    """
    try:
        build_index()
        return {"status": "ok", "indexed": len(indexed_blogs)}
    except Exception as e:
        log.error(f"Index rebuild failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {
        "status": "ok",
        "indexed_blogs": len(indexed_blogs),
        "index_ready": vectorizer is not None,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_SERVICE_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
