# Test Cases — BigBlog Platform

> ID format: `[LAYER]-[MODULE]-[N]`
> Layers: BE (backend), FE (frontend), ML (ML service)

---

## Backend — Auth (`auth.test.js`)

| ID | Title | Input | Expected |
|----|-------|-------|----------|
| BE-AUTH-01 | Sign up with valid data | fullname ≥ 3, valid email, strong password | 200 + access_token |
| BE-AUTH-02 | Sign up — fullname too short | fullname = "Ab" | 403, error mentions "3 chars" |
| BE-AUTH-03 | Sign up — empty email | email = "" | 403, error mentions "email" |
| BE-AUTH-04 | Sign up — invalid email format | email = "notanemail" | 403, error mentions "valid email" |
| BE-AUTH-05 | Sign up — password no uppercase | password = "password1" | 403 |
| BE-AUTH-06 | Sign up — password no digit | password = "Password" | 403 |
| BE-AUTH-07 | Sign up — duplicate email | same email twice | 500, error mentions "already exists" |
| BE-AUTH-08 | Sign in — valid credentials | correct email/password | 200 + access_token |
| BE-AUTH-09 | Sign in — email not found | unknown email | 403, "Email not found" |
| BE-AUTH-10 | Sign in — wrong password | correct email, wrong password | 403, "Incorrect Password" |
| BE-AUTH-11 | Sign in — Google auth account | account has google_auth=true | 403 |
| BE-AUTH-12 | verifyJWT — no token | no Authorization header | 401, "No access token" |
| BE-AUTH-13 | verifyJWT — malformed token | "Bearer garbage" | 403, "invalid" |
| BE-AUTH-14 | verifyJWT — wrong secret | token signed with different secret | 403 |
| BE-AUTH-15 | verifyJWT — valid token | valid JWT | 200 (passes to handler) |
| BE-AUTH-16 | Google auth — Firebase unavailable | fake token, Firebase mocked to reject | 500 |

---

## Backend — Blog (`blog.test.js`)

| ID | Title | Input | Expected |
|----|-------|-------|----------|
| BE-BLOG-01 | Create blog — no auth | no Authorization header | 401 |
| BE-BLOG-02 | Create published blog | valid payload + auth token | 200 + blog_id |
| BE-BLOG-03 | Create blog — empty title | title = "" | 403, mentions "title" |
| BE-BLOG-04 | Create draft — no description needed | draft=true, no des/banner | 200 |
| BE-BLOG-05 | Create published — empty description | des = "" | 403, mentions "description" |
| BE-BLOG-06 | Create published — empty content | content.blocks = [] | 403, mentions "content" |
| BE-BLOG-07 | Update existing blog | provide id of existing blog | 200, blog title updated in DB |
| BE-BLOG-08 | Trending blogs — returns array | GET /trending-blogs | 200, blogs array |
| BE-BLOG-09 | Trending blogs — at most 5 results | 6 blogs seeded | ≤ 5 results |
| BE-BLOG-10 | Latest blogs — paginated | 2 published blogs, page=1 | 200, blogs array |
| BE-BLOG-11 | Latest blogs — drafts excluded | 1 draft seeded | draft not in results |
| BE-BLOG-12 | Search by tag | tag="react" | 200, all results have tag "react" |
| BE-BLOG-13 | Search by query | query="node" | 200, titles match /node/i |
| BE-BLOG-14 | Blog count | 2 published blogs | totalDocs = 2 |
| BE-BLOG-15 | Get blog — increments reads | published blog, mode default | reads +1 |
| BE-BLOG-16 | Get blog — no increment in edit mode | mode="edit" | reads unchanged |
| BE-BLOG-17 | Get blog — draft without flag | draft blog, draft param omitted | 500 |
| BE-BLOG-18 | Delete blog — no auth | no token | 401 |
| BE-BLOG-19 | Delete blog — success | own blog, valid token | 200, blog gone from DB |
| BE-BLOG-20 | Semantic search — empty query | query="" | 400 |
| BE-BLOG-21 | Semantic search — whitespace query | query="   " | 400 |
| BE-BLOG-22 | Semantic search — ML unavailable | ML URL unreachable | 500, "unavailable" |

---

## Backend — User (`user.test.js`)

