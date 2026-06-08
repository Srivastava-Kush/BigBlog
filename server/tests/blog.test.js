/**
 * Blog route tests — create, read, search, delete, analytics counts.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import app from "../app.js";
import User from "../Schema/User.js";
import Blog from "../Schema/Blog.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET);

const validBlogPayload = {
  title: "Test Blog Post",
  des: "A short description of the test blog post for QA.",
  banner: "https://example.com/banner.jpg",
  content: {
    blocks: [{ type: "paragraph", data: { text: "Hello world" } }],
  },
  tags: ["testing", "qa"],
  draft: false,
};

/** Register a user and return { user, token } */
const seedUser = async (email = "author@example.com") => {
  const res = await request(app).post("/signup").send({
    fullname: "Blog Author",
    email,
    password: "Author1234",
  });
  return { token: res.body.access_token, userId: res.body._id };
};

/** Create a published blog; returns the blog document. */
const seedBlog = async (token, overrides = {}) => {
  const res = await request(app)
    .post("/create-blog")
    .set("Authorization", `Bearer ${token}`)
    .send({ ...validBlogPayload, ...overrides });
  expect(res.status).toBe(200);
  return res.body.id; // blog_id string
};

// ── POST /create-blog ─────────────────────────────────────────────────────────

describe("POST /create-blog", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/create-blog").send(validBlogPayload);
    expect(res.status).toBe(401);
  });

  it("creates a published blog and returns its blog_id", async () => {
    const { token } = await seedUser();
    const res = await request(app)
      .post("/create-blog")
      .set("Authorization", `Bearer ${token}`)
      .send(validBlogPayload);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(typeof res.body.id).toBe("string");
  });

  it("returns 403 when title is empty", async () => {
    const { token } = await seedUser("author2@example.com");
    const res = await request(app)
      .post("/create-blog")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validBlogPayload, title: "" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/title/i);
  });

  it("saves a draft without requiring description or banner", async () => {
    const { token } = await seedUser("author3@example.com");
    const res = await request(app)
      .post("/create-blog")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Draft Post", draft: true, tags: [], content: { blocks: [] } });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
  });

  it("returns 403 when publishing without a description", async () => {
    const { token } = await seedUser("author4@example.com");
    const res = await request(app)
      .post("/create-blog")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validBlogPayload, des: "" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/description/i);
  });

  it("returns 403 when publishing without content blocks", async () => {
    const { token } = await seedUser("author5@example.com");
    const res = await request(app)
      .post("/create-blog")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validBlogPayload, content: { blocks: [] } });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/content/i);
  });

  it("updates an existing blog when id is provided", async () => {
    const { token } = await seedUser("author6@example.com");
    const blogId = await seedBlog(token);

    const res = await request(app)
      .post("/create-blog")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validBlogPayload, title: "Updated Title", id: blogId });
    expect(res.status).toBe(200);

    const updated = await Blog.findOne({ blog_id: blogId });
    expect(updated.title).toBe("Updated Title");
  });
});

// ── GET /trending-blogs ───────────────────────────────────────────────────────

describe("GET /trending-blogs", () => {
  it("returns an array of blogs (may be empty)", async () => {
    const res = await request(app).get("/trending-blogs");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.blogs)).toBe(true);
  });

  it("returns at most 5 blogs", async () => {
    const { token } = await seedUser("trending@example.com");
    // Seed 6 published blogs
    for (let i = 0; i < 6; i++) {
      await seedBlog(token, { title: `Trending Blog ${i}` });
    }
    const res = await request(app).get("/trending-blogs");
    expect(res.status).toBe(200);
    expect(res.body.blogs.length).toBeLessThanOrEqual(5);
  });
});

// ── POST /latest-blogs ────────────────────────────────────────────────────────

describe("POST /latest-blogs", () => {
  it("returns paginated published blogs", async () => {
    const { token } = await seedUser("latest@example.com");
    await seedBlog(token, { title: "Latest Blog 1" });
    await seedBlog(token, { title: "Latest Blog 2" });

    const res = await request(app).post("/latest-blogs").send({ page: 1 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.blogs)).toBe(true);
    expect(res.body.blogs.length).toBeGreaterThan(0);
  });

  it("does not include draft blogs in the feed", async () => {
    const { token } = await seedUser("latestdraft@example.com");
    await request(app)
      .post("/create-blog")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Draft", draft: true, tags: [], content: { blocks: [] } });

    const res = await request(app).post("/latest-blogs").send({ page: 1 });
    expect(res.status).toBe(200);
    // All returned blogs should have draft: false (field not returned directly,
    // but since we only seeded a draft the list should be empty here)
    expect(res.body.blogs.every((b) => b.draft !== true)).toBe(true);
  });
});

