/**
 * Notification route tests — new-notification, notifications list,
 * all-notifications-count, like-blog, isliked-by-user.
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import app from "../app.js";
import User from "../Schema/User.js";
import Blog from "../Schema/Blog.js";
import Notification from "../Schema/Notification.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET);

const seedUser = async (email = "notif@example.com") => {
  const res = await request(app).post("/signup").send({
    fullname: "Notif User",
    email,
    password: "Notif1234",
  });
  const dbUser = await User.findOne({ "personal_info.email": email });
  return { token: res.body.access_token, userId: dbUser._id.toString() };
};

const seedBlog = async (token) => {
  const res = await request(app)
    .post("/create-blog")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Notification Blog",
      des: "Used to test notifications.",
      banner: "https://example.com/banner.jpg",
      content: { blocks: [{ type: "paragraph", data: { text: "Body" } }] },
      tags: ["test"],
      draft: false,
    });
  return await Blog.findOne({ blog_id: res.body.id });
};

// ── GET /new-notification ─────────────────────────────────────────────────────

describe("GET /new-notification", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/new-notification");
    expect(res.status).toBe(401);
  });

  it("returns false when user has no unseen notifications", async () => {
    const { token } = await seedUser();
    const res = await request(app)
      .get("/new-notification")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.new_notification_available).toBe(false);
  });

  it("returns true when an unseen notification exists from another user", async () => {
    const { token: authorToken, userId: authorId } = await seedUser(
      "notifauthor@example.com",
    );
    const { token: readerToken, userId: readerId } = await seedUser(
      "notifreader@example.com",
    );
    const blog = await seedBlog(authorToken);

    // Create an unseen notification for the author, from the reader
    await Notification.create({
      type: "like",
      blog: blog._id,
      notification_for: new mongoose.Types.ObjectId(authorId),
      user: new mongoose.Types.ObjectId(readerId),
      seen: false,
    });

    const res = await request(app)
      .get("/new-notification")
      .set("Authorization", `Bearer ${authorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.new_notification_available).toBe(true);
  });
});

// ── POST /notifications ───────────────────────────────────────────────────────

describe("POST /notifications", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/notifications")
      .send({ page: 1, filter: "all" });
    expect(res.status).toBe(401);
  });

  it("returns a notifications array for the authenticated user", async () => {
    const { token } = await seedUser("notiflist@example.com");
    const res = await request(app)
      .post("/notifications")
      .set("Authorization", `Bearer ${token}`)
      .send({ page: 1, filter: "all", deletedDocCount: 0 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  it("filters notifications by type when filter is not all", async () => {
    const { token: authorToken, userId: authorId } = await seedUser(
      "filtauthor@example.com",
    );
    const { userId: likerId } = await seedUser("filtliker@example.com");
    const blog = await seedBlog(authorToken);

    // Create a like notification
    await Notification.create({
      type: "like",
      blog: blog._id,
      notification_for: new mongoose.Types.ObjectId(authorId),
      user: new mongoose.Types.ObjectId(likerId),
    });

    const res = await request(app)
      .post("/notifications")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ page: 1, filter: "like", deletedDocCount: 0 });
    expect(res.status).toBe(200);
    expect(res.body.notifications.every((n) => n.type === "like")).toBe(true);
  });
});

// ── POST /all-notifications-count ────────────────────────────────────────────

describe("POST /all-notifications-count", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/all-notifications-count")
      .send({ filter: "all" });
    expect(res.status).toBe(401);
  });

  it("returns the correct count for the authenticated user", async () => {
    const { token: authorToken, userId: authorId } = await seedUser(
      "cntauthor@example.com",
    );
    const { userId: likerId } = await seedUser("cntliker@example.com");
    const blog = await seedBlog(authorToken);

    await Notification.create({
      type: "like",
      blog: blog._id,
      notification_for: new mongoose.Types.ObjectId(authorId),
      user: new mongoose.Types.ObjectId(likerId),
    });

    const res = await request(app)
      .post("/all-notifications-count")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ filter: "all" });
    expect(res.status).toBe(200);
    expect(res.body.totalDocs).toBe(1);
  });
});

// ── POST /like-blog ───────────────────────────────────────────────────────────

describe("POST /like-blog", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/like-blog").send({
      _id: new mongoose.Types.ObjectId(),
      isLikedByUser: false,
    });
    expect(res.status).toBe(401);
  });

  it("increments total_likes when liking", async () => {
    const { token: authorToken } = await seedUser("likeauthor@example.com");
    const { token: likerToken } = await seedUser("likerliker@example.com");
    const blog = await seedBlog(authorToken);
    const before = blog.activity.total_likes;

    const res = await request(app)
      .post("/like-blog")
      .set("Authorization", `Bearer ${likerToken}`)
      .send({ _id: blog._id, isLikedByUser: false });
    expect(res.status).toBe(200);
    expect(res.body.liked_by_user).toBe(true);

    const updated = await Blog.findById(blog._id);
    expect(updated.activity.total_likes).toBe(before + 1);
  });

  it("decrements total_likes when unliking", async () => {
    const { token: authorToken } = await seedUser("unlikeauthor@example.com");
    const { token: likerToken, userId: likerId } = await seedUser(
      "unlikerliker@example.com",
    );
    const blog = await seedBlog(authorToken);

    // Like it first
    await request(app)
      .post("/like-blog")
      .set("Authorization", `Bearer ${likerToken}`)
      .send({ _id: blog._id, isLikedByUser: false });

    const afterLike = await Blog.findById(blog._id);

    // Now unlike
    const res = await request(app)
      .post("/like-blog")
      .set("Authorization", `Bearer ${likerToken}`)
      .send({ _id: blog._id, isLikedByUser: true });
    expect(res.status).toBe(200);
    expect(res.body.liked_by_user).toBe(false);

    const afterUnlike = await Blog.findById(blog._id);
    expect(afterUnlike.activity.total_likes).toBe(
      afterLike.activity.total_likes - 1,
    );
  });
});

// ── POST /isliked-by-user ─────────────────────────────────────────────────────

describe("POST /isliked-by-user", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/isliked-by-user")
      .send({ _id: new mongoose.Types.ObjectId() });
    expect(res.status).toBe(401);
  });

  it("returns null result when user has not liked the blog", async () => {
    const { token: authorToken } = await seedUser("ilbauthor@example.com");
    const { token: viewerToken } = await seedUser("ilbviewer@example.com");
    const blog = await seedBlog(authorToken);

    const res = await request(app)
      .post("/isliked-by-user")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ _id: blog._id });
    expect(res.status).toBe(200);
    expect(res.body.result).toBeFalsy();
  });
});