| ID | Title | Input | Expected |
|----|-------|-------|----------|
| BE-USER-01 | Get profile — existing user | valid username | 200, profile object |
| BE-USER-02 | Get profile — password not exposed | any user | password field absent |
| BE-USER-03 | Get profile — unknown user | nonexistent username | 200, null |
| BE-USER-04 | Search users — match | query="alice" | 200, results contain alice |
| BE-USER-05 | Search users — no match | query="zzznomatch" | 200, empty array |
| BE-USER-06 | Update profile — no auth | no token | 401 |
| BE-USER-07 | Update profile — success | valid username, bio, socials | 200, returns username |
| BE-USER-08 | Update profile — short username | username="ab" | 403 |
| BE-USER-09 | Update profile — bio too long | bio = 201 chars | 403 |
| BE-USER-10 | Update profile — invalid social URL | social link = "not-a-url" | 500 |
| BE-USER-11 | Update profile image — no auth | no token | 401 |
| BE-USER-12 | Update profile image — success | valid URL | 200, profile_img = URL |
| BE-USER-13 | Change password — no auth | no token | 401 |
| BE-USER-14 | Change password — success | correct current + strong new | 200 |
| BE-USER-15 | Change password — wrong current | wrong currentPassword | 403 |
| BE-USER-16 | Change password — invalid format | short password | 403 |
| BE-USER-17 | Change password — Google user | google_auth=true | 403, mentions "google" |

---

## Backend — Comments (`comments.test.js`)

| ID | Title | Input | Expected |
|----|-------|-------|----------|
| BE-CMT-01 | Add comment — no auth | no token | 401 |
| BE-CMT-02 | Add comment — success | valid text + blog ID | 200, comment returned |
| BE-CMT-03 | Add comment — empty text | comment="" | 403 |
| BE-CMT-04 | Add comment — increments total_comments | 1 comment added | total_comments +1 |
| BE-CMT-05 | Get comments — returns array | 1 comment exists | array with 1 item |
| BE-CMT-06 | Get comments — empty | no comments | empty array |
| BE-CMT-07 | Delete comment — no auth | no token | 401 |
| BE-CMT-08 | Delete comment — commenter can delete | token = commenter | 200, status "done" |
| BE-CMT-09 | Delete comment — different user | different token | 403 |

---

## Backend — Notifications (`notifications.test.js`)

| ID | Title | Input | Expected |
|----|-------|-------|----------|
| BE-NOTIF-01 | New notification — no auth | no token | 401 |
| BE-NOTIF-02 | New notification — none | no unseen notifs | false |
| BE-NOTIF-03 | New notification — exists | unseen notif from other user | true |
| BE-NOTIF-04 | List notifications — no auth | no token | 401 |
| BE-NOTIF-05 | List notifications — returns array | valid token | 200, array |
| BE-NOTIF-06 | List notifications — filtered by type | filter="like" | only like type returned |
| BE-NOTIF-07 | Count notifications — no auth | no token | 401 |
| BE-NOTIF-08 | Count notifications — correct count | 1 notification seeded | totalDocs = 1 |
| BE-NOTIF-09 | Like blog — no auth | no token | 401 |
| BE-NOTIF-10 | Like blog — increments total_likes | isLikedByUser=false | likes +1 |
| BE-NOTIF-11 | Unlike blog — decrements total_likes | isLikedByUser=true | likes -1 |
| BE-NOTIF-12 | Is liked by user — no auth | no token | 401 |
| BE-NOTIF-13 | Is liked by user — not liked | no prior like | result is falsy |

---

## Frontend — Components

| ID | Component | Title | Expected |
|----|-----------|-------|----------|
| FE-LOAD-01 | Loader | Renders without crashing | component mounts |
| FE-LOAD-02 | Loader | Contains SVG | SVG element in DOM |
| FE-LOAD-03 | Loader | Has animate-spin class | SVG has class |
| FE-LOAD-04 | Loader | Wrapped in div | wrapper div present |
| FE-NODATA-01 | NoDataMessage | Renders without crashing | mounts |
| FE-NODATA-02 | NoDataMessage | Displays message prop | text visible |
| FE-NODATA-03 | NoDataMessage | Re-renders with new message | text updates |
| FE-NODATA-04 | NoDataMessage | Wrapped in div | wrapper div present |
| FE-INPUT-01 | InputBox | Renders input element | input in DOM |
| FE-INPUT-02 | InputBox | Shows placeholder | placeholder text visible |
| FE-INPUT-03 | InputBox | Has correct name attribute | name attr set |
| FE-INPUT-04 | InputBox | Renders default value | defaultValue attr set |
| FE-INPUT-05 | InputBox | Disabled when disable=true | input disabled |
| FE-INPUT-06 | InputBox | Enabled by default | input not disabled |
| FE-INPUT-07 | InputBox | Eye toggle for password type | eye icon present |
| FE-INPUT-08 | InputBox | Toggles password visibility | type changes text/password |
| FE-INPUT-09 | InputBox | No eye toggle for text type | cursor-pointer icon absent |
| FE-BLOG-01 | BlogPostCard | Renders without crashing | mounts |
| FE-BLOG-02 | BlogPostCard | Shows title | title in DOM |
| FE-BLOG-03 | BlogPostCard | Shows description | description in DOM |
| FE-BLOG-04 | BlogPostCard | Shows author name + username | "fullname@username" visible |
| FE-BLOG-05 | BlogPostCard | Shows first tag | tag text visible |
| FE-BLOG-06 | BlogPostCard | Shows like count | count visible |
| FE-BLOG-07 | BlogPostCard | Links to correct blog route | href matches blog_id |
| FE-BLOG-08 | BlogPostCard | Shows banner image | img src = banner URL |
| FE-BLOG-09 | BlogPostCard | Shows author avatar | img src = profile_img URL |
| FE-BLOG-10 | BlogPostCard | Shows relevance badge | "87.5% match" visible |
| FE-BLOG-11 | BlogPostCard | No badge when score undefined | no "% match" text |

