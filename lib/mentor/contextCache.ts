import { getMentorContext, type MentorContext } from "./context";

const TTL_MS = 60_000; // 60 seconds per-instance cache

interface CacheEntry {
  data: MentorContext;
  expires: number;
}

// Module-level cache — lives for the lifetime of a warm serverless instance.
// Prevents re-querying the DB on every message in a burst conversation.
const cache = new Map<string, CacheEntry>();

export async function getCachedMentorContext(userId: string): Promise<MentorContext> {
  const hit = cache.get(userId);
  if (hit && hit.expires > Date.now()) {
    return hit.data;
  }

  const fresh = await getMentorContext(userId);
  cache.set(userId, { data: fresh, expires: Date.now() + TTL_MS });
  return fresh;
}

/** Call this after a significant business event (publish, new order) to force a fresh fetch. */
export function invalidateMentorContext(userId: string): void {
  cache.delete(userId);
}
