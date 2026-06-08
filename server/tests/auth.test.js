/**
 * Auth route tests — /signup, /signin, /google-auth, verifyJWT middleware.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// firebase-admin and cloudinary are mocked in setup.js
import app from "../app.js";
import User from "../Schema/User.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const validUser = {
  fullname: "Test User",
  email: "test@example.com",
  password: "Test1234",
};

const makeToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET);

// ── /signup ───────────────────────────────────────────────────────────────────

describe("POST /signup", () => {
  it("creates a user and returns access_token on valid input", async () => {
    const res = await request(app).post("/signup").send(validUser);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("access_token");
    expect(res.body).toHaveProperty("username");
    expect(res.body).toHaveProperty("fullname", validUser.fullname.toLowerCase());
  });

  it("returns 403 when fullname is fewer than 3 chars", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ ...validUser, fullname: "Ab" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/3 chars/i);
  });

  it("returns 403 when email is empty", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ ...validUser, email: "" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/email/i);
  });

  it("returns 403 for an invalid email format", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ ...validUser, email: "not-an-email" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it("returns 403 for a weak password (no uppercase)", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ ...validUser, password: "password1" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/invalid password/i);
  });

  it("returns 403 for a weak password (no digit)", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ ...validUser, password: "Password" });
    expect(res.status).toBe(403);
  });

  it("returns 500 with duplicate-email message on second signup with same email", async () => {
    await request(app).post("/signup").send(validUser);
    const res = await request(app).post("/signup").send(validUser);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// ── /signin ───────────────────────────────────────────────────────────────────

describe("POST /signin", () => {
  beforeEach(async () => {
    // Pre-create a user for sign-in tests
    await request(app).post("/signup").send(validUser);
  });

  it("returns access_token on correct credentials", async () => {
    const res = await request(app)
      .post("/signin")
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("access_token");
  });

  it("returns 403 when email is not found", async () => {
    const res = await request(app)
      .post("/signin")
      .send({ email: "nobody@nowhere.com", password: validUser.password });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/email not found/i);
  });

  it("returns 403 when password is incorrect", async () => {
    const res = await request(app)
      .post("/signin")
      .send({ email: validUser.email, password: "Wrong1234" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/incorrect password/i);
  });

  it("returns 403 when account uses Google auth (no local password)", async () => {
    // Create a google-auth user directly
    const hash = await bcrypt.hash("irrelevant", 10);
    await User.create({
      personal_info: {
        fullname: "Google User",
        email: "googleuser@example.com",
        password: hash,
        username: "googleuser",
      },
      google_auth: true,
    });
    const res = await request(app)
      .post("/signin")
      .send({ email: "googleuser@example.com", password: "anything" });
    expect(res.status).toBe(403);
  });
});

// ── verifyJWT middleware ──────────────────────────────────────────────────────

describe("verifyJWT middleware", () => {
  it("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).get("/new-notification");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no access token/i);
  });

  it("returns 403 when the token is malformed", async () => {
    const res = await request(app)
      .get("/new-notification")
      .set("Authorization", "Bearer this.is.garbage");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 403 when the token was signed with a different secret", async () => {
    const token = jwt.sign({ id: "someId" }, "wrong-secret");
    const res = await request(app)
      .get("/new-notification")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("passes through to the handler when token is valid", async () => {
    // Sign up to get a real user _id in the DB
    const signupRes = await request(app).post("/signup").send(validUser);
    const token = signupRes.body.access_token;

    const res = await request(app)
      .get("/new-notification")
      .set("Authorization", `Bearer ${token}`);
    // 200 means middleware passed — no unseen notifications yet
    expect(res.status).toBe(200);
  });
});

// ── /google-auth (mocked Firebase) ───────────────────────────────────────────

describe("POST /google-auth", () => {
  it("returns 500 when Firebase verifyIdToken rejects (service unavailable in test)", async () => {
    // In test env Firebase is mocked but not configured to return a valid token
    const res = await request(app)
      .post("/google-auth")
      .send({ access_token: "fake-google-token" });
    // The mock getAuth().verifyIdToken rejects by default → 500
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/google/i);
  });
});
