/**
 * Comment route tests — add-comment, get-blog-comments, delete-comment,
 * get-replies.
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import app from "../app.js";
import User from "../Schema/User.js";
import Blog from "../Schema/Blog.js";
import Comment from "../Schema/Comment.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET);

const seedUser = async (email = "commenter@example.com") => {
  const res = await request(app).post("/signup").send({
    fullname: "Comment User",
    email,
    password: "Comment1234",
  });
  // Decode the JWT to extract userId — avoids a second DB round-trip
  const payload = jwt.decode(res.body.access_token);
  return { token: res.body.access_token, userId: payload.id };
};

const seedBlog = async (token) => {
  const res = await request(app)
    .post("/create-blog")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Blog For Comments",
      des: "A blog to test comments on.",
      banner: "https://example.com/banner.jpg",
      content: { blocks: [{ type: "paragraph", data: { text: "Body" } }] },
      tags: ["test"],
      draft: false,
    });
  const blog = await Blog.findOne({ blog_id: res.body.id });
  return blog;
};

// ── POST /add-comment ─────────────────────────────────────────────────────────

describe("POST /add-comment", () => {
  let token, userId, blog;

  beforeEach(async () => {
    const u = await seedUser();
    token = u.token;
    userId = u.userId;
    blog = await seedBlog(token);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/add-comment").send({
      _id: blog._id,
      comment: "Hello",
      blog_author: blog.author,
    });
    expect(res.status).toBe(401);
  });

  it("adds a comment and returns comment data", async () => {
    const res = await request(app)
      .post("/add-comment")
      .set("Authorization", `Bearer ${token}`)
      .send({ _id: blog._id, comment: "Great post!", blog_author: blog.author });

    expect(res.status).toBe(200);
    expect(res.body.comment).toBe("Great post!");
    expect(res.body).toHaveProperty("_id");
  });

  it("returns 403 when comment text is empty", async () => {
    const res = await request(app)
      .post("/add-comment")
      .set("Authorization", `Bearer ${token}`)
      .send({ _id: blog._id, comment: "", blog_author: blog.author });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/something/i);
  });

  it("increments blog total_comments by 1", async () => {
    const before = await Blog.findById(blog._id);
    await request(app)
      .post("/add-comment")
      .set("Authorization", `Bearer ${token}`)
      .send({ _id: blog._id, comment: "Count me", blog_author: blog.author });

    const after = await Blog.findById(blog._id);
    expect(after.activity.total_comments).toBe(
      before.activity.total_comments + 1,
    );
  });
});

// ── POST /get-blog-comments ───────────────────────────────────────────────────

describe("POST /get-blog-comments", () => {
  it("returns an array of top-level comments for a blog", async () => {
    const { token } = await seedUser("getcomments@example.com");
    const blog = await seedBlog(token);

    await request(app)
      .post("/add-comment")
      .set("Authorization", `Bearer ${token}`)
      .send({ _id: blog._id, comment: "First comment", blog_author: blog.author });

    const res = await request(app)
      .post("/get-blog-comments")
      .send({ blog_id: blog._id, skip: 0 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].comment).toBe("First comment");
  });

  it("returns an empty array when no comments exist", async () => {
    const { token } = await seedUser("nocmt@example.com");
    const blog = await seedBlog(token);

    const res = await request(app)
      .post("/get-blog-comments")
      .send({ blog_id: blog._id, skip: 0 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── POST /delete-comment ──────────────────────────────────────────────────────

describe("POST /delete-comment", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/delete-comment")
      .send({ _id: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(401);
  });

  it("allows the commenter to delete their own comment", async () => {
    const { token } = await seedUser("del@example.com");
    const blog = await seedBlog(token);

    const addRes = await request(app)
      .post("/add-comment")
      .set("Authorization", `Bearer ${token}`)
      .send({
        _id: blog._id,
        comment: "Delete me",
        blog_author: blog.author,
      });
    const commentId = addRes.body._id;

    const res = await request(app)
      .post("/delete-comment")
      .set("Authorization", `Bearer ${token}`)
      .send({ _id: commentId });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("done");
  });

  it("returns 403 when a different user tries to delete the comment", async () => {
    const { token: ownerToken } = await seedUser("owner@example.com");
    const { token: otherToken } = await seedUser("other@example.com");
    const blog = await seedBlog(ownerToken);

    const addRes = await request(app)
      .post("/add-comment")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ _id: blog._id, comment: "Owner's comment", blog_author: blog.author });
    const commentId = addRes.body._id;

    const res = await request(app)
      .post("/delete-comment")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ _id: commentId });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot delete/i);
  });
});
