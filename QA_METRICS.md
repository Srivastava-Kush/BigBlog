# QA Metrics — BigBlog Platform

> All numbers reflect the tests added in this QA setup pass.
> Coverage percentages are estimates based on code inspection; run
> `npm run test:coverage` / `pytest --cov` for live measurements.

---

## Test count by layer

| Layer | Test files | Test cases | Framework |
|-------|-----------|------------|-----------|
| Backend integration | 5 | 78 | Vitest + Supertest |
| Frontend component | 4 | 28 | Vitest + RTL |
| ML service unit + integration | 3 | 50 | pytest + FastAPI TestClient |
| **Grand total** | **12** | **156** | |

---

## Backend route coverage

| Module | Routes | Routes with tests | Coverage |
|--------|--------|-------------------|----------|
| Auth | 3 | 3 | 100% |
| Blog CRUD | 8 | 8 | 100% |
| User profile | 5 | 5 | 100% |
| Comments | 4 | 3 | 75% (`/get-replies` not directly tested) |
| Notifications | 5 | 5 | 100% |
| ML proxy | 1 | 1 | 100% |
| Upload | 1 | 0 | 0% (Cloudinary-only, mocked) |
| **Total routes** | **27** | **25** | **~93%** |

---

## Frontend component coverage

| Component | Behaviours tested |
|-----------|-------------------|
| `Loader` | Rendering, SVG, CSS class, wrapper |
| `NoDataMessage` | Rendering, prop binding, re-render |
| `InputBox` | Attributes, disable, password toggle |
| `BlogPostCard` | All visible fields, link href, relevance badge |

Untested components (backlog): `Navbar`, `SideNavbar`, `BlogEditor`,
`PublishForm`, `NotificationCard`, and all page components.

---

## ML service function coverage

| Function | Test count | Scenarios covered |
|----------|------------|-------------------|
| `extract_text_from_editorjs` | 18 | All 7 block types + 5 edge cases |
| `build_document` | 5 | Weighting, field inclusion, empty input |
| `/health` endpoint | 7 | Schema + empty vs seeded index |
| `/semantic-search` endpoint | 15 | Validation, schema, ranking, top_k |
| `/index-blog` endpoint | 1 | Rebuild returns ok + count |

---

## CI pipeline

| Job | Trigger | Duration (estimate) | Coverage report |
|-----|---------|---------------------|-----------------|
| `backend-tests` | push / PR to master | ~45 s | lcov + html artifact |
| `frontend-tests` | push / PR to master | ~30 s | lcov + html artifact |
| `ml-tests` | push / PR to master | ~20 s | — (add `pytest-cov` to enable) |

---

## Postman collection

| Category | Request count | Scripts |
|----------|--------------|---------|
| Auth | 4 | Auto-saves token to env var |
| Blogs | 7 | Auto-saves blog_id, validates schema |
| User | 4 | Validates update response |
| Comments | 3 | Chains add → delete via env var |
| Notifications | 2 | Validates response shape |
| ML Service | 4 | Validates schema + score range |
| **Total** | **24** | |

---

## Defects identified during test implementation

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| BUG-001 | Medium | `server.js:959` | `/all-notifications-count` returns `console.count` function reference instead of the database count (`count` is imported from `console`, not the query result). |
| BUG-002 | Low | `server.js:104` | `generateUsername` concatenates nanoid but doesn't use the sliced result correctly — `username += nanoid()` reassigns and `substring(0,10)` result is discarded. |
| BUG-003 | Low | `server.js:848` | Logical error in social link validation: `socialLinksArr[i] != "website"` is inside `&&` with a string, always evaluating to `"website"` (truthy), so the website platform check is never skipped. |