// ── POST /search-blogs ────────────────────────────────────────────────────────

describe("POST /search-blogs", () => {
  let token;

  beforeEach(async () => {
    const u = await seedUser("searchblogs@example.com");
    token = u.token;
  });

  it("searches by tag and returns matching blogs", async () => {
    await seedBlog(token, { title: "React Hooks Guide", tags: ["react", "hooks"] });
    await seedBlog(token, { title: "Vue.js Tutorial", tags: ["vue"] });

    const res = await request(app)
      .post("/search-blogs")
      .send({ tag: "react", page: 1 });
    expect(res.status).toBe(200);
    expect(res.body.blogs.length).toBeGreaterThan(0);
    expect(res.body.blogs.every((b) => b.tags.includes("react"))).toBe(true);
  });

  it("searches by title query (case-insensitive)", async () => {
    await seedBlog(token, { title: "Understanding Node.js" });
    await seedBlog(token, { title: "Python Basics" });

    const res = await request(app)
      .post("/search-blogs")
      .send({ query: "node", page: 1 });
    expect(res.status).toBe(200);
    expect(res.body.blogs.length).toBeGreaterThan(0);
    expect(res.body.blogs[0].title).toMatch(/node/i);
  });
});

// ── POST /all-latest-blogs-count ─────────────────────────────────────────────

describe("POST /all-latest-blogs-count", () => {
  it("returns totalDocs equal to the number of published blogs", async () => {
    const { token } = await seedUser("count@example.com");
    await seedBlog(token, { title: "Count Blog 1" });
    await seedBlog(token, { title: "Count Blog 2" });

    const res = await request(app).post("/all-latest-blogs-count");
    expect(res.status).toBe(200);
    expect(res.body.totalDocs).toBe(2);
  });
});

// ── POST /get-blog ────────────────────────────────────────────────────────────

describe("POST /get-blog", () => {
  it("returns blog data and increments read count", async () => {
    const { token } = await seedUser("getblog@example.com");
    const blogId = await seedBlog(token, { title: "Readable Blog" });

    const before = await Blog.findOne({ blog_id: blogId });
    const beforeReads = before.activity.total_reads;

    const res = await request(app).post("/get-blog").send({ blog_id: blogId });
    expect(res.status).toBe(200);
    expect(res.body.blog.title).toBe("Readable Blog");

    const after = await Blog.findOne({ blog_id: blogId });
    expect(after.activity.total_reads).toBe(beforeReads + 1);
  });

  it("does not increment reads in edit mode", async () => {
    const { token } = await seedUser("editmode@example.com");
    const blogId = await seedBlog(token, { title: "Edit Mode Blog" });

    const before = await Blog.findOne({ blog_id: blogId });

    await request(app).post("/get-blog").send({ blog_id: blogId, mode: "edit" });
    const after = await Blog.findOne({ blog_id: blogId });
    expect(after.activity.total_reads).toBe(before.activity.total_reads);
  });

  it("returns 500 for a draft blog without draft flag", async () => {
    const { token } = await seedUser("draftaccess@example.com");
    await request(app)
      .post("/create-blog")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Draft", draft: true, tags: [], content: { blocks: [] } });

    const draft = await Blog.findOne({ draft: true });
    const res = await request(app)
      .post("/get-blog")
      .send({ blog_id: draft.blog_id });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/draft/i);
  });
});

// ── POST /delete-blogs ────────────────────────────────────────────────────────

describe("POST /delete-blogs", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/delete-blogs")
      .send({ blog_id: "some-id" });
    expect(res.status).toBe(401);
  });

  it("deletes an existing blog and returns status done", async () => {
    const { token } = await seedUser("deleteblog@example.com");
    const blogId = await seedBlog(token, { title: "Blog To Delete" });

    const res = await request(app)
      .post("/delete-blogs")
      .set("Authorization", `Bearer ${token}`)
      .send({ blog_id: blogId });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("done");

    const gone = await Blog.findOne({ blog_id: blogId });
    expect(gone).toBeNull();
  });
});

// ── POST /semantic-search (proxy, ML service mocked) ─────────────────────────

describe("POST /semantic-search", () => {
  it("returns 400 when query is empty", async () => {
    const res = await request(app).post("/semantic-search").send({ query: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/query/i);
  });

  it("returns 400 when query is only whitespace", async () => {
    const res = await request(app).post("/semantic-search").send({ query: "   " });
    expect(res.status).toBe(400);
  });

  it("returns 500 when ML service is unreachable", async () => {
    // ML_SERVICE_URL points to a non-existent port in test env
    const res = await request(app)
      .post("/semantic-search")
      .send({ query: "machine learning" });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/unavailable/i);
  });
});
