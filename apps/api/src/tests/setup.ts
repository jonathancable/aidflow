// apps/api/src/tests/setup.ts
// Runs before every test file
/// <reference types="vitest/globals" />
import { prisma } from "@/lib/prisma";

afterAll(async () => {
  await prisma.$disconnect();
});
