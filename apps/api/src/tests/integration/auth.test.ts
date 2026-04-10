// apps/api/src/tests/integration/auth.test.ts
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "@/index";
import { prisma } from "@/lib/prisma";

describe("Auth — register and login flow", () => {
  const testEmail = `test-${Date.now()}@aidflow.test`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  it("registers a new donor account with status pending", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: testEmail,
      password: "TestPass123!",
      fullName: "Integration Test",
      role: "donor",
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.status).toBe("pending");
  });

  it("rejects login when account is pending", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: testEmail,
      password: "TestPass123!",
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_PENDING");
  });

  it("rejects login with wrong password", async () => {
    await prisma.user.update({
      where: { email: testEmail },
      data: { status: "active" },
    });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: testEmail,
      password: "WrongPassword!",
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("issues access token and sets cookie on valid login", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: testEmail,
      password: "TestPass123!",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
    const cookie = (res.headers["set-cookie"] as unknown as string[])[0];
    expect(cookie).toContain("refreshToken=");
    expect(cookie).toContain("HttpOnly");
  });

  it("returns user profile on GET /auth/me with valid token", async () => {
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: testEmail,
      password: "TestPass123!",
    });
    const { accessToken } = loginRes.body.data;
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(testEmail);
  });

  it("rejects /auth/me with no token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects duplicate registration", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: testEmail,
      password: "TestPass123!",
      fullName: "Duplicate",
      role: "donor",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});
