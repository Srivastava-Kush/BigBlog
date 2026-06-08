# QA Summary — BigBlog Platform

## What was built

A complete automated test suite was added from scratch to a MERN
blogging platform that previously had zero automated tests (the only
existing file, `ml-service/test_search.py`, was a comparison script, not
a test suite).

---

## Architecture changes to support testability

### `server/app.js` (new file)
All Express route logic was extracted from `server/server.js` into a new
`app.js` that **exports the configured Express app** without starting the
HTTP server or connecting to the database.  This is the standard Node.js
pattern for testable APIs.  The Firebase Admin initialisation is wrapped
in a try/catch so the service-account JSON file is not required in test
or CI environments.

### `server/server.js` (simplified)
Reduced to a thin entry-point: imports `app.js`, calls
`mongoose.connect()`, and calls `app.listen()`.  No route logic remains
here.

---

## Test files added

### Backend (`server/tests/`)

| File | Tests | Description |
|------|-------|-------------|
| `setup.js` | — | MongoDB Memory Server setup, Firebase/Cloudinary mocks |
| `auth.test.js` | 16 | Signup, signin, Google auth, verifyJWT middleware |
| `blog.test.js` | 22 | Blog CRUD, search, trending, count, semantic search proxy |
| `user.test.js` | 17 | Profile read/update, image update, password change |
| `comments.test.js` | 10 | Add/list/delete comments |
| `notifications.test.js` | 13 | Notification check/list/count, like/unlike |
| **Total** | **78** | |

### Frontend (`blogging website - frontend/src/tests/`)

| File | Tests | Description |
|------|-------|-------------|
| `setup.js` | — | jest-dom, router/motion/axios/firebase mocks |
| `loader.test.jsx` | 4 | Loader spinner rendering |
| `nodata.test.jsx` | 4 | Empty state message |
| `input.test.jsx` | 9 | Input field attributes, password toggle |
| `blog-post.test.jsx` | 11 | Blog card fields, link, relevance badge |
| **Total** | **28** | |

### ML Service (`ml-service/tests/`)

| File | Tests | Description |
|------|-------|-------------|
| `conftest.py` | — | Empty-index and seeded-index TestClient fixtures |
| `test_health.py` | 7 | /health endpoint schema + values |
| `test_semantic_search.py` | 16 | /semantic-search validation, schema, ranking, top_k; /index-blog |
| `test_extract_text.py` | 27 | extract_text_from_editorjs() unit tests for all block types; build_document() |
| **Total** | **50** | |

### Grand total: **156 automated tests**

---

## Other QA assets added

| Asset | Location |
|-------|----------|
| GitHub Actions CI pipeline | `.github/workflows/ci.yml` |
| Postman collection (24 requests) | `postman/BigBlog-API.postman_collection.json` |
| Postman environment | `postman/BigBlog.postman_environment.json` |
| Vitest config (backend) | `server/vitest.config.js` |
| Vitest config (frontend) | `blogging website - frontend/vitest.config.js` |
| pytest config | `ml-service/pytest.ini` |
| Test requirements | `ml-service/requirements-test.txt` |

---

## How to run everything

```bash
# Backend
cd server && npm install && npm run test:coverage

# Frontend
cd "blogging website - frontend" && npm install && npm run test:coverage

# ML Service
cd ml-service
pip install -r requirements.txt -r requirements-test.txt
pytest
```

All three jobs also run automatically in GitHub Actions on every push to
`master` and on every pull request.

---

## Known limitations

1. **Google OAuth happy path** — the `google-auth` endpoint is tested
   only for the error case (Firebase unavailable).  The full happy path
   requires a real Firebase project and a live Google token, which are
   not available in CI.

2. **EditorJS editor page** — EditorJS does not work in jsdom.  Editor
   page tests require a Playwright or Cypress E2E environment (not
   included in this initial setup).

3. **Frontend page-level tests** — Pages such as `home.page.jsx`,
   `profile.page.jsx`, and `dashboard.page.jsx` make axios calls on
   mount and depend on complex context.  Component-level tests cover the
   visual building blocks; full page tests are listed as backlog.

4. **`all-notifications-count` has a known bug** — the route at line 959
   of the original `server.js` returns `count` (the `console.count`
   function) instead of the DB query result.  The test for this route
   covers the expected schema; the bug is documented here for the
   developer to fix.
