# Test Plan — BigBlog Platform

## 1. Scope

This plan covers automated testing for all three services in the BigBlog
MERN stack:

| Service | Tech | Test framework |
|---------|------|----------------|
| Backend API | Node.js / Express / MongoDB | Vitest + Supertest + mongodb-memory-server |
| Frontend | React 18 / Vite | Vitest + @testing-library/react + jsdom |
| ML Service | FastAPI / TF-IDF | pytest + FastAPI TestClient |

Out of scope: visual regression, load/performance testing, and
cross-browser end-to-end tests.

---

## 2. Test Objectives

1. Verify all critical user journeys work end-to-end at the API layer.
2. Catch regressions when routes, models, or business logic change.
3. Verify the ML service contract — input validation, output schema, and
   semantic ranking behaviour.
4. Provide developers with fast feedback (< 60 s for the full suite).
5. Generate coverage reports to identify untested code paths.

---

## 3. Test Layers

### 3.1 Backend Integration Tests

Tests in `server/tests/` use a real Express app wired to an
**in-memory MongoDB** (mongodb-memory-server).  Firebase Admin SDK and
Cloudinary are mocked via Vitest `vi.mock()`.  No network calls are made.

Files and coverage:

| File | Routes covered | Test count |
|------|---------------|------------|
| `auth.test.js` | `/signup`, `/signin`, `/google-auth`, `verifyJWT` | 14 |
| `blog.test.js` | `/create-blog`, `/latest-blogs`, `/trending-blogs`, `/search-blogs`, `/get-blog`, `/delete-blogs`, `/all-latest-blogs-count`, `/semantic-search` | 17 |
| `user.test.js` | `/get-profile`, `/search-users`, `/update-profile`, `/update-profile-img`, `/change-password` | 14 |
| `comments.test.js` | `/add-comment`, `/get-blog-comments`, `/delete-comment` | 10 |
| `notifications.test.js` | `/new-notification`, `/notifications`, `/all-notifications-count`, `/like-blog`, `/isliked-by-user` | 12 |

### 3.2 Frontend Component Tests

Tests in `blogging website - frontend/src/tests/` use React Testing
Library with jsdom.  Routing, Framer Motion, axios, and Firebase are
mocked in the shared setup file.

| File | Component | Test count |
|------|-----------|------------|
| `loader.test.jsx` | `Loader` | 4 |
| `nodata.test.jsx` | `NoDataMessage` | 4 |
| `input.test.jsx` | `InputBox` | 8 |
| `blog-post.test.jsx` | `BlogPostCard` | 11 |

### 3.3 ML Service Tests

Tests in `ml-service/tests/` use the FastAPI `TestClient`.  MongoDB is
patched at import time with a `MagicMock`; the seeded fixture provides
three blogs covering Python, React, and ML topics.

| File | What is tested | Test count |
|------|---------------|------------|
| `test_health.py` | `/health` endpoint contract | 7 |
| `test_semantic_search.py` | `/semantic-search` validation, schema, ranking, `top_k`; `/index-blog` | 16 |
| `test_extract_text.py` | `extract_text_from_editorjs()`, `build_document()` — unit tests | 27 |

---

## 4. Test Data Strategy

- **Backend**: Each test creates its own users/blogs via the API and
  relies on `afterEach` collection wipes for isolation.  No shared
  fixtures that bleed state between tests.
- **Frontend**: Components receive props directly; no API calls in
  component tests.
- **ML Service**: Three deterministic synthetic blog documents are
  injected into the TF-IDF index at fixture setup time.

---

## 5. Mocking Strategy

| Dependency | How mocked |
|------------|------------|
| Firebase Admin SDK | `vi.mock('firebase-admin')` + `vi.mock('firebase-admin/auth')` in `setup.js` |
| MongoDB | `MongoMemoryServer` for backend; `pymongo.MongoClient` patched before import for ML |
| Cloudinary | `vi.mock('../config/cloudinary.js')` returning a stubbed `api_sign_request` |
| axios | `vi.mock('axios')` in frontend setup; ML service URL points to non-existent port in backend tests |
| React Router | `vi.mock('react-router-dom')` with stub hooks |
| Framer Motion | Replaced with plain DOM element wrappers |

---

## 6. Coverage Targets

| Layer | Target |
|-------|--------|
| Backend route handlers | ≥ 70% statement coverage |
| Frontend components | ≥ 60% statement coverage |
| ML service pure functions | ≥ 85% statement coverage |

---

## 7. How to Run

### Backend
```bash
cd server
npm install
npm test                # run all tests once
npm run test:coverage   # run with V8 coverage report
```

### Frontend
```bash
cd "blogging website - frontend"
npm install
npm test
npm run test:coverage
```

### ML Service
```bash
cd ml-service
pip install -r requirements.txt -r requirements-test.txt
pytest
```

### All (via CI)
Push to `master` or open a pull request — GitHub Actions runs all three
jobs automatically.  See `.github/workflows/ci.yml`.

---

## 8. Assumptions and Constraints

1. Tests do not require a live MongoDB Atlas cluster, real Firebase
   credentials, or a running ML service.
2. The Firebase service account JSON
   (`bigblog-3e96f-firebase-adminsdk-fbsvc-fd79b68a59.json`) is absent
   in CI — `app.js` handles this with a try/catch.
3. The `google-auth` endpoint is tested only to confirm it returns 500
   when Firebase is unavailable (expected in test environment).
4. EditorJS content validation tests cover the block types actually used
   in production; exotic undocumented block types are not tested.
