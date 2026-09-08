import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_PREFIX = '@photo_cache_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in ms

/**
 * Retrieves a signed photo URL from local 24h cache or generates a new one.
 * Satisfies 24-Hour Photo URL Caching requirement to prevent flickering and re-downloads.
 */
export async function getCachedSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;

  const now = Date.now();
  // 1. Check in-memory cache first
  const mem = memoryCache.get(path);
  if (mem && mem.expiresAt > now + 300000) {
    return mem.url;
  }

  // 2. Check AsyncStorage
  const storageKey = `${CACHE_PREFIX}${path}`;
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const parsed: CacheEntry = JSON.parse(raw);
      if (parsed && parsed.url && parsed.expiresAt > now + 300000) {
        memoryCache.set(path, parsed);
        return parsed.url;
      }
    }
  } catch (e) {
    // Ignore AsyncStorage read error
  }

  // 3. Fallback to Supabase Storage signed URL creation (24h validity)
  try {
    const { data, error } = await supabase
      .storage
      .from('profile-images')
      .createSignedUrl(path, 86400);

    if (data?.signedUrl) {
      const entry: CacheEntry = {
        url: data.signedUrl,
        expiresAt: now + CACHE_DURATION_MS,
      };
      memoryCache.set(path, entry);
      AsyncStorage.setItem(storageKey, JSON.stringify(entry)).catch(() => {});
      return data.signedUrl;
    }
  } catch (err) {
    console.error('Error generating cached signed URL:', err);
  }

  return null;
}

/**
 * Batch retrieves 24h cached signed URLs for an array of storage paths.
 */
export async function getCachedSignedUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const validPaths = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));

  await Promise.all(
    validPaths.map(async (path) => {
      const url = await getCachedSignedUrl(path);
      if (url) {
        result[path] = url;
      }
    })
  );

  return result;
}