---

## ML Service — Health (`test_health.py`)

| ID | Title | Expected |
|----|-------|----------|
| ML-HEALTH-01 | GET /health returns 200 | status code 200 |
| ML-HEALTH-02 | Response has status field | status = "ok" |
| ML-HEALTH-03 | Response has indexed_blogs | integer field present |
| ML-HEALTH-04 | Response has index_ready | boolean field present |
| ML-HEALTH-05 | Empty index reports 0 blogs | indexed_blogs = 0 |
| ML-HEALTH-06 | Empty index reports not ready | index_ready = false |
| ML-HEALTH-07 | Seeded index reports 3 blogs | indexed_blogs = 3, index_ready = true |

---

## ML Service — Semantic Search (`test_semantic_search.py`)

| ID | Title | Expected |
|----|-------|----------|
| ML-SEARCH-01 | Empty query rejected | 400 or 422 |
| ML-SEARCH-02 | Whitespace-only query rejected | 400 or 422 |
| ML-SEARCH-03 | Missing query field | 422 |
| ML-SEARCH-04 | Empty index returns 503 | 503 |
| ML-SEARCH-05 | Response has blogs + total | both keys present |
| ML-SEARCH-06 | total matches blogs array length | total == len(blogs) |
| ML-SEARCH-07 | Blog entry has required fields | blog_id, title, similarity_score, relevance_pct |
| ML-SEARCH-08 | Scores between 0 and 1 | all similarity_score in [0,1] |
| ML-SEARCH-09 | relevance_pct = score × 100 | values match to 0.01 |
| ML-SEARCH-10 | Results sorted descending | scores non-increasing |
| ML-SEARCH-11 | Python query → Python blog first | blog_id = "python-intro-abc" |
| ML-SEARCH-12 | React query → React blog first | blog_id = "react-hooks-guide-xyz" |
| ML-SEARCH-13 | ML query → TF blog first | blog_id = "ml-tensorflow-guide" |
| ML-SEARCH-14 | top_k limits results | len(results) ≤ top_k |
| ML-SEARCH-15 | top_k = 0 returns empty list | blogs = [] |
| ML-SEARCH-16 | /index-blog returns ok + count | status="ok", indexed is int |

---

## ML Service — Text Extraction (`test_extract_text.py`)

| ID | Title | Expected |
|----|-------|----------|
| ML-EXTRACT-01 | None input returns "" | empty string |
| ML-EXTRACT-02 | Empty list returns "" | empty string |
| ML-EXTRACT-03 | List with no blocks key returns "" | empty string |
| ML-EXTRACT-04 | Empty blocks array returns "" | empty string |
| ML-EXTRACT-05 | Non-dict blocks skipped | valid block text returned |
| ML-EXTRACT-06 | Paragraph text extracted | text in result |
| ML-EXTRACT-07 | HTML tags stripped from paragraph | tags absent, text present |
| ML-EXTRACT-08 | Header text extracted | text in result |
| ML-EXTRACT-09 | Quote text extracted | text in result |
| ML-EXTRACT-10 | Quote caption extracted | caption in result |
| ML-EXTRACT-11 | String list items extracted | items in result |
| ML-EXTRACT-12 | Dict list items extracted | content value in result |
| ML-EXTRACT-13 | Code block extracted | code in result |
| ML-EXTRACT-14 | Image caption extracted | caption in result |
| ML-EXTRACT-15 | Image without caption — no error | empty/whitespace result |
| ML-EXTRACT-16 | Link tool title extracted | title in result |
| ML-EXTRACT-17 | Link tool description extracted | description in result |
| ML-EXTRACT-18 | Multiple block types combined | all texts in result |
| ML-EXTRACT-19 | build_document repeats title ×3 | title appears 3 times |
| ML-EXTRACT-20 | build_document repeats tags ×2 | tag appears 2 times |
| ML-EXTRACT-21 | build_document includes description | des in result |
| ML-EXTRACT-22 | build_document includes body text | body text in result |
| ML-EXTRACT-23 | build_document handles empty blog | returns string without crash |
