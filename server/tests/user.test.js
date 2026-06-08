/**
 * User route tests — get-profile, update-profile, change-password,
 * update-profile-img, search-users.
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import app from "../app.js";
import User from "../Schema/User.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET);

const seedUser = async (
  email = "user@example.com",
  fullname = "Profile User",
) => {
  const res = await request(app).post("/signup").send({
    fullname,
    email,
    password: "Profile1234",
  });
  const dbUser = await User.findOne({ "personal_info.email": email });
  return { token: res.body.access_token, userId: dbUser._id.toString(), dbUser };
};

// ── POST /get-profile ─────────────────────────────────────────────────────────

describe("POST /get-profile", () => {
  it("returns user profile for a valid username", async () => {
    const { dbUser } = await seedUser("getprofile@example.com");
    const username = dbUser.personal_info.username;

    const res = await request(app)
      .post("/get-profile")
      .send({ username });
    expect(res.status).toBe(200);
    expect(res.body.personal_info.username).toBe(username);
  });

  it("does not expose the hashed password", async () => {
    const { dbUser } = await seedUser("nopwd@example.com");
    const res = await request(app)
      .post("/get-profile")
      .send({ username: dbUser.personal_info.username });
    expect(res.status).toBe(200);
    expect(res.body.personal_info?.password).toBeUndefined();
  });

  it("returns null for an unknown username", async () => {
    const res = await request(app)
      .post("/get-profile")
      .send({ username: "definitely_not_a_real_user_xyz" });
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});

// ── POST /search-users ────────────────────────────────────────────────────────

describe("POST /search-users", () => {
  it("returns users matching the query string", async () => {
    await seedUser("alice@example.com", "Alice Wonder");

    const res = await request(app)
      .post("/search-users")
      .send({ query: "alice" });
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(
      res.body.users[0].personal_info.username.toLowerCase(),
    ).toContain("alice");
  });

  it("returns empty array when no user matches", async () => {
    const res = await request(app)
      .post("/search-users")
      .send({ query: "zzznomatch_xyz" });
    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });
});

// ── POST /update-profile ──────────────────────────────────────────────────────

describe("POST /update-profile", () => {
  const emptySocials = {
    youtube: "",
    instagram: "",
    facebook: "",
    twitter: "",
    github: "",
    website: "",
  };

  it("requires authentication", async () => {
    const res = await request(app).post("/update-profile").send({
      username: "newname",
      bio: "",
      social_links: emptySocials,
    });
    expect(res.status).toBe(401);
  });

  it("updates username and bio successfully", async () => {
    const { token } = await seedUser("updateprofile@example.com");
    const newUsername = "updated_qa_user";

    const res = await request(app)
      .post("/update-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: newUsername, bio: "QA tester bio", social_links: emptySocials });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(newUsername);
  });

  it("returns 403 when username is shorter than 3 chars", async () => {
    const { token } = await seedUser("shortuser@example.com");
    const res = await request(app)
      .post("/update-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "ab", bio: "", social_links: emptySocials });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/3 characters/i);
  });

  it("returns 403 when bio exceeds 200 chars", async () => {
    const { token } = await seedUser("longbio@example.com");
    const res = await request(app)
      .post("/update-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "validuser", bio: "x".repeat(201), social_links: emptySocials });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/bio/i);
  });

  it("returns 500 when a social link is not a valid URL", async () => {
    const { token } = await seedUser("badurl@example.com");
    const res = await request(app)
      .post("/update-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        username: "validuser2",
        bio: "",
        social_links: { ...emptySocials, github: "not-a-url" },
      });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/http/i);
  });
});

// ── POST /update-profile-img ──────────────────────────────────────────────────

describe("POST /update-profile-img", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/update-profile-img")
      .send({ url: "https://example.com/avatar.png" });
    expect(res.status).toBe(401);
  });

  it("updates profile_img and returns the new URL", async () => {
    const { token } = await seedUser("imgupdate@example.com");
    const newUrl = "https://example.com/new-avatar.png";

    const res = await request(app)
      .post("/update-profile-img")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: newUrl });
    expect(res.status).toBe(200);
    expect(res.body.profile_img).toBe(newUrl);
  });
});

// ── POST /change-password ─────────────────────────────────────────────────────

describe("POST /change-password", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/change-password").send({
      currentPassword: "Profile1234",
      newPassword: "NewPass5678",
    });
    expect(res.status).toBe(401);
  });

  it("changes the password when current password is correct", async () => {
    const { token } = await seedUser("changepwd@example.com");

    const res = await request(app)
      .post("/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "Profile1234", newPassword: "NewPass5678" });
    expect(res.status).toBe(200);
    expect(res.body.status).toMatch(/password changed/i);
  });

  it("returns 403 when current password is wrong", async () => {
    const { token } = await seedUser("wrongpwd@example.com");

    const res = await request(app)
      .post("/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "Wrong1234", newPassword: "NewPass5678" });
    expect(res.status).toBe(403);
  });

  it("returns 403 for invalid password format", async () => {
    const { token } = await seedUser("badformat@example.com");

    const res = await request(app)
      .post("/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "short", newPassword: "NewPass5678" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/password must be/i);
  });

  it("returns 403 for a Google-auth user (no local password)", async () => {
    // Insert Google-auth user directly
    const googleUser = await User.create({
      personal_info: {
        fullname: "Google Changer",
        email: "googlechanger@example.com",
        username: "googlechanger",
      },
      google_auth: true,
    });
    const token = makeToken(googleUser._id.toString());

    const res = await request(app)
      .post("/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "Profile1234", newPassword: "NewPass5678" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot change password/i);
  });
});
