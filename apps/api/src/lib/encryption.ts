// apps/api/src/lib/encryption.ts
import crypto from "crypto";
import { env } from "@config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // bytes

// ENCRYPTION_KEY in env is 64 hex chars = 32 bytes
const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext — all hex-encoded
  return [
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !dataHex)
    throw new Error("Invalid ciphertext format");

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

// Null-safe helpers — undefined input returns null (matches Prisma nullable field type)
export const encryptField = (v?: string): string | null =>
  v !== undefined ? encrypt(v) : null;

export const decryptField = (v?: string | null): string | undefined =>
  v ? decrypt(v) : undefined;
