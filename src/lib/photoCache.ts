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
 * Optimizes network requests by checking memory and AsyncStorage caches first,
 * and fetching all uncached URLs in a single Supabase batch request to prevent OkHttp queue saturation.
 */
export async function getCachedSignedUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const validPaths = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (validPaths.length === 0) return result;

  const now = Date.now();
  const missingPaths: string[] = [];

  // 1. Check in-memory cache first
  for (const path of validPaths) {
    const mem = memoryCache.get(path);
    if (mem && mem.expiresAt > now + 300000) {
      result[path] = mem.url;
    } else {
      missingPaths.push(path);
    }
  }

  if (missingPaths.length === 0) {
    return result;
  }

  // 2. Batch check AsyncStorage for missing paths
  const keys = missingPaths.map((p) => `${CACHE_PREFIX}${p}`);
  const stillMissing: string[] = [];
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    for (let i = 0; i < pairs.length; i++) {
      const path = missingPaths[i];
      const raw = pairs[i][1];
      let foundInStorage = false;
      if (raw) {
        try {
          const parsed: CacheEntry = JSON.parse(raw);
          if (parsed && parsed.url && parsed.expiresAt > now + 300000) {
            memoryCache.set(path, parsed);
            result[path] = parsed.url;
            foundInStorage = true;
          }
        } catch (_) {}
      }
      if (!foundInStorage) {
        stillMissing.push(path);
      }
    }
  } catch (e) {
    stillMissing.push(...missingPaths);
  }

  if (stillMissing.length === 0) {
    return result;
  }

  // 3. Batch request all remaining signed URLs from Supabase in ONE single network request
  try {
    const { data: batchData, error } = await supabase
      .storage
      .from('profile-images')
      .createSignedUrls(stillMissing, 86400);

    if (!error && batchData) {
      const storagePairs: [string, string][] = [];
      batchData.forEach((item: any, idx: number) => {
        const path = item?.path || stillMissing[idx];
        const signedUrl = item?.signedUrl;
        if (path && signedUrl) {
          const entry: CacheEntry = {
            url: signedUrl,
            expiresAt: now + CACHE_DURATION_MS,
          };
          memoryCache.set(path, entry);
          result[path] = signedUrl;
          storagePairs.push([`${CACHE_PREFIX}${path}`, JSON.stringify(entry)]);
        }
      });
      if (storagePairs.length > 0) {
        AsyncStorage.multiSet(storagePairs).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error generating batch signed URLs:', err);
  }

  return result;
}
