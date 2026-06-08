# Requirements Traceability Matrix — BigBlog Platform

Maps user-facing requirements (features / acceptance criteria) to the
automated test cases that verify them.

---

## How to read this table

- **Requirement** — A user story or functional requirement.
- **Test IDs** — The test case IDs from TEST_CASES.md that cover it.
- **Status** — `✅ Covered` / `⚠️ Partial` / `❌ Not covered`.

---

## Authentication & Authorisation

| Requirement | Test IDs | Status |
|-------------|----------|--------|
| New users can register with email + password | BE-AUTH-01 | ✅ Covered |
| Registration validates fullname ≥ 3 chars | BE-AUTH-02 | ✅ Covered |
| Registration validates email format | BE-AUTH-03, BE-AUTH-04 | ✅ Covered |
| Registration enforces password strength | BE-AUTH-05, BE-AUTH-06 | ✅ Covered |
| Duplicate email is rejected | BE-AUTH-07 | ✅ Covered |
| Registered users can log in with email + password | BE-AUTH-08 | ✅ Covered |
| Login fails with unknown email | BE-AUTH-09 | ✅ Covered |
| Login fails with incorrect password | BE-AUTH-10 | ✅ Covered |
| Google-auth accounts cannot log in via password | BE-AUTH-11 | ✅ Covered |
| Protected routes reject missing JWT | BE-AUTH-12 | ✅ Covered |
| Protected routes reject malformed JWT | BE-AUTH-13 | ✅ Covered |
| Protected routes reject JWT signed with wrong secret | BE-AUTH-14 | ✅ Covered |
| Valid JWT grants access to protected routes | BE-AUTH-15 | ✅ Covered |
| Google OAuth login flow | BE-AUTH-16 | ⚠️ Partial (tests error path only; happy path requires real Firebase) |

---

## Blog Lifecycle

| Requirement | Test IDs | Status |
|-------------|----------|--------|
| Authors can create a published blog post | BE-BLOG-02 | ✅ Covered |
| Authors can save a draft without all fields | BE-BLOG-04 | ✅ Covered |
| Published blogs require title | BE-BLOG-03 | ✅ Covered |
| Published blogs require description ≤ 200 chars | BE-BLOG-05 | ✅ Covered |
| Published blogs require at least one content block | BE-BLOG-06 | ✅ Covered |
| Authors can update an existing blog | BE-BLOG-07 | ✅ Covered |
| Authors can delete their own blog | BE-BLOG-18, BE-BLOG-19 | ✅ Covered |
| Unauthenticated users cannot create/delete blogs | BE-BLOG-01, BE-BLOG-18 | ✅ Covered |
| Draft blogs are not publicly visible | BE-BLOG-11, BE-BLOG-17 | ✅ Covered |
| Blog read count increments on each view | BE-BLOG-15 | ✅ Covered |
| Read count does not increment in edit mode | BE-BLOG-16 | ✅ Covered |

---

## Blog Discovery

| Requirement | Test IDs | Status |
|-------------|----------|--------|
| Homepage shows latest published blogs | BE-BLOG-10, BE-BLOG-11 | ✅ Covered |
| Trending blogs endpoint returns ≤ 5 results | BE-BLOG-08, BE-BLOG-09 | ✅ Covered |
| Blogs can be searched by tag | BE-BLOG-12 | ✅ Covered |
| Blogs can be searched by title query | BE-BLOG-13 | ✅ Covered |
| Total blog count is accessible | BE-BLOG-14 | ✅ Covered |
| Semantic / ML-powered search is proxied from backend | BE-BLOG-20 – BE-BLOG-22 | ✅ Covered |

---

## User Profiles

| Requirement | Test IDs | Status |
|-------------|----------|--------|
| User profile is publicly viewable by username | BE-USER-01 | ✅ Covered |
| Profile does not expose hashed password | BE-USER-02 | ✅ Covered |
| Nonexistent profiles return null (not 404) | BE-USER-03 | ✅ Covered |
| Users can be searched by username | BE-USER-04, BE-USER-05 | ✅ Covered |
| Authenticated user can update username + bio + socials | BE-USER-07 | ✅ Covered |
| Username minimum length enforced | BE-USER-08 | ✅ Covered |
| Bio length capped at 200 chars | BE-USER-09 | ✅ Covered |
| Social links must be valid URLs | BE-USER-10 | ✅ Covered |
| User can update profile image | BE-USER-11, BE-USER-12 | ✅ Covered |
| User can change password | BE-USER-13, BE-USER-14 | ✅ Covered |
| Wrong current password is rejected | BE-USER-15 | ✅ Covered |
| Password format validation on change | BE-USER-16 | ✅ Covered |
| Google-auth users cannot change password | BE-USER-17 | ✅ Covered |

