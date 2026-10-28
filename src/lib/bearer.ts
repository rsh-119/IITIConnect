import { timingSafeEqual } from "node:crypto";

// Constant-time check of an `Authorization: Bearer <secret>` header.
export function matchesBearer(provided: string | null, secret: string) {
  const supplied = provided?.startsWith("Bearer ") ? provided.slice(7) : "";
  const left = Buffer.from(supplied);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}
