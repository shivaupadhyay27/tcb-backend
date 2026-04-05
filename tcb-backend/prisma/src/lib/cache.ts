// ─────────────────────────────────────────────
// Redis Interface Abstraction — Phase 2 Ready
// Currently uses in-memory Map; swap to Redis later
// ─────────────────────────────────────────────

export interface CacheProvider {
  get<T = string>(key: string): Promise<T | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
  has(key: string): Promise<boolean>;
}

// ── In-memory implementation (Phase 1) ───────

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

class MemoryCacheProvider implements CacheProvider {
  private store = new Map<string, MemoryEntry>();

  async get<T = string>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as unknown as T;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async flush(): Promise<void> {
    this.store.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }
}

// ── Redis implementation stub (Phase 2) ──────
// Uncomment and configure when Redis is available
//
// import { createClient, RedisClientType } from 'redis';
//
// class RedisCacheProvider implements CacheProvider {
//   private client: RedisClientType;
//
//   constructor(url: string) {
//     this.client = createClient({ url });
//     this.client.connect().catch(console.error);
//   }
//
//   async get<T = string>(key: string): Promise<T | null> {
//     const value = await this.client.get(key);
//     if (!value) return null;
//     try { return JSON.parse(value) as T; }
//     catch { return value as unknown as T; }
//   }
//
//   async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
//     if (ttlSeconds) {
//       await this.client.setEx(key, ttlSeconds, value);
//     } else {
//       await this.client.set(key, value);
//     }
//   }
//
//   async del(key: string): Promise<void> { await this.client.del(key); }
//   async flush(): Promise<void> { await this.client.flushDb(); }
//   async has(key: string): Promise<boolean> { return (await this.client.exists(key)) === 1; }
// }

// ── Factory ──────────────────────────────────

function createCacheProvider(): CacheProvider {
  // Phase 2: swap to Redis
  // const redisUrl = process.env.REDIS_URL;
  // if (redisUrl) return new RedisCacheProvider(redisUrl);

  return new MemoryCacheProvider();
}

export const cache = createCacheProvider();

// ── Cache key builders ───────────────────────

export const CacheKeys = {
  post: (slug: string) => `post:${slug}`,
  postsList: (page: number, limit: number) => `posts:list:${page}:${limit}`,
  categoryPosts: (slug: string, page: number) => `category:${slug}:posts:${page}`,
  authorPosts: (slug: string, page: number) => `author:${slug}:posts:${page}`,
  sitemap: () => 'sitemap:xml',
} as const;

export const CacheTTL = {
  POST: 300, // 5 min
  POSTS_LIST: 120, // 2 min
  SITEMAP: 3600, // 1 hour
} as const;
