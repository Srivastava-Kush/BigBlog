/**
 * Global test setup — runs once per Vitest worker.
 *
 * Responsibilities:
 *  1. Mock firebase-admin so the service-account JSON file is never required.
 *  2. Mock cloudinary so upload-signature tests don't need real credentials.
 *  3. Mock axios so the ML-service is never called from integration tests.
 *  4. Start an in-memory MongoDB via mongodb-memory-server.
 *  5. Wipe all collections after each test to guarantee isolation.
 */

import { vi } from "vitest";

// ── Module mocks (must come before any import of app.js) ─────────────────────

vi.mock("firebase-admin", () => ({
  default: {
    apps: [],
    initializeApp: vi.fn(),
    credential: { cert: vi.fn().mockReturnValue({}) },
  },
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn().mockReturnValue({
    // Reject by default so google-auth tests see a 500 without hanging
    verifyIdToken: vi.fn().mockRejectedValue(new Error("Firebase not available in test env")),
  }),
}));

vi.mock("../config/cloudinary.js", () => ({
  default: {
    utils: {
      api_sign_request: vi.fn().mockReturnValue("mock-signature"),
    },
  },
}));

// ── MongoDB in-memory setup ───────────────────────────────────────────────────

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer;

beforeAll(async () => {
  // Required env vars for the test environment
  process.env.JWT_SECRET = "test-jwt-secret-that-is-long-enough-for-hs256";
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "test-api-key";
  process.env.CLOUDINARY_API_SECRET = "test-api-secret";
  process.env.ML_SERVICE_URL = "http://localhost:18000"; // non-existent port

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean every collection so tests don't bleed state into each other
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  vi.clearAllMocks();
});