---

## Comments

| Requirement | Test IDs | Status |
|-------------|----------|--------|
| Authenticated users can add comments | BE-CMT-01, BE-CMT-02 | ✅ Covered |
| Empty comment is rejected | BE-CMT-03 | ✅ Covered |
| Comment increments blog total_comments | BE-CMT-04 | ✅ Covered |
| Comments are publicly readable | BE-CMT-05, BE-CMT-06 | ✅ Covered |
| Commenter can delete their own comment | BE-CMT-07, BE-CMT-08 | ✅ Covered |
| Other users cannot delete a comment | BE-CMT-09 | ✅ Covered |
| Nested replies | ❌ Not automated (integration complexity) | ❌ Not covered |

---

## Notifications

| Requirement | Test IDs | Status |
|-------------|----------|--------|
| User can check for unseen notifications | BE-NOTIF-01 – BE-NOTIF-03 | ✅ Covered |
| User can list their notifications | BE-NOTIF-04, BE-NOTIF-05 | ✅ Covered |
| Notifications can be filtered by type | BE-NOTIF-06 | ✅ Covered |
| Total notification count | BE-NOTIF-07, BE-NOTIF-08 | ✅ Covered |
| Liking a blog increments its like count | BE-NOTIF-09, BE-NOTIF-10 | ✅ Covered |
| Unliking decrements like count | BE-NOTIF-11 | ✅ Covered |
| Check if user liked a blog | BE-NOTIF-12, BE-NOTIF-13 | ✅ Covered |
| Notification created on like | (side-effect of BE-NOTIF-10) | ⚠️ Partial |
| Notification created on comment | (side-effect of BE-CMT-02) | ⚠️ Partial |
| Mark notification as seen | ❌ Not automated | ❌ Not covered |

---

## Frontend Components

| Requirement | Test IDs | Status |
|-------------|----------|--------|
| Loading spinner renders correctly | FE-LOAD-01 – FE-LOAD-04 | ✅ Covered |
| Empty state message renders | FE-NODATA-01 – FE-NODATA-04 | ✅ Covered |
| Input box renders with correct attributes | FE-INPUT-01 – FE-INPUT-06 | ✅ Covered |
| Password visibility toggle works | FE-INPUT-07, FE-INPUT-08 | ✅ Covered |
| Text input has no eye toggle | FE-INPUT-09 | ✅ Covered |
| Blog card displays all content fields | FE-BLOG-01 – FE-BLOG-09 | ✅ Covered |
| Blog card shows semantic relevance score | FE-BLOG-10, FE-BLOG-11 | ✅ Covered |

---

## ML Service

| Requirement | Test IDs | Status |
|-------------|----------|--------|
| Health endpoint reports service status | ML-HEALTH-01 – ML-HEALTH-07 | ✅ Covered |
| Search rejects empty queries | ML-SEARCH-01 – ML-SEARCH-03 | ✅ Covered |
| 503 returned when index is empty | ML-SEARCH-04 | ✅ Covered |
| Response schema is correct | ML-SEARCH-05 – ML-SEARCH-09 | ✅ Covered |
| Results are ranked by relevance | ML-SEARCH-10 – ML-SEARCH-13 | ✅ Covered |
| top_k parameter limits results | ML-SEARCH-14, ML-SEARCH-15 | ✅ Covered |
| Index rebuild endpoint works | ML-SEARCH-16 | ✅ Covered |
| EditorJS paragraph text extracted | ML-EXTRACT-06, ML-EXTRACT-07 | ✅ Covered |
| All EditorJS block types handled | ML-EXTRACT-08 – ML-EXTRACT-18 | ✅ Covered |
| Edge cases (None, empty, malformed) | ML-EXTRACT-01 – ML-EXTRACT-05 | ✅ Covered |
| Document weighting (title × 3, tags × 2) | ML-EXTRACT-19, ML-EXTRACT-20 | ✅ Covered |

---

## Coverage gaps (prioritised backlog)

1. **Nested comment replies** — requires chaining two API calls; skip for now.
2. **Google OAuth happy path** — requires real Firebase credentials; test with a dedicated integration environment.
3. **Mark notification as seen** — endpoint not yet defined in the API.
4. **Editor page (React)** — EditorJS has no JSDOM implementation; requires Playwright/Cypress.
5. **Dashboard analytics aggregation** — `user-written-blogs` is covered at the API level but frontend charting is not.
